import type { ObiEvmContext } from "@obidot-kit/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EvmCrossChainService } from "../src/services/evm-cross-chain-service.js";
import { CrossChainRebalanceTool } from "../src/tools/cross-chain-rebalance.js";

// ── Fixtures ────────────────────────────────────────────────────────────────

const ROUTER_ADDRESS = "0xE2fFfb3B5C72f99811bC20D857035611bFCe5b5d" as const;
const ADMIN_ADDRESS = "0x5984A519fFfE5aFc5e8bBA233DCc01AC774f4301" as const;
const TX_HASH =
  "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef" as const;

const MOCK_ROUTER_STATE = {
  paused: false,
  outgoingNonce: 7n,
  pendingSatelliteDeposits: 2n,
  pendingWithdrawalRequests: 1n,
  satelliteChainCount: 3n,
  relayerFee: 1_000_000_000_000_000_000n, // 1e18
};

function makeReadContractMock() {
  return vi
    .fn()
    .mockImplementation(({ functionName }: { functionName: string }) => {
      switch (functionName) {
        case "paused":
          return Promise.resolve(MOCK_ROUTER_STATE.paused);
        case "outgoingNonce":
          return Promise.resolve(MOCK_ROUTER_STATE.outgoingNonce);
        case "pendingSatelliteDeposits":
          return Promise.resolve(MOCK_ROUTER_STATE.pendingSatelliteDeposits);
        case "pendingWithdrawalRequests":
          return Promise.resolve(MOCK_ROUTER_STATE.pendingWithdrawalRequests);
        case "satelliteChainCount":
          return Promise.resolve(MOCK_ROUTER_STATE.satelliteChainCount);
        case "relayerFee":
          return Promise.resolve(MOCK_ROUTER_STATE.relayerFee);
        default:
          return Promise.reject(new Error(`Unknown function: ${functionName}`));
      }
    });
}

function makeEvmContext(overrides: Partial<ObiEvmContext> = {}): ObiEvmContext {
  return {
    client: {
      readContract: makeReadContractMock(),
      waitForTransactionReceipt: vi
        .fn()
        .mockResolvedValue({ status: "success", blockNumber: 100n }),
    } as unknown as ObiEvmContext["client"],
    walletClient: {
      writeContract: vi.fn().mockResolvedValue(TX_HASH),
    } as unknown as NonNullable<ObiEvmContext["walletClient"]>,
    chain: {
      id: 420420417,
      name: "Polkadot Hub TestNet",
    } as ObiEvmContext["chain"],
    chainName: "Polkadot Hub TestNet",
    account: ADMIN_ADDRESS,
    ...overrides,
  };
}

// ── EvmCrossChainService tests ───────────────────────────────────────────────

