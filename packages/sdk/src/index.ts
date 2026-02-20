// Re-export core types (these are the foundational types)
export {
  type AgentConfig,
  type BalanceInfo,
  type ChainConfig,
  ChainConnectionError,
  ConfigurationError,
  type CreatePolkadotContextOptions,
  createPolkadotContext,
  type DepositParams,
  destroyPolkadotContext,
  type KnownChainId,
  ObiKitError,
  type ObiPolkadotContext,
  PolkadotApi,
  type PolkadotSigner,
  ToolInputValidationError,
  type ToolResult,
  type TransactionSigner,
  type VaultAction,
  type VaultConfig,
  VaultOperationError,
  type VaultRegistry,
  type WithdrawParams,
  XcmError,
  type XcmTransferParams,
} from '@obidot-kit/core';

// Re-export llm types with explicit renames to avoid conflicts
export type {
  AgentConfig as LlmAgentConfig,
  AgentInstance,
  ObiAgentApiConfig,
  ObiBaseToolOptions,
  VaultDepositInput,
  VaultDepositToolOptions,
  VaultWithdrawInput,
  VaultWithdrawToolOptions,
} from '@obidot-kit/llm';

export {
  createAgent,
  createAgentWithTools,
  ObiAgentApi,
  ObiBaseTool,
  VaultDepositTool,
  VaultWithdrawTool,
} from '@obidot-kit/llm';

// SDK facade
export type { ObiKitConfig } from './obi-kit.js';
export { ObiKit } from './obi-kit.js';
