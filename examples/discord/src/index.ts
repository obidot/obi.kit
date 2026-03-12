/**
 * Discord Bot Example
 *
 * Demonstrates how to run an AI-powered DeFi vault assistant on Discord
 * using Obidot Kit + LangChain + discord.js.
 *
 * The bot supports:
 *   - `/ask <message>` — Free-form natural language query to the agent
 *   - `/vault-info` — Show vault configuration and SDK mode
 *   - `/tools` — List all available obi-kit tools
 *   - `@mention` — Respond to direct mentions in channels
 *
 * Supports two modes:
 *   1. **EVM mode** — real on-chain interactions via viem (when PRIVATE_KEY is set)
 *   2. **Offline mode** — stub results for local development
 *
 * Usage:
 *   pnpm tsx src/index.ts
 *
 * Environment variables:
 *   DISCORD_BOT_TOKEN   – From Discord Developer Portal
 *   DISCORD_CLIENT_ID   – Application Client ID
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
import {
  Client,
  Events,
  GatewayIntentBits,
  type Interaction,
  type Message,
  REST,
  Routes,
  SlashCommandBuilder,
} from 'discord.js';

// ── Configuration ─────────────────────────────────────────────────────

const OPENAI_MODEL = process.env['OPENAI_MODEL'] ?? 'gpt-4o-mini';

const HUB_RPC_URL = process.env['HUB_RPC_URL'] ?? POLKADOT_HUB_TESTNET_RPC;
const VAULT_ADDRESS = process.env['VAULT_ADDRESS'] ?? '0x0000000000000000000000000000000000000001';
const ASSET_ADDRESS = process.env['ASSET_ADDRESS'] ?? '0x0000000000000000000000000000000000000002';
const PRIVATE_KEY = process.env['PRIVATE_KEY'];

const MAX_ITERATIONS = 5;
const DISCORD_MESSAGE_LIMIT = 2000;

function requireEnv(name: string, hint?: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`${name} is required.${hint ? ` ${hint}` : ''}`);
    process.exit(1);
  }
  return value;
}

const discordToken = requireEnv('DISCORD_BOT_TOKEN', 'Get one from the Discord Developer Portal.');
const discordClientId = requireEnv('DISCORD_CLIENT_ID', 'Get it from the Discord Developer Portal.');
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
You help users interact with ERC-4626 vaults via Discord.

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
- Format responses concisely. Use markdown where appropriate.
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
          const content = aiMessage.content;
          if (typeof content === 'string') {
            return content;
          }
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

// ── Slash Command Definitions ─────────────────────────────────────────

const askCommand = new SlashCommandBuilder()
  .setName('ask')
  .setDescription('Ask the Obidot vault agent a question or give it a task')
  .addStringOption((option) => option.setName('message').setDescription('Your message to the agent').setRequired(true));

const vaultInfoCommand = new SlashCommandBuilder()
  .setName('vault-info')
  .setDescription('Show vault configuration and SDK mode');

const toolsCommand = new SlashCommandBuilder().setName('tools').setDescription('List all available obi-kit tools');

const slashCommands = [askCommand, vaultInfoCommand, toolsCommand];

// ── Helpers ───────────────────────────────────────────────────────────

/**
 * Split a long message into chunks that fit within Discord's limit.
 */
function splitMessage(text: string): string[] {
  if (text.length <= DISCORD_MESSAGE_LIMIT) {
    return [text];
  }

  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    // Try to split at a newline boundary for readability
    let splitIndex = DISCORD_MESSAGE_LIMIT;
    if (remaining.length > DISCORD_MESSAGE_LIMIT) {
      const lastNewline = remaining.lastIndexOf('\n', DISCORD_MESSAGE_LIMIT);
      if (lastNewline > DISCORD_MESSAGE_LIMIT * 0.5) {
        splitIndex = lastNewline + 1;
      }
    }
    chunks.push(remaining.slice(0, splitIndex));
    remaining = remaining.slice(splitIndex);
  }
  return chunks;
}