describe("EvmCrossChainService", () => {
  describe("construction", () => {
    it("should create the service with an EVM context and router address", () => {
      const ctx = makeEvmContext();
      const service = new EvmCrossChainService({
        evmContext: ctx,
        routerAddress: ROUTER_ADDRESS,
      });
      expect(service).toBeInstanceOf(EvmCrossChainService);
    });
  });

  describe("readRouterState", () => {
    it("should read all router state fields in parallel", async () => {
      const ctx = makeEvmContext();
      const service = new EvmCrossChainService({
        evmContext: ctx,
        routerAddress: ROUTER_ADDRESS,
      });

      const state = await service.readRouterState();

      expect(state.paused).toBe(false);
      expect(state.outgoingNonce).toBe(7n);
      expect(state.pendingSatelliteDeposits).toBe(2n);
      expect(state.pendingWithdrawalRequests).toBe(1n);
      expect(state.satelliteChainCount).toBe(3n);
      expect(state.relayerFee).toBe(1_000_000_000_000_000_000n);
    });

    it("should call readContract with the correct router address", async () => {
      const ctx = makeEvmContext();
      const service = new EvmCrossChainService({
        evmContext: ctx,
        routerAddress: ROUTER_ADDRESS,
      });

      await service.readRouterState();

      const calls = (ctx.client.readContract as ReturnType<typeof vi.fn>).mock
        .calls;
      // All 6 reads should use the router address
      expect(calls.length).toBe(6);
      for (const call of calls) {
        expect(call[0].address).toBe(ROUTER_ADDRESS);
      }
    });

    it("should propagate readContract errors", async () => {
      const ctx = makeEvmContext({
        client: {
          readContract: vi.fn().mockRejectedValue(new Error("RPC error")),
          waitForTransactionReceipt: vi.fn(),
        } as unknown as ObiEvmContext["client"],
      });
      const service = new EvmCrossChainService({
        evmContext: ctx,
        routerAddress: ROUTER_ADDRESS,
      });

      await expect(service.readRouterState()).rejects.toThrow("RPC error");
    });

    it("should reflect paused=true when router is paused", async () => {
      const ctx = makeEvmContext({
        client: {
          readContract: vi
            .fn()
            .mockImplementation(
              ({ functionName }: { functionName: string }) => {
                if (functionName === "paused") return Promise.resolve(true);
                return Promise.resolve(0n);
              },
            ),
          waitForTransactionReceipt: vi.fn(),
        } as unknown as ObiEvmContext["client"],
      });
      const service = new EvmCrossChainService({
        evmContext: ctx,
        routerAddress: ROUTER_ADDRESS,
      });
      const state = await service.readRouterState();
      expect(state.paused).toBe(true);
    });
  });

  describe("broadcastSync", () => {
    it("should call writeContract with correct args and wait for receipt", async () => {
      const ctx = makeEvmContext();
      const service = new EvmCrossChainService({
        evmContext: ctx,
        routerAddress: ROUTER_ADDRESS,
      });

      const result = await service.broadcastSync(5000n, 4800n, 200n);

      expect(result.txHash).toBe(TX_HASH);
      expect(result.globalTotalAssets).toBe(5000n);
      expect(result.globalTotalShares).toBe(4800n);
      expect(result.totalRemoteAssets).toBe(200n);

      expect(ctx.walletClient!.writeContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: ROUTER_ADDRESS,
          functionName: "broadcastAssetSync",
          args: [5000n, 4800n, 200n],
        }),
      );

      expect(ctx.client.waitForTransactionReceipt).toHaveBeenCalledWith({
        hash: TX_HASH,
      });
    });

    it("should throw if walletClient is not available", async () => {
      const ctx = makeEvmContext({
        walletClient: undefined,
        account: undefined,
      });
      const service = new EvmCrossChainService({
        evmContext: ctx,
        routerAddress: ROUTER_ADDRESS,
      });

      await expect(service.broadcastSync(1000n, 1000n, 0n)).rejects.toThrow(
        "walletClient and account are required for broadcastSync",
      );
    });

    it("should propagate writeContract errors", async () => {
      const ctx = makeEvmContext({
        walletClient: {
          writeContract: vi
            .fn()
            .mockRejectedValue(new Error("AccessControl: missing role")),
        } as unknown as NonNullable<ObiEvmContext["walletClient"]>,
      });
      const service = new EvmCrossChainService({
        evmContext: ctx,
        routerAddress: ROUTER_ADDRESS,
      });

      await expect(service.broadcastSync(1000n, 1000n, 0n)).rejects.toThrow(
        "AccessControl: missing role",
      );
    });
  });
});

// ── CrossChainRebalanceTool + EvmCrossChainService integration tests ─────────

