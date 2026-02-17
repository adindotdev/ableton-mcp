// Copyright (c) 2026 Adin Kwok <adin@adin.dev>

import { readFileSync } from "node:fs";
import { Client, Server, type OSCArg } from "node-osc";

export type { OSCArg };

interface PendingQuery {
  resolve: (args: OSCArg[]) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

function getWSLHostIP(): string {
  try {
    const resolv = readFileSync("/etc/resolv.conf", "utf-8");
    const match = resolv.match(/nameserver\s+(\S+)/);
    if (match) return match[1];
  } catch {
    // Not running in WSL, fall through
  }
  return "127.0.0.1";
}

export class AbletonOSC {
  private client: Client | null = null;
  private server: Server | null = null;
  private pending = new Map<string, PendingQuery>();

  constructor(
    private host = getWSLHostIP(),
    private sendPort = 11000,
    private receivePort = 11001,
    private timeoutMs = 5000,
  ) {}

  async connect(): Promise<void> {
    this.client = new Client(this.host, this.sendPort);

    await new Promise<void>((resolve, reject) => {
      this.server = new Server(this.receivePort, "0.0.0.0", () => resolve());
      this.server.on("error", reject);
    });

    this.server!.on("message", (msg: OSCArg[]) => {
      const address = msg[0] as string;
      const args = msg.slice(1) as OSCArg[];
      const pending = this.pending.get(address);
      if (pending) {
        clearTimeout(pending.timer);
        this.pending.delete(address);
        pending.resolve(args);
      }
    });

    // Verify AbletonOSC is reachable
    try {
      await this.query("/live/test");
      console.error(`ableton-mcp: connected to AbletonOSC at ${this.host}:${this.sendPort}`);
    } catch {
      this.disconnect();
      throw new Error(
        `Could not reach AbletonOSC at ${this.host}:${this.sendPort}. ` +
        "Is Ableton Live running with AbletonOSC enabled?",
      );
    }
  }

  disconnect(): void {
    for (const [, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(new Error("OSC client disconnected"));
    }
    this.pending.clear();
    this.client?.close();
    this.server?.close();
    this.client = null;
    this.server = null;
  }

  query(address: string, ...args: OSCArg[]): Promise<OSCArg[]> {
    if (!this.client) throw new Error("OSC client not connected");

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(address);
        reject(new Error(`OSC query timed out: ${address}`));
      }, this.timeoutMs);

      this.pending.set(address, { resolve, reject, timer });
      this.client!.send(address, ...args);
    });
  }

  send(address: string, ...args: OSCArg[]): void {
    if (!this.client) throw new Error("OSC client not connected");
    this.client.send(address, ...args);
  }
}
