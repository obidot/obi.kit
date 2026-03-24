import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ObiWsClient, type ObiWsEvent } from '../src/ws.js';

// ─────────────────────────────────────────────────────────────────────────────
//  Mock WebSocket
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Minimal mock WebSocket that tracks calls and lets tests drive lifecycle
 * events (open, message, close, error) synchronously.
 */
class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;

  readyState: number = MockWebSocket.OPEN;
  sentMessages: string[] = [];

  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(public url: string) {}

  send(data: string): void {
    this.sentMessages.push(data);
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }

  // Test helpers
  simulateOpen(): void {
    this.onopen?.();
  }

  simulateMessage(data: string): void {
    this.onmessage?.({ data });
  }

  simulateClose(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }

  simulateError(): void {
    this.onerror?.();
    this.simulateClose();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────────

let latestMock: MockWebSocket | null = null;

function getLatestMock(): MockWebSocket {
  if (!latestMock) {
    throw new Error('Expected mock WebSocket to be created');
  }
  return latestMock;
}

function installMockWebSocket(): void {
  (globalThis as Record<string, unknown>).WebSocket = class extends MockWebSocket {
    constructor(url: string) {
      super(url);
      latestMock = this;
    }
  };
  (globalThis.WebSocket as unknown as typeof MockWebSocket).OPEN = MockWebSocket.OPEN;
  (globalThis.WebSocket as unknown as typeof MockWebSocket).CLOSED = MockWebSocket.CLOSED;
}

function removeMockWebSocket(): void {
  delete (globalThis as Record<string, unknown>).WebSocket;
  latestMock = null;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('ObiWsClient', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    installMockWebSocket();
  });

  afterEach(() => {
    vi.useRealTimers();
    removeMockWebSocket();
  });

  describe('construction', () => {
    it('should create with required url option', () => {
      const client = new ObiWsClient({ url: 'ws://localhost:3011/ws' });
      expect(client.connected).toBe(false);
      expect(client.reconnectAttempts).toBe(0);
    });

    it('should not be connected before connect() is called', () => {
      const client = new ObiWsClient({ url: 'ws://localhost:3011/ws' });
      expect(client.connected).toBe(false);
    });
  });

  describe('connect()', () => {
    it('should open a WebSocket to the configured url', () => {
      const client = new ObiWsClient({ url: 'ws://localhost:3011/ws' });
      client.connect();
      expect(latestMock).not.toBeNull();
      expect(getLatestMock().url).toBe('ws://localhost:3011/ws');
    });

    it('should call onConnect when connection opens', () => {
      const onConnect = vi.fn();
      const client = new ObiWsClient({
        url: 'ws://localhost:3011/ws',
        onConnect,
      });
      client.connect();
      getLatestMock().simulateOpen();
      expect(onConnect).toHaveBeenCalledOnce();
    });

    it('should report connected=true after open', () => {
      const client = new ObiWsClient({ url: 'ws://localhost:3011/ws' });
      client.connect();
      getLatestMock().simulateOpen();
      expect(client.connected).toBe(true);
    });

    it('should reset reconnectAttempts to 0 after successful open', () => {
      const client = new ObiWsClient({
        url: 'ws://localhost:3011/ws',
        reconnectIntervalMs: 100,
      });
      client.connect();
      getLatestMock().simulateOpen();
      getLatestMock().simulateClose(); // triggers reconnect
      vi.advanceTimersByTime(150);
      const newMock = getLatestMock();
      newMock.simulateOpen();
      expect(client.reconnectAttempts).toBe(0);
    });

    it('should be a no-op if already connected', () => {
      const client = new ObiWsClient({ url: 'ws://localhost:3011/ws' });
      client.connect();
      const firstMock = latestMock;
      getLatestMock().simulateOpen();
      client.connect(); // second call — should not open another socket
      expect(latestMock).toBe(firstMock);
    });
  });

  describe('disconnect()', () => {
    it('should close the WebSocket', () => {
      const client = new ObiWsClient({ url: 'ws://localhost:3011/ws' });
      client.connect();
      getLatestMock().simulateOpen();
      client.disconnect();
      expect(client.connected).toBe(false);
    });

    it('should call onDisconnect when closed', () => {
      const onDisconnect = vi.fn();
      const client = new ObiWsClient({
        url: 'ws://localhost:3011/ws',
        onDisconnect,
      });
      client.connect();
      getLatestMock().simulateOpen();
      client.disconnect();
      expect(onDisconnect).toHaveBeenCalled();
    });

    it('should not trigger a reconnect after intentional disconnect', () => {
      const onConnect = vi.fn();
      const client = new ObiWsClient({
        url: 'ws://localhost:3011/ws',
        onConnect,
        reconnectIntervalMs: 100,
        maxReconnectAttempts: 5,
      });
      client.connect();
      getLatestMock().simulateOpen();
      client.disconnect();
      vi.advanceTimersByTime(1_000);
      // onConnect was called once on initial open; no re-opens after disconnect
      expect(onConnect).toHaveBeenCalledOnce();
    });

    it('should be a no-op when not connected', () => {
      const client = new ObiWsClient({ url: 'ws://localhost:3011/ws' });
      expect(() => client.disconnect()).not.toThrow();
    });
  });

  describe('event handling', () => {
    it('should call onEvent for valid JSON messages with a type field', () => {
      const events: ObiWsEvent[] = [];
      const client = new ObiWsClient({
        url: 'ws://localhost:3011/ws',
        onEvent: (e) => events.push(e),
      });
      client.connect();
      getLatestMock().simulateOpen();
      getLatestMock().simulateMessage(JSON.stringify({ type: 'cycle_start', timestamp: 1000 }));
      expect(events).toHaveLength(1);
      expect(events[0]?.type).toBe('cycle_start');
      expect(events[0]?.timestamp).toBe(1000);
    });

    it('should ignore non-JSON messages silently', () => {
      const onError = vi.fn();
      const client = new ObiWsClient({
        url: 'ws://localhost:3011/ws',
        onError,
      });
      client.connect();
      getLatestMock().simulateOpen();
      expect(() => getLatestMock().simulateMessage('not valid json')).not.toThrow();
      // onError not called for parse errors
      expect(onError).not.toHaveBeenCalled();
    });

    it('should ignore JSON messages without a type field', () => {
      const events: ObiWsEvent[] = [];
      const client = new ObiWsClient({
        url: 'ws://localhost:3011/ws',
        onEvent: (e) => events.push(e),
      });
      client.connect();
      getLatestMock().simulateOpen();
      getLatestMock().simulateMessage(JSON.stringify({ no_type: true }));
      expect(events).toHaveLength(0);
    });

    it('should call onDisconnect when server closes the connection', () => {
      const onDisconnect = vi.fn();
      const client = new ObiWsClient({
        url: 'ws://localhost:3011/ws',
        onDisconnect,
        maxReconnectAttempts: 0, // disable reconnect for this test
      });
      client.connect();
      getLatestMock().simulateOpen();
      getLatestMock().simulateClose();
      expect(onDisconnect).toHaveBeenCalledOnce();
    });

    it('should call onError on a WebSocket error', () => {
      const onError = vi.fn();
      const client = new ObiWsClient({
        url: 'ws://localhost:3011/ws',
        onError,
        maxReconnectAttempts: 0,
      });
      client.connect();
      getLatestMock().simulateError();
      expect(onError).toHaveBeenCalledOnce();
    });
  });

  describe('send()', () => {
    it('should serialise data as JSON and send it', () => {
      const client = new ObiWsClient({ url: 'ws://localhost:3011/ws' });
      client.connect();
      getLatestMock().simulateOpen();
      client.send({ action: 'ping' });
      const sentMessages = getLatestMock().sentMessages;
      expect(sentMessages).toHaveLength(1);
      expect(JSON.parse(sentMessages[0] ?? 'null')).toEqual({
        action: 'ping',
      });
    });

    it('should throw when the socket is not connected', () => {
      const client = new ObiWsClient({ url: 'ws://localhost:3011/ws' });
      expect(() => client.send({ action: 'ping' })).toThrow('not connected');
    });
  });

  describe('auto-reconnect', () => {
    it('should reconnect after an unexpected close', () => {
      const onConnect = vi.fn();
      const client = new ObiWsClient({
        url: 'ws://localhost:3011/ws',
        onConnect,
        reconnectIntervalMs: 500,
        maxReconnectAttempts: 3,
      });
      client.connect();
      getLatestMock().simulateOpen(); // 1st open
      getLatestMock().simulateClose(); // triggers reconnect
      vi.advanceTimersByTime(600);
      getLatestMock().simulateOpen(); // 2nd open (reconnect)
      expect(onConnect).toHaveBeenCalledTimes(2);
    });

    it('should increment reconnectAttempts on each attempt', () => {
      const client = new ObiWsClient({
        url: 'ws://localhost:3011/ws',
        reconnectIntervalMs: 100,
        maxReconnectAttempts: 3,
      });
      client.connect();
      getLatestMock().simulateOpen();
      getLatestMock().simulateClose();
      expect(client.reconnectAttempts).toBe(1);
      vi.advanceTimersByTime(150);
      getLatestMock().simulateClose();
      expect(client.reconnectAttempts).toBe(2);
    });

    it('should stop reconnecting after maxReconnectAttempts is reached', () => {
      const onError = vi.fn();
      const client = new ObiWsClient({
        url: 'ws://localhost:3011/ws',
        onError,
        reconnectIntervalMs: 100,
        maxReconnectAttempts: 2,
      });
      client.connect();
      getLatestMock().simulateOpen();
      getLatestMock().simulateClose(); // attempt 1
      vi.advanceTimersByTime(150);
      getLatestMock().simulateClose(); // attempt 2
      vi.advanceTimersByTime(150);
      getLatestMock().simulateClose(); // attempt 3 — exceeds max
      vi.advanceTimersByTime(150);
      // onError should be called with the "max attempts" error
      const errorCalls = onError.mock.calls.filter(([e]: [Error]) => e.message.includes('max reconnect'));
      expect(errorCalls.length).toBeGreaterThanOrEqual(1);
    });

    it('should not reconnect when maxReconnectAttempts is 0', () => {
      const onConnect = vi.fn();
      const client = new ObiWsClient({
        url: 'ws://localhost:3011/ws',
        onConnect,
        reconnectIntervalMs: 100,
        maxReconnectAttempts: 0,
      });
      client.connect();
      getLatestMock().simulateOpen();
      getLatestMock().simulateClose();
      vi.advanceTimersByTime(500);
      expect(onConnect).toHaveBeenCalledOnce(); // only the initial connection
    });
  });

  describe('missing WebSocket environment', () => {
    it('should call onError when WebSocket is not available', () => {
      removeMockWebSocket(); // remove global WebSocket
      const onError = vi.fn();
      const client = new ObiWsClient({
        url: 'ws://localhost:3011/ws',
        onError,
      });
      client.connect();
      expect(onError).toHaveBeenCalledOnce();
      expect(onError.mock.calls[0]?.[0].message).toContain('WebSocket is not available');
    });
  });
});
