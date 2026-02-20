import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { Runnable } from '@langchain/core/runnables';
import type { StructuredToolInterface } from '@langchain/core/tools';
import type { ChainConfig } from '@obidot-kit/core';

/**
 * Configuration for creating an Obidot agent.
 */
export interface AgentConfig {
  /** The LLM model to use for the agent. */
  model: BaseChatModel;
  /** The chain configuration for on-chain interactions. */
  chainConfig: ChainConfig;
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
  /** The chain configuration used by the agent. */
  chainConfig: ChainConfig;
}

/**
 * Creates a configured LangChain agent with Obidot Kit tools.
 *
 * @param config - The agent configuration.
 * @returns An agent instance ready to process user requests.
 *
 * @example
 * ```ts
 * import { createAgent } from '@obidot-kit/llm';
 * import { ChatOpenAI } from '@langchain/openai';
 *
 * const agent = createAgent({
 *   model: new ChatOpenAI({ model: 'gpt-4' }),
 *   chainConfig: { endpoint: 'wss://rpc.polkadot.io', chainId: 'polkadot' },
 * });
 * ```
 */
export function createAgent(config: AgentConfig): AgentInstance {
  const { model, chainConfig, additionalTools = [] } = config;

  // Collect all tools: built-in vault tools + any additional tools
  const tools: StructuredToolInterface[] = [...additionalTools];

  // Bind tools to the model if it supports tool binding and tools are present
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

/**
 * Creates an agent with a custom set of tools, bypassing the default tool set.
 *
 * @param model - The LLM model to use.
 * @param tools - The exact set of tools to bind.
 * @param chainConfig - The chain configuration.
 * @returns An agent instance with only the specified tools.
 */
export function createAgentWithTools(
  model: BaseChatModel,
  tools: StructuredToolInterface[],
  chainConfig: ChainConfig,
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
