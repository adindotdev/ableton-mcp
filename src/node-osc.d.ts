// Copyright (c) 2026 Adin Kwok <adin@adin.dev>

declare module "node-osc" {
  import { EventEmitter } from "node:events";

  type OSCArg = string | number | boolean;

  class Client {
    constructor(host: string, port: number);
    send(address: string, ...args: [...OSCArg[], () => void]): void;
    send(address: string, ...args: OSCArg[]): void;
    close(cb?: () => void): void;
  }

  class Server extends EventEmitter {
    constructor(port: number, host?: string, cb?: () => void);
    close(cb?: () => void): void;
  }

  class Message {
    oscType: string;
    address: string;
    args: unknown[];
    constructor(address: string, ...args: OSCArg[]);
    append(arg: OSCArg): void;
  }

  export { Client, Server, Message, OSCArg };
}
