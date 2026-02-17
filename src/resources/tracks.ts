// Copyright (c) 2026 Adin Kwok <adin@adin.dev>

import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AbletonOSC } from "../osc-client.js";

export function registerTrackResources(server: McpServer, osc: AbletonOSC) {
  server.resource(
    "track",
    new ResourceTemplate("ableton://track/{trackIndex}", {
      list: async () => {
        const [numTracks] = await osc.query("/live/song/get/num_tracks");
        const resources: { uri: string; name: string }[] = [];
        for (let i = 0; i < (numTracks as number); i++) {
          const [name] = await osc.query("/live/track/get/name", i);
          resources.push({ uri: `ableton://track/${i}`, name: name as string });
        }
        return { resources };
      },
    }),
    { description: "Ableton track details", mimeType: "application/json" },
    async (uri, { trackIndex }) => {
      const idx = Number(trackIndex);
      const [name] = await osc.query("/live/track/get/name", idx);
      const [volume] = await osc.query("/live/track/get/volume", idx);
      const [pan] = await osc.query("/live/track/get/panning", idx);
      const [mute] = await osc.query("/live/track/get/mute", idx);
      const [solo] = await osc.query("/live/track/get/solo", idx);
      const [arm] = await osc.query("/live/track/get/arm", idx);

      const track = {
        index: idx,
        name,
        volume,
        pan,
        mute: !!mute,
        solo: !!solo,
        arm: !!arm,
      };

      return {
        contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(track, null, 2) }],
      };
    },
  );
}