// ── Register Slash Commands ───────────────────────────────────────────

async function registerCommands(): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(discordToken);

  const commandData = slashCommands.map((cmd) => cmd.toJSON());

  await rest.put(Routes.applicationCommands(discordClientId), { body: commandData });
  console.log(`  Registered ${commandData.length} slash command(s)`);
}

// ── Discord Bot ───────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log(' Obidot Kit — Discord Bot');
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

  // 3. Register slash commands
  console.log('[3] Registering slash commands...');
  await registerCommands();

  // 4. Set up Discord client
  console.log('[4] Starting Discord bot...');
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  });

  // Handle slash commands
  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'ask') {
      const userMessage = interaction.options.getString('message', true);

      // Defer reply — agent execution may take >3 seconds
      await interaction.deferReply();

      try {
        const response = await agent.run(userMessage);
        const chunks = splitMessage(response);

        await interaction.editReply(chunks[0] ?? 'No response generated.');
        for (let i = 1; i < chunks.length; i++) {
          const chunk = chunks[i];
          if (chunk) {
            await interaction.followUp(chunk);
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Agent error:', errorMessage);
        await interaction.editReply('Sorry, something went wrong while processing your request. Please try again.');
      }
    }

    if (commandName === 'vault-info') {
      const state = kit.inspect();
      const mode = String(state['mode']);
      const hasEvmVault = String(state['hasEvmVault']);
      const vaultAddr = String(state['evmVaultAddress'] ?? VAULT_ADDRESS);
      const vaultCount = String(state['vaultCount']);
      const satelliteCount = String(state['satelliteCount']);
      const toolCount = String(state['totalToolCount']);

      await interaction.reply(
        `**Obidot Kit — Vault Info**\n` +
          `\`\`\`\n` +
          `Mode            : ${mode}\n` +
          `EVM vault       : ${hasEvmVault}\n` +
          `Vault address   : ${vaultAddr}\n` +
          `Chain           : ${chainConfig.name}\n` +
          `Registered vaults: ${vaultCount}\n` +
          `Satellites      : ${satelliteCount}\n` +
          `Total tools     : ${toolCount}\n` +
          `\`\`\``,
      );
    }

    if (commandName === 'tools') {
      const tools = kit.getTools();
      const toolList = tools.map((t) => `- \`${t.name}\` — ${t.description.slice(0, 80)}`).join('\n');

      await interaction.reply(`**Available Tools (${tools.length})**\n\n${toolList}`);
    }
  });

  // Handle @mentions in channels
  client.on(Events.MessageCreate, async (message: Message) => {
    // Ignore bots and messages without mentions
    if (message.author.bot) return;
    if (!client.user) return;
    if (!message.mentions.has(client.user)) return;

    // Remove the mention from the message text
    const userMessage = message.content.replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '').trim();

    if (!userMessage) {
      await message.reply(
        'Hi! Send me a message to interact with the Obidot vault. ' +
          'Try: "What is the vault performance?" or use `/ask` slash commands.',
      );
      return;
    }

    // Show typing indicator
    if ('sendTyping' in message.channel && typeof message.channel.sendTyping === 'function') {
      await message.channel.sendTyping();
    }

    try {
      const response = await agent.run(userMessage);
      const chunks = splitMessage(response);

      for (const chunk of chunks) {
        await message.reply(chunk);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Agent error:', errorMessage);
      await message.reply('Sorry, something went wrong while processing your request. Please try again.');
    }
  });

  // Ready event
  client.on(Events.ClientReady, (readyClient) => {
    console.log(`  Discord bot is running as ${readyClient.user.tag}!`);
    console.log('  Press Ctrl+C to stop.');
  });

  // Login
  await client.login(discordToken);
}

// ── Run ───────────────────────────────────────────────────────────────

main().catch((error: unknown) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
