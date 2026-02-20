/**
 * Base error class for all Obidot Kit errors.
 */
export class ObiKitError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'ObiKitError';
    this.code = code;
  }
}

/**
 * Error thrown when chain connection or RPC interaction fails.
 */
export class ChainConnectionError extends ObiKitError {
  public readonly endpoint: string;

  constructor(message: string, endpoint: string) {
    super(message, 'CHAIN_CONNECTION_ERROR');
    this.name = 'ChainConnectionError';
    this.endpoint = endpoint;
  }
}

/**
 * Error thrown when a vault operation (deposit, withdraw, etc.) fails.
 */
export class VaultOperationError extends ObiKitError {
  public readonly operation: string;
  public readonly vaultAddress?: string;

  constructor(message: string, operation: string, vaultAddress?: string) {
    super(message, 'VAULT_OPERATION_ERROR');
    this.name = 'VaultOperationError';
    this.operation = operation;
    this.vaultAddress = vaultAddress;
  }
}

/**
 * Error thrown when tool input validation fails.
 */
export class ToolInputValidationError extends ObiKitError {
  public readonly toolName: string;
  public readonly field?: string;

  constructor(message: string, toolName: string, field?: string) {
    super(message, 'TOOL_INPUT_VALIDATION_ERROR');
    this.name = 'ToolInputValidationError';
    this.toolName = toolName;
    this.field = field;
  }
}

/**
 * Error thrown when an XCM cross-chain operation fails.
 */
export class XcmError extends ObiKitError {
  public readonly sourceChain?: string;
  public readonly destinationChain?: string;

  constructor(message: string, sourceChain?: string, destinationChain?: string) {
    super(message, 'XCM_ERROR');
    this.name = 'XcmError';
    this.sourceChain = sourceChain;
    this.destinationChain = destinationChain;
  }
}

/**
 * Error thrown when agent configuration is invalid or missing.
 */
export class ConfigurationError extends ObiKitError {
  constructor(message: string) {
    super(message, 'CONFIGURATION_ERROR');
    this.name = 'ConfigurationError';
  }
}
