/**
 * Telegram Bot Example
 *
 * Demonstrates how to run an AI-powered DeFi vault assistant on Telegram
 * using Obidot Kit + LangChain + grammy.
 *
 * The bot accepts natural language messages and uses a LangChain agent
 * with obi-kit tools to interact with ERC-4626 vaults on Polkadot Hub EVM.
 *
 * Supports two modes:
 *   1. **EVM mode** — real on-chain interactions via viem (when PRIVATE_KEY is set)
 *   2. **Offline mode** — stub results for local development
 *
 * Usage:
 *   pnpm tsx src/index.ts
 *
 * Environment variables:
 *   TELEGRAM_BOT_TOKEN  – From @BotFather
 *   OPENAI_API_KEY      – Your OpenAI API key
 *   OPENAI_MODEL        – Model name (default: gpt-4o-mini)
 *   HUB_RPC_URL         – Polkadot Hub EVM RPC (default: testnet)
 *   VAULT_ADDRESS       – ObidotVault contract address
 *   ASSET_ADDRESS       – ERC-20 asset address
 *   PRIVATE_KEY         – Hex-encoded private key for EVM signing (optional)
 */

import { type AIMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import type { ChainConfig, EvmVaultConfig, ObiEvmContext, VaultConfig } from '@obidot-kit/core';
import { createEvmContext, POLKADOT_HUB_TESTNET_RPC, polkadotHubTestnet } from '@obidot-kit/core';
import { ObiKit } from '@obidot-kit/sdk';
import { Bot } from 'grammy';

// ── Configuration ─────────────────────────────────────────────────────

const OPENAI_MODEL = process.env['OPENAI_MODEL'] ?? 'gpt-4o-mini';

const HUB_RPC_URL = process.env['HUB_RPC_URL'] ?? POLKADOT_HUB_TESTNET_RPC;
const VAULT_ADDRESS = process.env['VAULT_ADDRESS'] ?? '0x0000000000000000000000000000000000000001';
const ASSET_ADDRESS = process.env['ASSET_ADDRESS'] ?? '0x0000000000000000000000000000000000000002';
const PRIVATE_KEY = process.env['PRIVATE_KEY'];

const MAX_ITERATIONS = 5;

function requireEnv(name: string, hint?: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`${name} is required.${hint ? ` ${hint}` : ''}`);
    process.exit(1);
  }
  return value;
}

const telegramToken = requireEnv('TELEGRAM_BOT_TOKEN', 'Get one from @BotFather on Telegram.');
const openaiKey = requireEnv('OPENAI_API_KEY');

// ── Chain & Vault Config ──────────────────────────────────────────────

const chainConfig: ChainConfig = {
  endpoint: HUB_RPC_URL,
  name: 'Polkadot Hub Testnet',
  chainId: String(polkadotHubTestnet.id),
};

const vaultConfig: VaultConfig = {
  id: 'obidot-vault',
  name: 'Obidot ERC-4626 Vault',
  address: VAULT_ADDRESS,
  chain: chainConfig,
  asset: 'WDOT',
  decimals: 18,
};

const evmVaultConfig: EvmVaultConfig = {
  vaultAddress: VAULT_ADDRESS as `0x${string}`,
  assetAddress: ASSET_ADDRESS as `0x${string}`,
  rpcUrl: HUB_RPC_URL,
  chainId: polkadotHubTestnet.id,
};

// ── System Prompt ─────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an Obidot DeFi vault assistant running on Polkadot Hub EVM.
You help users interact with ERC-4626 vaults via Telegram.

Your capabilities:
- Deposit assets into vaults (vault_deposit)
- Withdraw assets from vaults (vault_withdraw)
- Manage withdrawal queues (withdrawal_queue)
- Check vault performance metrics (vault_performance)
- Check oracle status and circuit breakers (oracle_check)
- Fetch Bifrost yield products (fetch_bifrost_yields)
- Execute Bifrost strategies (execute_bifrost_strategy)
- Query cross-chain vault state (fetch_cross_chain_state)
- Rebalance across chains (execute_cross_chain_rebalance)
- Execute batch strategies (execute_batch_strategies)

