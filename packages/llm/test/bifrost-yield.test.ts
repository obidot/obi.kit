import type { BifrostYieldProduct } from '@obidot-kit/core';
import { describe, expect, it, vi } from 'vitest';
import { BifrostYieldTool } from '../src/tools/bifrost-yield.js';

describe('BifrostYieldTool', () => {
  describe('construction', () => {
    it('should create with default options (no provider)', () => {
      const tool = new BifrostYieldTool();
      expect(tool.name).toBe('fetch_bifrost_yields');
      expect(tool.description).toContain('Bifrost');
    });

    it('should create with empty options object', () => {
      const tool = new BifrostYieldTool({});
      expect(tool.name).toBe('fetch_bifrost_yields');
    });

    it('should create with a custom provider', () => {
      const tool = new BifrostYieldTool({
        provider: {
          fetchYields: async () => [],
        },
      });
      expect(tool.name).toBe('fetch_bifrost_yields');
    });
  });

  describe('default product catalogue', () => {
    it('should return all 7 default Bifrost products when invoked with empty input', async () => {
      const tool = new BifrostYieldTool();
      const raw = await tool.invoke('{}');
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.count).toBe(7);
      expect(result.data.products).toHaveLength(7);
    });

    it('should return all 7 default products with empty string input', async () => {
      const tool = new BifrostYieldTool();
      const raw = await tool.invoke('');
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
      expect(result.data.count).toBe(7);
    });

    it('should include all four categories in the default catalogue', async () => {
      const tool = new BifrostYieldTool();
      const raw = await tool.invoke('{}');
      const result = JSON.parse(raw);

      const categories = new Set(result.data.products.map((p: BifrostYieldProduct) => p.category));
      expect(categories).toContain('SLP');
      expect(categories).toContain('DEX');
      expect(categories).toContain('Farming');
      expect(categories).toContain('SALP');
    });

    it('should have positive APY values for all default products', async () => {
      const tool = new BifrostYieldTool();
      const raw = await tool.invoke('{}');
      const result = JSON.parse(raw);

      for (const product of result.data.products) {
        expect(product.apy).toBeGreaterThan(0);
      }
    });

    it('should have all default products marked as active', async () => {
      const tool = new BifrostYieldTool();
      const raw = await tool.invoke('{}');
      const result = JSON.parse(raw);

      for (const product of result.data.products) {
        expect(product.isActive).toBe(true);
      }
    });

    it('should include protocol field as "Bifrost" for all default products', async () => {
      const tool = new BifrostYieldTool();
      const raw = await tool.invoke('{}');
      const result = JSON.parse(raw);

      for (const product of result.data.products) {
        expect(product.protocol).toBe('Bifrost');
      }
    });

    it('should include a human-readable message in the result', async () => {
      const tool = new BifrostYieldTool();
      const raw = await tool.invoke('{}');
      const result = JSON.parse(raw);

      expect(result.message).toBeDefined();
      expect(result.message).toContain('7');
      expect(result.message).toContain('Bifrost yield product');
    });
  });

  describe('category filtering', () => {
    it('should filter by SLP category', async () => {
      const tool = new BifrostYieldTool();
      const raw = await tool.invoke('{"category":"SLP"}');
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
      expect(result.data.count).toBe(2);
      for (const product of result.data.products) {
        expect(product.category).toBe('SLP');
      }
    });

    it('should filter by DEX category', async () => {
      const tool = new BifrostYieldTool();
      const raw = await tool.invoke('{"category":"DEX"}');
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
      expect(result.data.count).toBe(2);
      for (const product of result.data.products) {
        expect(product.category).toBe('DEX');
      }
    });

    it('should filter by Farming category', async () => {
      const tool = new BifrostYieldTool();
      const raw = await tool.invoke('{"category":"Farming"}');
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
      expect(result.data.count).toBe(2);
      for (const product of result.data.products) {
        expect(product.category).toBe('Farming');
      }
    });

    it('should filter by SALP category', async () => {
      const tool = new BifrostYieldTool();
      const raw = await tool.invoke('{"category":"SALP"}');
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
      expect(result.data.count).toBe(1);
      expect(result.data.products[0].category).toBe('SALP');
    });

    it('should include category in the message when filtering', async () => {
      const tool = new BifrostYieldTool();
      const raw = await tool.invoke('{"category":"SALP"}');
      const result = JSON.parse(raw);

      expect(result.message).toContain('SALP');
    });

    it('should return an error for invalid category', async () => {
      const tool = new BifrostYieldTool();
      const raw = await tool.invoke('{"category":"INVALID"}');
      const result = JSON.parse(raw);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid category');
      expect(result.error).toContain('INVALID');
    });
  });

  describe('activeOnly filtering', () => {
    it('should return only active products by default', async () => {
      const mockProducts: BifrostYieldProduct[] = [
        {
          protocol: 'Bifrost',
          product: 'Active Product',
          category: 'SLP',
          apy: 10,
          currencyIn: 0,
          isActive: true,
        },
        {
          protocol: 'Bifrost',
          product: 'Inactive Product',
          category: 'SLP',
          apy: 5,
          currencyIn: 0,
          isActive: false,
        },
      ];

      const tool = new BifrostYieldTool({
        provider: { fetchYields: async () => mockProducts },
      });
      const raw = await tool.invoke('{}');
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
      expect(result.data.count).toBe(1);
      expect(result.data.products[0].product).toBe('Active Product');
    });

    it('should return all products when activeOnly is false', async () => {
      const mockProducts: BifrostYieldProduct[] = [
        {
          protocol: 'Bifrost',
          product: 'Active Product',
          category: 'SLP',
          apy: 10,
          currencyIn: 0,
          isActive: true,
        },
        {
          protocol: 'Bifrost',
          product: 'Inactive Product',
          category: 'SLP',
          apy: 5,
          currencyIn: 0,
          isActive: false,
        },
      ];

      const tool = new BifrostYieldTool({
        provider: { fetchYields: async () => mockProducts },
      });
      const raw = await tool.invoke('{"activeOnly":false}');
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
      expect(result.data.count).toBe(2);
    });

    it('should combine activeOnly and category filters', async () => {
      const mockProducts: BifrostYieldProduct[] = [
        {
          protocol: 'Bifrost',
          product: 'Active SLP',
          category: 'SLP',
          apy: 10,
          currencyIn: 0,
          isActive: true,
        },
        {
          protocol: 'Bifrost',
          product: 'Inactive SLP',
          category: 'SLP',
          apy: 5,
          currencyIn: 0,
          isActive: false,
        },
        {
          protocol: 'Bifrost',
          product: 'Active DEX',
          category: 'DEX',
          apy: 8,
          currencyIn: 0,
          isActive: true,
        },
      ];

      const tool = new BifrostYieldTool({
        provider: { fetchYields: async () => mockProducts },
      });

      // Filter by SLP + activeOnly (default)
      const raw = await tool.invoke('{"category":"SLP"}');
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
      expect(result.data.count).toBe(1);
      expect(result.data.products[0].product).toBe('Active SLP');
    });
  });

  describe('custom provider', () => {
    it('should use the custom fetchYields function', async () => {
      const customProducts: BifrostYieldProduct[] = [
        {
          protocol: 'CustomProtocol',
          product: 'Custom Yield',
          category: 'SLP',
          apy: 42.5,
          currencyIn: 0,
          currencyOut: 1,
          isActive: true,
        },
      ];

      const fetchYields = vi.fn().mockResolvedValue(customProducts);
      const tool = new BifrostYieldTool({ provider: { fetchYields } });

      const raw = await tool.invoke('{}');
      const result = JSON.parse(raw);

      expect(fetchYields).toHaveBeenCalledOnce();
      expect(result.success).toBe(true);
      expect(result.data.count).toBe(1);
      expect(result.data.products[0].protocol).toBe('CustomProtocol');
      expect(result.data.products[0].apy).toBe(42.5);
    });

    it('should return an error when custom provider throws', async () => {
      const fetchYields = vi.fn().mockRejectedValue(new Error('API timeout'));
      const tool = new BifrostYieldTool({ provider: { fetchYields } });

      const raw = await tool.invoke('{}');
      const result = JSON.parse(raw);

      expect(result.success).toBe(false);
      expect(result.error).toContain('API timeout');
    });

    it('should return empty array when custom provider returns no products', async () => {
      const tool = new BifrostYieldTool({
        provider: { fetchYields: async () => [] },
      });

      const raw = await tool.invoke('{}');
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
      expect(result.data.count).toBe(0);
      expect(result.data.products).toHaveLength(0);
    });
  });

  describe('input validation', () => {
    it('should handle invalid JSON input gracefully', async () => {
      const tool = new BifrostYieldTool();
      const raw = await tool.invoke('not valid json');
      const result = JSON.parse(raw);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid JSON');
    });

    it('should handle non-object JSON input (e.g. number)', async () => {
      const tool = new BifrostYieldTool();
      const raw = await tool.invoke('42');
      const result = JSON.parse(raw);

      // Non-object parsed values are treated as empty filter
      expect(result.success).toBe(true);
      expect(result.data.count).toBe(7);
    });

    it('should handle null JSON input', async () => {
      const tool = new BifrostYieldTool();
      const raw = await tool.invoke('null');
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
      expect(result.data.count).toBe(7);
    });

    it('should ignore unknown fields in input', async () => {
      const tool = new BifrostYieldTool();
      const raw = await tool.invoke('{"unknownField":"value","category":"SLP"}');
      const result = JSON.parse(raw);

      expect(result.success).toBe(true);
      expect(result.data.count).toBe(2);
    });
  });

  describe('product details', () => {
    it('should include currencyIn and currencyOut for SLP products', async () => {
      const tool = new BifrostYieldTool();
      const raw = await tool.invoke('{"category":"SLP"}');
      const result = JSON.parse(raw);

      for (const product of result.data.products) {
        expect(product.currencyIn).toBeDefined();
        expect(typeof product.currencyIn).toBe('number');
        expect(product.currencyOut).toBeDefined();
        expect(typeof product.currencyOut).toBe('number');
      }
    });

    it('should include poolId for DEX products', async () => {
      const tool = new BifrostYieldTool();
      const raw = await tool.invoke('{"category":"DEX"}');
      const result = JSON.parse(raw);

      for (const product of result.data.products) {
        expect(product.poolId).toBeDefined();
        expect(typeof product.poolId).toBe('number');
      }
    });

    it('should include poolId for Farming products', async () => {
      const tool = new BifrostYieldTool();
      const raw = await tool.invoke('{"category":"Farming"}');
      const result = JSON.parse(raw);

      for (const product of result.data.products) {
        expect(product.poolId).toBeDefined();
        expect(typeof product.poolId).toBe('number');
      }
    });
  });
});
