/**
 * WebSocket client for real-time Obidot agent event subscriptions.
 *
 * Connects to an agent WebSocket server (e.g. the `obidot/agent` module
 * which broadcasts events on `ws://localhost:3011/ws`) and exposes a
 * simple event-driven API with automatic reconnect.
 */

// ─────────────────────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A structured event broadcast by the Obidot agent over WebSocket.
 *
 * All events carry at minimum a `type` string and a `timestamp` (Unix ms).
 * Additional fields are event-specific.
 */
export interface ObiWsEvent {
  /** Event type identifier, e.g. `"cycle_start"`, `"decision"`, `"execution"`. */
  readonly type: string;
  /** Unix timestamp in milliseconds when the event was emitted. */
  readonly timestamp: number;
  /** Additional event-specific payload fields. */
  readonly [key: string]: unknown;
}

/**
 * Configuration options for {@link ObiWsClient}.
 */
export interface ObiWsClientOptions {
  /**
   * Full WebSocket URL to connect to.
   *
   * @example `"ws://localhost:3011/ws"` — local agent
   * @example `"wss://agent.obidot.io/ws"` — production
   */
  readonly url: string;

  /**
   * Milliseconds to wait before attempting a reconnect after an
   * unexpected disconnect.
   *
   * @default 3_000
   */
  readonly reconnectIntervalMs?: number;

  /**
   * Maximum number of reconnect attempts before giving up.
   * Set to `0` to disable reconnecting.
   *
   * @default 10
   */
  readonly maxReconnectAttempts?: number;

  /**
   * Called for every event received from the server.
   * Parse errors are swallowed — only valid JSON objects trigger this.
   */
  readonly onEvent?: (event: ObiWsEvent) => void;

  /** Called when the connection is established (or re-established). */
  readonly onConnect?: () => void;

  /** Called when the connection is closed (cleanly or via error). */
  readonly onDisconnect?: () => void;

  /** Called when a connection error occurs. */
  readonly onError?: (error: Error) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
//  ObiWsClient
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lightweight WebSocket client for subscribing to real-time Obidot agent events.
 *
 * Features:
 * - Automatic reconnect with configurable backoff interval and attempt limit
 * - JSON event parsing with graceful handling of malformed messages
 * - Clean `disconnect()` that cancels any pending reconnect
 * - Works in both browser (`globalThis.WebSocket`) and Node.js (≥ 21 or with `ws` polyfill)
 *
 * @example
 * ```ts
 * import { ObiWsClient } from '@obidot-kit/core';
 *
 * const client = new ObiWsClient({
 *   url: 'ws://localhost:3011/ws',
 *   onEvent: (event) => console.log('[agent]', event.type, event),
 *   onConnect: () => console.log('Connected'),
 *   onDisconnect: () => console.log('Disconnected'),
 * });
 *
 * client.connect();
 *
 * // Later:
 * client.disconnect();
 * ```
 */
export class ObiWsClient {
  private ws: WebSocket | null = null;
  private reconnectCount = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionallyClosed = false;

  private readonly url: string;
  private readonly reconnectIntervalMs: number;
  private readonly maxReconnectAttempts: number;
  private readonly onEvent?: (event: ObiWsEvent) => void;
  private readonly onConnect?: () => void;
  private readonly onDisconnect?: () => void;
  private readonly onError?: (error: Error) => void;

  constructor(options: ObiWsClientOptions) {
    this.url = options.url;
    this.reconnectIntervalMs = options.reconnectIntervalMs ?? 3_000;
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 10;
    this.onEvent = options.onEvent;
    this.onConnect = options.onConnect;
    this.onDisconnect = options.onDisconnect;
    this.onError = options.onError;
  }

  // ── Public API ────────────────────────────────────────────────────────

  /**
   * Opens the WebSocket connection.
   *
   * Safe to call multiple times — if already connected, this is a no-op.
   */
  connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return; // Already connected
    }
    this.intentionallyClosed = false;
    this.openSocket();
  }

  /**
   * Cleanly closes the WebSocket connection and cancels any pending
   * reconnect timer.
   *
   * After calling `disconnect()`, no further reconnect attempts will
   * be made until `connect()` is called again.
   */
  disconnect(): void {
    this.intentionallyClosed = true;
    this.clearReconnectTimer();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Returns `true` when the underlying WebSocket is in the `OPEN` state.
   */
  get connected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Returns the number of reconnect attempts made since the last
   * successful connection.
   */
  get reconnectAttempts(): number {
    return this.reconnectCount;
  }

  /**
   * Sends a message to the server.
   *
   * The `data` argument is serialised to JSON. Throws if the socket
   * is not currently open.
   *
   * @throws {Error} When the socket is not connected.
   */
  send(data: unknown): void {
    const socket = this.ws;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      throw new Error('ObiWsClient: cannot send — socket is not connected');
    }
    socket.send(JSON.stringify(data));
  }

  // ── Internal helpers ──────────────────────────────────────────────────

  private openSocket(): void {
    try {
      // Use the global WebSocket (browser or Node ≥ 21 / ws polyfill)
      const WS = (globalThis as { WebSocket?: typeof WebSocket }).WebSocket;
      if (!WS) {
        const err = new Error(
          'ObiWsClient: WebSocket is not available in this environment. ' +
            'In Node.js < 21 install the `ws` package and assign it to `globalThis.WebSocket`.',
        );
        this.onError?.(err);
        return;
      }
      this.ws = new WS(this.url);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.onError?.(error);
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectCount = 0;
      this.onConnect?.();
    };

    this.ws.onmessage = (event: MessageEvent) => {
      this.handleMessage(event.data as string);
    };

    this.ws.onclose = () => {
      this.ws = null;
      this.onDisconnect?.();
      if (!this.intentionallyClosed) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      // The browser fires onclose after onerror, so we only need to
      // notify via onError here — reconnect is handled in onclose.
      this.onError?.(new Error(`ObiWsClient: WebSocket error connecting to ${this.url}`));
    };
  }

  private handleMessage(raw: string): void {
    if (!this.onEvent) return;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null && 'type' in parsed) {
        this.onEvent(parsed as ObiWsEvent);
      }
    } catch {
      // Silently ignore unparseable messages
    }
  }

  private scheduleReconnect(): void {
    if (this.maxReconnectAttempts === 0) return;
    if (this.reconnectCount >= this.maxReconnectAttempts) {
      this.onError?.(
        new Error(`ObiWsClient: max reconnect attempts (${this.maxReconnectAttempts}) reached for ${this.url}`),
      );
      return;
    }

    this.reconnectCount++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.intentionallyClosed) {
        this.openSocket();
      }
    }, this.reconnectIntervalMs);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