Rules:
- Always confirm amounts and addresses before executing write operations.
- Format responses concisely for mobile chat.
- Use tool results to provide accurate, up-to-date information.
- If running in offline/stub mode, inform the user that results are simulated.`;

// ── ObiKit Setup ──────────────────────────────────────────────────────

async function initializeKit(): Promise<ObiKit> {
  const kit = new ObiKit({ chainConfig });
  kit.registerVault(vaultConfig);

  if (PRIVATE_KEY) {
    const { privateKeyToAccount } = await import('viem/accounts');
    const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
    const evmContext: ObiEvmContext = createEvmContext({
      rpcUrl: HUB_RPC_URL,
      chain: polkadotHubTestnet,
      chainName: 'Polkadot Hub Testnet',
      account,
    });
    kit.setEvmVault(evmContext, evmVaultConfig);
    console.log(`  EVM mode enabled. Signer: ${account.address}`);
  } else {
    console.log('  Offline/stub mode (set PRIVATE_KEY for EVM mode)');
  }

  return kit;
}

// ── Agent Runner ──────────────────────────────────────────────────────

interface AgentRunner {
  run: (userMessage: string) => Promise<string>;
}

function createAgentRunner(kit: ObiKit): AgentRunner {
  const tools = kit.getTools();
  const model = new ChatOpenAI({
    model: OPENAI_MODEL,
    apiKey: openaiKey,
    temperature: 0,
  });

  const boundModel = tools.length > 0 ? model.bindTools(tools) : model;

  const toolMap = new Map<string, (typeof tools)[number]>();
  for (const tool of tools) {
    toolMap.set(tool.name, tool);
  }

  return {
    async run(userMessage: string): Promise<string> {
      const messages: (SystemMessage | HumanMessage | AIMessage | ToolMessage)[] = [
        new SystemMessage(SYSTEM_PROMPT),
        new HumanMessage(userMessage),
      ];

      for (let i = 0; i < MAX_ITERATIONS; i++) {
        const response = await boundModel.invoke(messages);
        messages.push(response as AIMessage);

        const aiMessage = response as AIMessage;
        const toolCalls = aiMessage.tool_calls;

        if (!toolCalls || toolCalls.length === 0) {
          // No tool calls — this is the final answer
          const content = aiMessage.content;
          if (typeof content === 'string') {
            return content;
          }
          // Handle array content (multi-part messages)
          if (Array.isArray(content)) {
            return content
              .map((part) => {
                if (typeof part === 'string') return part;
                if (typeof part === 'object' && 'text' in part) return String(part.text);
                return '';
              })
              .join('');
          }
          return String(content);
        }

        // Execute each tool call
        for (const toolCall of toolCalls) {
          const tool = toolMap.get(toolCall.name);
          if (!tool) {
            messages.push(
              new ToolMessage({
                content: JSON.stringify({ success: false, error: `Unknown tool: ${toolCall.name}` }),
                tool_call_id: toolCall.id ?? '',
              }),
            );
            continue;
          }

          try {
            const result = await tool.invoke(JSON.stringify(toolCall.args));
            messages.push(
              new ToolMessage({
                content: typeof result === 'string' ? result : JSON.stringify(result),
                tool_call_id: toolCall.id ?? '',
              }),
            );
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            messages.push(
              new ToolMessage({
                content: JSON.stringify({ success: false, error: errorMessage }),
                tool_call_id: toolCall.id ?? '',
              }),
            );
          }
        }
      }

      return 'I was unable to complete your request within the allowed steps. Please try a simpler query.';
    },
  };
}

// ── Telegram Bot ──────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log(' Obidot Kit — Telegram Bot');
  console.log('='.repeat(60));

  // 1. Initialize ObiKit
  console.log('[1] Initializing ObiKit...');
  const kit = await initializeKit();
  const info = kit.inspect();
  console.log(`  Mode  : ${String(info['mode'])}`);
  console.log(`  Tools : ${String(info['totalToolCount'])}`);

  // 2. Create agent runner
  console.log('[2] Creating LangChain agent...');
  const agent = createAgentRunner(kit);
  console.log(`  Model : ${OPENAI_MODEL}`);

  // 3. Set up Grammy bot
  console.log('[3] Starting Telegram bot...');
  const bot = new Bot(telegramToken);

  // /start command
  bot.command('start', async (ctx) => {
    const mode = PRIVATE_KEY ? 'EVM (live transactions)' : 'Offline (simulated)';
    await ctx.reply(
      `Welcome to the Obidot DeFi Vault Bot!\n\n` +
        `Mode: ${mode}\n` +
        `Chain: ${chainConfig.name}\n` +
        `Vault: ${VAULT_ADDRESS}\n\n` +
        `Send me a message to interact with the vault. Examples:\n` +
        `- "What is the vault performance?"\n` +
        `- "Deposit 100 WDOT into the vault"\n` +
        `- "Check oracle status"\n` +
        `- "Show Bifrost yield products"\n\n` +
        `Type /help for more info.`,
    );
  });

  // /help command
  bot.command('help', async (ctx) => {
    const tools = kit.getTools();
    const toolList = tools.map((t) => `- ${t.name}`).join('\n');
    await ctx.reply(
      `Obidot Vault Bot — Help\n\n` +
        `Available tools:\n${toolList}\n\n` +
        `Example prompts:\n` +
        `- "Deposit 50 WDOT"\n` +
        `- "Withdraw 25 WDOT"\n` +
        `- "Check withdrawal queue status"\n` +
        `- "What are the current Bifrost yields?"\n` +
        `- "Show vault performance metrics"\n` +
        `- "Is the oracle feed fresh?"\n\n` +
        `The bot uses an AI agent to interpret your messages and call the appropriate tools.`,
    );
  });

  // /info command
  bot.command('info', async (ctx) => {
    const state = kit.inspect();
    await ctx.reply(
      `SDK State:\n` +
        `- Mode: ${String(state['mode'])}\n` +
        `- EVM vault: ${String(state['hasEvmVault'])}\n` +
        `- Vault address: ${String(state['evmVaultAddress'] ?? VAULT_ADDRESS)}\n` +
        `- Registered vaults: ${String(state['vaultCount'])}\n` +
        `- Satellites: ${String(state['satelliteCount'])}\n` +
        `- Total tools: ${String(state['totalToolCount'])}`,
    );
  });

  // Handle text messages
  bot.on('message:text', async (ctx) => {
    const userMessage = ctx.message.text;

    // Skip if it's a command (already handled above)
    if (userMessage.startsWith('/')) return;

    // Show typing indicator
    await ctx.replyWithChatAction('typing');

    try {
      const response = await agent.run(userMessage);

      // Telegram has a 4096-char message limit — split if needed
      if (response.length <= 4096) {
        await ctx.reply(response);
      } else {
        const chunks: string[] = [];
        let remaining = response;
        while (remaining.length > 0) {
          chunks.push(remaining.slice(0, 4096));
          remaining = remaining.slice(4096);
        }
        for (const chunk of chunks) {
          await ctx.reply(chunk);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Agent error:', errorMessage);
      await ctx.reply(`Sorry, something went wrong while processing your request. Please try again.`);
    }
  });

  // Error handler
  bot.catch((err) => {
    console.error('Bot error:', err.message);
  });

  // Start polling
  await bot.start({
    onStart: () => {
      console.log('  Telegram bot is running! Send a message to interact.');
      console.log('  Press Ctrl+C to stop.');
    },
  });
}

// ── Run ───────────────────────────────────────────────────────────────

main().catch((error: unknown) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
