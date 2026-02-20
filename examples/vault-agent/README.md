# Vault Agent Example

This example demonstrates how to connect an AI agent to a DeFi vault on a Polkadot-based chain and perform deposit/withdraw operations using the Obidot Kit SDK.

## Prerequisites

- Node.js >= 20
- pnpm >= 10
- An OpenAI API key (or another LangChain-compatible LLM provider)

## Setup

1. Install dependencies from the monorepo root:

   ```sh
   pnpm install
   ```

2. Build all packages:

   ```sh
   pnpm build
   ```

3. Create a `.env` file in this directory:

   ```sh
   cp .env.example .env
   ```

4. Fill in your environment variables:

   ```
   OPENAI_API_KEY=sk-...
   CHAIN_ENDPOINT=wss://rpc.polkadot.io
   VAULT_ADDRESS=5F3s...
   ```

## Running

```sh
pnpm --filter vault-agent start
```

Or from this directory:

```sh
pnpm start
```

## What It Does

1. Connects to a Polkadot-based chain via the configured RPC endpoint.
2. Creates an AI agent with vault deposit and withdraw tools bound to it.
3. Sends a natural language prompt to the agent (e.g. "Deposit 100 DOT into the vault").
4. The agent interprets the request, selects the appropriate tool, and executes the on-chain action.
5. Returns the transaction result to the user.

## Example Prompts

- `"Deposit 50 DOT into vault 5F3s..."`
- `"Withdraw 25 DOT from the vault"`
- `"What is the current balance of the vault?"`

## Project Structure

```
vault-agent/
├── src/
│   └── index.ts    # Main entrypoint — sets up agent and runs a prompt
├── .env.example    # Template for environment variables
├── package.json
├── tsconfig.json
└── README.md
```

## Notes

- This example uses placeholder implementations for on-chain interactions. To connect to a real vault, extend the `VaultDepositTool` and `VaultWithdrawTool` classes with your protocol-specific logic.
- The agent uses OpenAI by default. You can swap in any LangChain-compatible chat model by changing the model instantiation in `src/index.ts`.