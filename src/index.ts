// Copyright (c) 2026 Adin Kwok <adin@adin.dev>

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { AbletonOSC } from "./osc-client.js";
import { registerTransportTools } from "./tools/transport.js";
import { registerTrackTools } from "./tools/tracks.js";
import { registerMixerTools } from "./tools/mixer.js";
import { registerClipTools } from "./tools/clips.js";
import { registerDeviceTools } from "./tools/devices.js";
import { registerAnalysisTools } from "./tools/analysis.js";
import { registerSessionResource } from "./resources/session.js";
import { registerTrackResources } from "./resources/tracks.js";

async function main() {
  const osc = new AbletonOSC();

  const server = new McpServer({
    name: "ableton-mcp",
    version: "0.1.0",
  });

  registerTransportTools(server, osc);
  registerTrackTools(server, osc);
  registerMixerTools(server, osc);
  registerClipTools(server, osc);
  registerDeviceTools(server, osc);
  registerAnalysisTools(server, osc);
  registerSessionResource(server, osc);
  registerTrackResources(server, osc);

  await osc.connect();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("ableton-mcp: MCP server running");
}

main().catch((err) => {
  console.error("ableton-mcp: fatal error:", err);
  process.exit(1);
});
