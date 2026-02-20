// Re-export core types (these are the foundational types)
export {
  type AgentConfig,
  type BalanceInfo,
  type ChainConfig,
  ChainConnectionError,
  ConfigurationError,
  type DepositParams,
  ObiKitError,
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
export type {
  AgentConfig as LlmAgentConfig,
  AgentInstance,
  VaultDepositInput,
  VaultWithdrawInput,
} from '@obidot-kit/llm';
// Re-export llm types with explicit renames to avoid conflicts
export {
  createAgent,
  createAgentWithTools,
  ObiBaseTool,
  VaultDepositTool,
  VaultWithdrawTool,
} from '@obidot-kit/llm';
export type { ObiKitConfig } from './obi-kit.js';
// SDK facade
export { ObiKit } from './obi-kit.js';
