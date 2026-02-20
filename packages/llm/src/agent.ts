import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { Runnable } from '@langchain/core/runnables';
import type { StructuredToolInterface } from '@langchain/core/tools';
import type { ChainConfig, ObiPolkadotContext } from '@obidot-kit/core';
import type { ObiAgentApiConfig } from './obi-agent-api.js';
import { ObiAgentApi } from './obi-agent-api.js';
import { VaultDepositTool } from './tools/vault-deposit.js';
import { VaultWithdrawTool } from './tools/vault-withdraw.js';

/**
 * Configuration for creating an Obidot agent.
 */
export interface AgentConfig {
  /** The LLM model to use for the agent. */
  model: BaseChatModel;

  /**
   * Chain configuration for on-chain interactions.
   * Used when no `polkadotContext` is provided (offline / stub mode).
   */
  chainConfig?: ChainConfig;

  /**
   * Fully initialised Polkadot context (API client + signer + address).
   * When provided, the agent is wired for real on-chain interactions
   * using the Polkadot Agent Kit infrastructure.
   */
  polkadotContext?: ObiPolkadotContext;

  /**
   * Optional ObiAgentApi configuration. When `polkadotContext` is
   * provided, this is built automatically. Supply this if you want
   * full control over vault registration and PAK tool selection.
   */
  agentApiConfig?: ObiAgentApiConfig;

  /** Optional additional tools to include alongside the default vault tools. */
  additionalTools?: StructuredToolInterface[];

  /** Optional system prompt override. */
  systemPrompt?: string;
}

/**
 * Result of agent creation containing the bound model and tools.
 */
export interface AgentInstance {
  /** The LLM model (possibly bound with tools). */
  model: Runnable;

  /** All tools available to the agent. */
  tools: StructuredToolInterface[];

  /**
   * The chain configuration used by the agent.
   * May be `undefined` when only a `polkadotContext` was supplied.
   */
  chainConfig: ChainConfig | undefined;

  /**
   * The ObiAgentApi instance, if the agent was created with a
   * `polkadotContext`. Gives access to PAK tools, vault tools,
   * and the underlying context.
   */
  agentApi?: ObiAgentApi;
}

/**
 * Creates a configured LangChain agent with Obidot Kit tools.
 *
 * Supports two modes:
 *
 * 1. **Offline / stub mode** — pass `chainConfig` only. The agent gets
 *    stub vault tools that return "pending" results. Good for testing and
 *    prompt engineering without a live chain connection.
 *
 * 2. **On-chain mode** — pass `polkadotContext` (and optionally vaults via
 *    `agentApiConfig`). The agent gets the full suite of PAK tools (balance,
 *    transfer, XCM, staking, identity, swap, etc.) **plus** obi-kit vault
 *    tools, all wired to the live `PolkadotApi` and `PolkadotSigner`.
 *
 * @param config - The agent configuration.
 * @returns An agent instance ready to process user requests.
 *
 * @example
 * ```ts
 * // Offline mode
 * import { createAgent } from '@obidot-kit/llm';
 * import { ChatOpenAI } from '@langchain/openai';
 *
 * const agent = createAgent({
 *   model: new ChatOpenAI({ model: 'gpt-4' }),
 *   chainConfig: { endpoint: 'wss://rpc.polkadot.io', chainId: 'polkadot' },
 * });
 * ```
 *
 * @example
 * ```ts
 * // On-chain mode with PAK integration
 * import { createAgent } from '@obidot-kit/llm';
 * import { createPolkadotContext } from '@obidot-kit/core';
 *
 * const ctx = await createPolkadotContext({ signer, address, allowedChains: ['polkadot'] });
 * const agent = createAgent({
 *   model,
 *   polkadotContext: ctx,
 *   agentApiConfig: {
 *     polkadotContext: ctx,
 *     vaults: [{ id: 'v1', name: 'DOT Vault', address: '5F...', chain: chainCfg, asset: 'DOT' }],
 *   },
 * });
 * ```
 */
export function createAgent(config: AgentConfig): AgentInstance {
  const { model, chainConfig, polkadotContext, agentApiConfig, additionalTools = [] } = config;

  let agentApi: ObiAgentApi | undefined;
  const tools: StructuredToolInterface[] = [];

  if (polkadotContext) {
    // ── On-chain mode ─────────────────────────────────────────────────
    // Build the ObiAgentApi which gives us vault tools immediately.
    // PAK tools are loaded lazily via agentApi.init() — the consumer
    // should call `await agentInstance.agentApi.init()` before using
    // PAK-specific tools (balance, transfer, XCM, staking, etc.).
    const apiConfig: ObiAgentApiConfig = agentApiConfig ?? {
      polkadotContext,
    };
    agentApi = new ObiAgentApi(apiConfig);

    // Collect all currently available tools (vault tools + any PAK
    // tools if init() has already been called)
    tools.push(...agentApi.getAllTools());
  } else if (chainConfig) {
    // ── Offline / stub mode ───────────────────────────────────────────
    // Provide stub vault tools that don't need a live chain connection
    tools.push(
      new VaultDepositTool({
        chainConfig,
      }) as unknown as StructuredToolInterface,
      new VaultWithdrawTool({
        chainConfig,
      }) as unknown as StructuredToolInterface,
    );
  }

  // Append any additional user-supplied tools
  tools.push(...additionalTools);

  // Bind tools to the model if it supports tool binding
  let boundModel: Runnable = model;
  if (
    tools.length > 0 &&
    'bindTools' in model &&
    typeof (model as unknown as { bindTools: unknown }).bindTools === 'function'
  ) {
    boundModel = (model as unknown as { bindTools(t: StructuredToolInterface[]): Runnable }).bindTools(tools);
  }

  return {
    model: boundModel,
    tools,
    chainConfig,
    agentApi,
  };
}

/**
 * Creates an agent with a custom set of tools, bypassing the default tool set.
 *
 * This is useful when you want full control over which tools the agent
 * receives — for example, combining a hand-picked subset of PAK tools
 * with custom protocol-specific tools.
 *
 * @param model - The LLM model to use.
 * @param tools - The exact set of tools to bind.
 * @param chainConfig - Optional chain configuration.
 * @returns An agent instance with only the specified tools.
 */
export function createAgentWithTools(
  model: BaseChatModel,
  tools: StructuredToolInterface[],
  chainConfig?: ChainConfig,
): AgentInstance {
  let boundModel: Runnable = model;
  if (
    tools.length > 0 &&
    'bindTools' in model &&
    typeof (model as unknown as { bindTools: unknown }).bindTools === 'function'
  ) {
    boundModel = (model as unknown as { bindTools(t: StructuredToolInterface[]): Runnable }).bindTools(tools);
  }

  return {
    model: boundModel,
    tools,
    chainConfig,
  };
}