describe("CrossChainRebalanceTool with EvmCrossChainService", () => {
  let evmContext: ObiEvmContext;
  let evmService: EvmCrossChainService;

  beforeEach(() => {
    evmContext = makeEvmContext();
    evmService = new EvmCrossChainService({
      evmContext,
      routerAddress: ROUTER_ADDRESS,
    });
  });

  it("hasEvmCrossChainService() returns true when service is provided", () => {
    const tool = new CrossChainRebalanceTool({
      hubVaultAddress: "0x03473a95971Ba0496786a615e21b1e87bDFf0025",
      routerAddress: ROUTER_ADDRESS,
      evmCrossChainService: evmService,
    });
    expect(tool.hasEvmCrossChainService()).toBe(true);
  });

  it("hasEvmCrossChainService() returns false when service is absent", () => {
    const tool = new CrossChainRebalanceTool({
      hubVaultAddress: "0x03473a95971Ba0496786a615e21b1e87bDFf0025",
      routerAddress: ROUTER_ADDRESS,
    });
    expect(tool.hasEvmCrossChainService()).toBe(false);
  });

  it("hub_to_satellite includes live routerState from service", async () => {
    const tool = new CrossChainRebalanceTool({
      hubVaultAddress: "0x03473a95971Ba0496786a615e21b1e87bDFf0025",
      routerAddress: ROUTER_ADDRESS,
      evmCrossChainService: evmService,
      satellites: [
        {
          id: "sepolia",
          address: "0xabc",
          chain: { name: "Sepolia", endpoint: "https://rpc.sepolia.org" },
          evmChainId: 11155111,
        },
      ],
    });

    const raw = await tool.invoke(
      JSON.stringify({
        direction: "hub_to_satellite",
        satelliteChainName: "Sepolia",
        amount: "1000000000000000000",
      }),
    );
    const result = JSON.parse(raw);

    expect(result.success).toBe(true);
    expect(result.data.mode).toBe("evm-live");
    expect(result.data.routerState).not.toBeNull();
    expect(result.data.routerState.outgoingNonce).toBe("7");
    expect(result.data.routerState.pendingSatelliteDeposits).toBe("2");
    expect(result.data.note).toContain("vault.executeIntent");
  });

  it("satellite_to_hub includes live routerState from service", async () => {
    const tool = new CrossChainRebalanceTool({
      hubVaultAddress: "0x03473a95971Ba0496786a615e21b1e87bDFf0025",
      routerAddress: ROUTER_ADDRESS,
      evmCrossChainService: evmService,
      satellites: [
        {
          id: "sepolia",
          address: "0xabc",
          chain: { name: "Sepolia", endpoint: "https://rpc.sepolia.org" },
          evmChainId: 11155111,
        },
      ],
    });

    const raw = await tool.invoke(
      JSON.stringify({
        direction: "satellite_to_hub",
        satelliteChainName: "Sepolia",
        amount: "500000000000000000",
        receiver: "0x5984A519fFfE5aFc5e8bBA233DCc01AC774f4301",
      }),
    );
    const result = JSON.parse(raw);

    expect(result.success).toBe(true);
    expect(result.data.mode).toBe("evm-live");
    expect(result.data.routerState.pendingWithdrawalRequests).toBe("1");
    expect(result.data.note).toContain("onAccept");
  });

  it("falls back gracefully when readRouterState fails", async () => {
    const failingCtx = makeEvmContext({
      client: {
        readContract: vi.fn().mockRejectedValue(new Error("RPC timeout")),
        waitForTransactionReceipt: vi.fn(),
      } as unknown as ObiEvmContext["client"],
    });
    const failingService = new EvmCrossChainService({
      evmContext: failingCtx,
      routerAddress: ROUTER_ADDRESS,
    });

    const tool = new CrossChainRebalanceTool({
      hubVaultAddress: "0x03473a95971Ba0496786a615e21b1e87bDFf0025",
      routerAddress: ROUTER_ADDRESS,
      evmCrossChainService: failingService,
      satellites: [
        {
          id: "sepolia",
          address: "0xabc",
          chain: { name: "Sepolia", endpoint: "https://rpc.sepolia.org" },
          evmChainId: 11155111,
        },
      ],
    });

    const raw = await tool.invoke(
      JSON.stringify({
        direction: "hub_to_satellite",
        satelliteChainName: "Sepolia",
        amount: "1000",
      }),
    );
    const result = JSON.parse(raw);

    // Should still succeed — router state failure is non-fatal
    expect(result.success).toBe(true);
    expect(result.data.routerState).toBeNull();
  });

  it("offline mode returns routerState: null", async () => {
    const tool = new CrossChainRebalanceTool({
      hubVaultAddress: "0x03473a95971Ba0496786a615e21b1e87bDFf0025",
      routerAddress: ROUTER_ADDRESS,
      satellites: [
        {
          id: "sepolia",
          address: "0xabc",
          chain: { name: "Sepolia", endpoint: "https://rpc.sepolia.org" },
          evmChainId: 11155111,
        },
      ],
    });

    const raw = await tool.invoke(
      JSON.stringify({
        direction: "hub_to_satellite",
        satelliteChainName: "Sepolia",
        amount: "1000",
      }),
    );
    const result = JSON.parse(raw);

    expect(result.success).toBe(true);
    expect(result.data.mode).toBe("offline");
    expect(result.data.routerState).toBeNull();
  });
});
