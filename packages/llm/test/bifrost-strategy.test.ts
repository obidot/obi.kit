import { describe, expect, it, vi } from 'vitest';
import type { BifrostStrategyService } from '../src/tools/bifrost-strategy.js';
import { BifrostStrategyTool } from '../src/tools/bifrost-strategy.js';

describe('BifrostStrategyTool', () => {
  describe('construction', () => {
    it('should create a tool with default options', () => {
      const tool = new BifrostStrategyTool({});
      expect(tool.name).toBe('execute_bifrost_strategy');
      expect(tool.description).toContain('Bifrost');
    });

    it('should accept an adapter address', () => {
      const tool = new BifrostStrategyTool({
        adapterAddress: '0x1234567890abcdef1234567890abcdef12345678',
      });
      expect(tool.name).toBe('execute_bifrost_strategy');
    });

    it('should accept a strategy service', () => {
      const mockService: BifrostStrategyService = {
        previewStrategy: vi.fn(),
        executeStrategy: vi.fn(),
      };
      const tool = new BifrostStrategyTool({ strategyService: mockService });
      expect(tool.name).toBe('execute_bifrost_strategy');
    });
  });

  describe('stub mode (no strategy service)', () => {
    it('should return a simulated result for MintVToken (strategyType=0, DOT)', async () => {
      const tool = new BifrostStrategyTool({
        adapterAddress: '0xAdapter',
      });

      const input = JSON.stringify({
        strategyType: 0,
        currencyIn: 0,
        amount: '10000000000',
        poolId: 0,
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.strategy).toBe('Mint vToken (SLP)');
      expect(result.data.strategyType).toBe(0);
      expect(result.data.currencyIn).toBe('DOT');
      expect(result.data.currencyInId).toBe(0);
      expect(result.data.amount).toBe('10000000000');
      expect(result.data.adapterAddress).toBe('0xAdapter');
      expect(result.data.mode).toBe('stub');
      expect(result.data.status).toBe('simulated');
    });

    it('should return a simulated result for RedeemVToken (strategyType=1, vDOT)', async () => {
      const tool = new BifrostStrategyTool({});

      const input = JSON.stringify({
        strategyType: 1,
        currencyIn: 1,
        amount: '5000000000',
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
      expect(result.data.strategy).toBe('Redeem vToken (SLP)');
      expect(result.data.currencyIn).toBe('vDOT');
      expect(result.data.currencyInId).toBe(1);
    });

    it('should return a simulated result for DEXSwap (strategyType=2)', async () => {
      const tool = new BifrostStrategyTool({});

      const input = JSON.stringify({
        strategyType: 2,
        currencyIn: 0,
        amount: '1000000',
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
      expect(result.data.strategy).toBe('DEX Swap');
    });

    it('should return a simulated result for FarmDeposit (strategyType=3) with poolId', async () => {
      const tool = new BifrostStrategyTool({});

      const input = JSON.stringify({
        strategyType: 3,
        currencyIn: 1,
        amount: '2000000',
        poolId: 5,
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
      expect(result.data.strategy).toBe('Farm Deposit');
      expect(result.data.poolId).toBe(5);
    });

    it('should return a simulated result for FarmWithdraw (strategyType=4) with poolId', async () => {
      const tool = new BifrostStrategyTool({});

      const input = JSON.stringify({
        strategyType: 4,
        currencyIn: 1,
        amount: '2000000',
        poolId: 3,
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
      expect(result.data.strategy).toBe('Farm Withdraw');
    });

    it('should return a simulated result for FarmClaim (strategyType=5) with poolId', async () => {
      const tool = new BifrostStrategyTool({});

      const input = JSON.stringify({
        strategyType: 5,
        currencyIn: 4,
        amount: '1',
        poolId: 0,
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
      expect(result.data.strategy).toBe('Farm Claim Rewards');
      expect(result.data.currencyIn).toBe('BNC');
    });

    it('should return a simulated result for SALPContribute (strategyType=6)', async () => {
      const tool = new BifrostStrategyTool({});

      const input = JSON.stringify({
        strategyType: 6,
        currencyIn: 0,
        amount: '50000000000',
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
      expect(result.data.strategy).toBe('SALP Contribute');
    });

    it('should use default minOut of "0" when not provided', async () => {
      const tool = new BifrostStrategyTool({});

      const input = JSON.stringify({
        strategyType: 0,
        currencyIn: 0,
        amount: '1000',
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
      expect(result.data.minOut).toBe('0');
    });

    it('should pass through minOut when provided', async () => {
      const tool = new BifrostStrategyTool({});

      const input = JSON.stringify({
        strategyType: 0,
        currencyIn: 0,
        amount: '1000',
        minOut: '950',
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
      expect(result.data.minOut).toBe('950');
    });

    it('should use default poolId of 0 when not provided', async () => {
      const tool = new BifrostStrategyTool({});

      const input = JSON.stringify({
        strategyType: 2,
        currencyIn: 0,
        amount: '1000',
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
      expect(result.data.poolId).toBe(0);
    });
  });

  describe('on-chain mode (with strategy service)', () => {
    it('should call previewStrategy and executeStrategy on the service', async () => {
      const mockService: BifrostStrategyService = {
        previewStrategy: vi.fn().mockResolvedValue({
          expectedOut: 9500000000n,
          fee: 50000000n,
        }),
        executeStrategy: vi.fn().mockResolvedValue({
          amountOut: 9480000000n,
          txHash: '0xabc123',
        }),
      };

      const tool = new BifrostStrategyTool({
        strategyService: mockService,
        adapterAddress: '0xAdapter',
      });

      const input = JSON.stringify({
        strategyType: 0,
        currencyIn: 0,
        amount: '10000000000',
        minOut: '9000000000',
        poolId: 0,
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
      expect(result.data.mode).toBe('on-chain');
      expect(result.data.status).toBe('executed');
      expect(result.data.expectedOut).toBe('9500000000');
      expect(result.data.fee).toBe('50000000');
      expect(result.data.amountOut).toBe('9480000000');
      expect(result.txHash).toBe('0xabc123');

      expect(mockService.previewStrategy).toHaveBeenCalledWith(0, 0, 10000000000n, 0);
      expect(mockService.executeStrategy).toHaveBeenCalledWith(0, 0, 10000000000n, 9000000000n, 0);
    });

    it('should handle service execution errors gracefully', async () => {
      const mockService: BifrostStrategyService = {
        previewStrategy: vi.fn().mockRejectedValue(new Error('Contract reverted')),
        executeStrategy: vi.fn(),
      };

      const tool = new BifrostStrategyTool({
        strategyService: mockService,
      });

      const input = JSON.stringify({
        strategyType: 0,
        currencyIn: 0,
        amount: '10000000000',
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Contract reverted');
    });
  });

  describe('input validation errors', () => {
    it('should reject invalid JSON input', async () => {
      const tool = new BifrostStrategyTool({});
      const raw = await tool.invoke('not valid json');
      const result = JSON.parse(raw);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid JSON');
    });

    it('should reject non-object JSON input', async () => {
      const tool = new BifrostStrategyTool({});
      const raw = await tool.invoke('"just a string"');
      const result = JSON.parse(raw);

      expect(result.success).toBe(false);
      expect(result.error).toContain('JSON object');
    });

    it('should reject missing strategyType', async () => {
      const tool = new BifrostStrategyTool({});
      const input = JSON.stringify({
        currencyIn: 0,
        amount: '1000',
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(false);
      expect(result.error).toContain('strategyType');
    });

    it('should reject missing currencyIn', async () => {
      const tool = new BifrostStrategyTool({});
      const input = JSON.stringify({
        strategyType: 0,
        amount: '1000',
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(false);
      expect(result.error).toContain('currencyIn');
    });

    it('should reject missing amount', async () => {
      const tool = new BifrostStrategyTool({});
      const input = JSON.stringify({
        strategyType: 0,
        currencyIn: 0,
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(false);
      expect(result.error).toContain('amount');
    });

    it('should reject empty amount string', async () => {
      const tool = new BifrostStrategyTool({});
      const input = JSON.stringify({
        strategyType: 0,
        currencyIn: 0,
        amount: '',
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(false);
      expect(result.error).toContain('amount');
    });

    it('should reject strategyType below 0', async () => {
      const tool = new BifrostStrategyTool({});
      const input = JSON.stringify({
        strategyType: -1,
        currencyIn: 0,
        amount: '1000',
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(false);
      expect(result.error).toContain('strategyType');
    });

    it('should reject strategyType above 6', async () => {
      const tool = new BifrostStrategyTool({});
      const input = JSON.stringify({
        strategyType: 7,
        currencyIn: 0,
        amount: '1000',
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(false);
      expect(result.error).toContain('strategyType');
    });

    it('should reject non-integer strategyType', async () => {
      const tool = new BifrostStrategyTool({});
      const input = JSON.stringify({
        strategyType: 1.5,
        currencyIn: 0,
        amount: '1000',
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(false);
      expect(result.error).toContain('strategyType');
    });

    it('should reject currencyIn below 0', async () => {
      const tool = new BifrostStrategyTool({});
      const input = JSON.stringify({
        strategyType: 2,
        currencyIn: -1,
        amount: '1000',
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(false);
      expect(result.error).toContain('currencyIn');
    });

    it('should reject currencyIn above 4', async () => {
      const tool = new BifrostStrategyTool({});
      const input = JSON.stringify({
        strategyType: 2,
        currencyIn: 5,
        amount: '1000',
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(false);
      expect(result.error).toContain('currencyIn');
    });

    it('should reject zero amount', async () => {
      const tool = new BifrostStrategyTool({});
      const input = JSON.stringify({
        strategyType: 0,
        currencyIn: 0,
        amount: '0',
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(false);
      expect(result.error).toContain('greater than 0');
    });

    it('should reject negative amount', async () => {
      const tool = new BifrostStrategyTool({});
      const input = JSON.stringify({
        strategyType: 0,
        currencyIn: 0,
        amount: '-500',
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(false);
      expect(result.error).toContain('greater than 0');
    });

    it('should reject non-numeric amount string', async () => {
      const tool = new BifrostStrategyTool({});
      const input = JSON.stringify({
        strategyType: 0,
        currencyIn: 0,
        amount: 'abc',
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid amount');
    });

    it('should reject invalid minOut string', async () => {
      const tool = new BifrostStrategyTool({});
      const input = JSON.stringify({
        strategyType: 0,
        currencyIn: 0,
        amount: '1000',
        minOut: 'abc',
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(false);
      expect(result.error).toContain('minOut');
    });

    it('should reject negative poolId', async () => {
      const tool = new BifrostStrategyTool({});
      const input = JSON.stringify({
        strategyType: 3,
        currencyIn: 1,
        amount: '1000',
        poolId: -1,
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(false);
      expect(result.error).toContain('poolId');
    });

    it('should reject non-integer poolId', async () => {
      const tool = new BifrostStrategyTool({});
      const input = JSON.stringify({
        strategyType: 3,
        currencyIn: 1,
        amount: '1000',
        poolId: 1.5,
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(false);
      expect(result.error).toContain('poolId');
    });
  });

  describe('strategy-specific validation guardrails', () => {
    it('should reject MintVToken with vDOT as input (must be base currency)', async () => {
      const tool = new BifrostStrategyTool({});
      const input = JSON.stringify({
        strategyType: 0, // MintVToken
        currencyIn: 1, // vDOT — not a base currency
        amount: '1000',
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(false);
      expect(result.error).toContain('MintVToken');
      expect(result.error).toContain('DOT');
    });

    it('should reject MintVToken with BNC as input', async () => {
      const tool = new BifrostStrategyTool({});
      const input = JSON.stringify({
        strategyType: 0,
        currencyIn: 4, // BNC
        amount: '1000',
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(false);
      expect(result.error).toContain('MintVToken');
    });

    it('should allow MintVToken with DOT as input', async () => {
      const tool = new BifrostStrategyTool({});
      const input = JSON.stringify({
        strategyType: 0,
        currencyIn: 0, // DOT
        amount: '1000',
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
    });

    it('should allow MintVToken with KSM as input', async () => {
      const tool = new BifrostStrategyTool({});
      const input = JSON.stringify({
        strategyType: 0,
        currencyIn: 2, // KSM
        amount: '1000',
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
    });

    it('should reject RedeemVToken with DOT as input (must be vToken)', async () => {
      const tool = new BifrostStrategyTool({});
      const input = JSON.stringify({
        strategyType: 1, // RedeemVToken
        currencyIn: 0, // DOT — not a vToken
        amount: '1000',
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(false);
      expect(result.error).toContain('RedeemVToken');
      expect(result.error).toContain('vDOT');
    });

    it('should allow RedeemVToken with vDOT as input', async () => {
      const tool = new BifrostStrategyTool({});
      const input = JSON.stringify({
        strategyType: 1,
        currencyIn: 1, // vDOT
        amount: '1000',
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
    });

    it('should allow RedeemVToken with vKSM as input', async () => {
      const tool = new BifrostStrategyTool({});
      const input = JSON.stringify({
        strategyType: 1,
        currencyIn: 3, // vKSM
        amount: '1000',
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
    });

    it('should reject FarmDeposit without poolId', async () => {
      const tool = new BifrostStrategyTool({});
      const input = JSON.stringify({
        strategyType: 3,
        currencyIn: 1,
        amount: '1000',
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(false);
      expect(result.error).toContain('poolId');
    });

    it('should reject FarmWithdraw without poolId', async () => {
      const tool = new BifrostStrategyTool({});
      const input = JSON.stringify({
        strategyType: 4,
        currencyIn: 1,
        amount: '1000',
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(false);
      expect(result.error).toContain('poolId');
    });

    it('should reject FarmClaim without poolId', async () => {
      const tool = new BifrostStrategyTool({});
      const input = JSON.stringify({
        strategyType: 5,
        currencyIn: 4,
        amount: '1',
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(false);
      expect(result.error).toContain('poolId');
    });

    it('should accept DEXSwap without poolId (no poolId requirement)', async () => {
      const tool = new BifrostStrategyTool({});
      const input = JSON.stringify({
        strategyType: 2,
        currencyIn: 0,
        amount: '1000',
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
    });

    it('should accept SALPContribute without poolId', async () => {
      const tool = new BifrostStrategyTool({});
      const input = JSON.stringify({
        strategyType: 6,
        currencyIn: 0,
        amount: '50000000000',
      });

      const raw = await tool.invoke(input);
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
    });
  });

  describe('metadata', () => {
    it('should have the correct tool name', () => {
      const tool = new BifrostStrategyTool({});
      expect(tool.name).toBe('execute_bifrost_strategy');
    });

    it('should have a description mentioning all strategy types', () => {
      const tool = new BifrostStrategyTool({});
      expect(tool.description).toContain('MintVToken');
      expect(tool.description).toContain('RedeemVToken');
      expect(tool.description).toContain('DEXSwap');
      expect(tool.description).toContain('FarmDeposit');
      expect(tool.description).toContain('FarmWithdraw');
      expect(tool.description).toContain('FarmClaim');
      expect(tool.description).toContain('SALPContribute');
    });

    it('should have a description mentioning currency IDs', () => {
      const tool = new BifrostStrategyTool({});
      expect(tool.description).toContain('DOT');
      expect(tool.description).toContain('vDOT');
      expect(tool.description).toContain('KSM');
      expect(tool.description).toContain('vKSM');
      expect(tool.description).toContain('BNC');
    });
  });
});
