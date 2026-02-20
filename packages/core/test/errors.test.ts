import { describe, expect, it } from 'vitest';
import {
  ChainConnectionError,
  ConfigurationError,
  ObiKitError,
  ToolInputValidationError,
  VaultOperationError,
  XcmError,
} from '../src/errors.js';

describe('ObiKitError', () => {
  it('should create an error with message and code', () => {
    const error = new ObiKitError('something went wrong', 'TEST_ERROR');
    expect(error.message).toBe('something went wrong');
    expect(error.code).toBe('TEST_ERROR');
    expect(error.name).toBe('ObiKitError');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ObiKitError);
  });

  it('should have a proper stack trace', () => {
    const error = new ObiKitError('trace test', 'TRACE');
    expect(error.stack).toBeDefined();
  });
});

describe('ChainConnectionError', () => {
  it('should store the endpoint', () => {
    const error = new ChainConnectionError('connection refused', 'wss://rpc.polkadot.io');
    expect(error.message).toBe('connection refused');
    expect(error.code).toBe('CHAIN_CONNECTION_ERROR');
    expect(error.name).toBe('ChainConnectionError');
    expect(error.endpoint).toBe('wss://rpc.polkadot.io');
    expect(error).toBeInstanceOf(ObiKitError);
    expect(error).toBeInstanceOf(ChainConnectionError);
  });
});

describe('VaultOperationError', () => {
  it('should store operation and optional vault address', () => {
    const error = new VaultOperationError('insufficient balance', 'deposit', '5FHneW46...');
    expect(error.message).toBe('insufficient balance');
    expect(error.code).toBe('VAULT_OPERATION_ERROR');
    expect(error.name).toBe('VaultOperationError');
    expect(error.operation).toBe('deposit');
    expect(error.vaultAddress).toBe('5FHneW46...');
    expect(error).toBeInstanceOf(ObiKitError);
  });

  it('should allow vault address to be undefined', () => {
    const error = new VaultOperationError('unknown vault', 'withdraw');
    expect(error.vaultAddress).toBeUndefined();
  });
});

describe('ToolInputValidationError', () => {
  it('should store tool name and optional field', () => {
    const error = new ToolInputValidationError('invalid amount', 'vault_deposit', 'amount');
    expect(error.message).toBe('invalid amount');
    expect(error.code).toBe('TOOL_INPUT_VALIDATION_ERROR');
    expect(error.name).toBe('ToolInputValidationError');
    expect(error.toolName).toBe('vault_deposit');
    expect(error.field).toBe('amount');
    expect(error).toBeInstanceOf(ObiKitError);
  });

  it('should allow field to be undefined', () => {
    const error = new ToolInputValidationError('bad input', 'vault_withdraw');
    expect(error.field).toBeUndefined();
  });
});

describe('XcmError', () => {
  it('should store source and destination chains', () => {
    const error = new XcmError('xcm failed', 'polkadot', 'astar');
    expect(error.message).toBe('xcm failed');
    expect(error.code).toBe('XCM_ERROR');
    expect(error.name).toBe('XcmError');
    expect(error.sourceChain).toBe('polkadot');
    expect(error.destinationChain).toBe('astar');
    expect(error).toBeInstanceOf(ObiKitError);
  });

  it('should allow chains to be undefined', () => {
    const error = new XcmError('generic xcm issue');
    expect(error.sourceChain).toBeUndefined();
    expect(error.destinationChain).toBeUndefined();
  });
});

describe('ConfigurationError', () => {
  it('should create a configuration error', () => {
    const error = new ConfigurationError('missing API key');
    expect(error.message).toBe('missing API key');
    expect(error.code).toBe('CONFIGURATION_ERROR');
    expect(error.name).toBe('ConfigurationError');
    expect(error).toBeInstanceOf(ObiKitError);
  });
});

describe('error hierarchy', () => {
  it('all custom errors should be catchable as ObiKitError', () => {
    const errors: ObiKitError[] = [
      new ChainConnectionError('a', 'wss://localhost'),
      new VaultOperationError('b', 'deposit'),
      new ToolInputValidationError('c', 'tool'),
      new XcmError('d'),
      new ConfigurationError('e'),
    ];

    for (const error of errors) {
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ObiKitError);
      expect(typeof error.code).toBe('string');
      expect(error.code.length).toBeGreaterThan(0);
    }
  });

  it('all custom errors should be catchable as plain Error', () => {
    try {
      throw new VaultOperationError('test throw', 'withdraw', '0x123');
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
      expect(e).toBeInstanceOf(ObiKitError);
      expect(e).toBeInstanceOf(VaultOperationError);
      if (e instanceof VaultOperationError) {
        expect(e.operation).toBe('withdraw');
        expect(e.vaultAddress).toBe('0x123');
      }
    }
  });
});
