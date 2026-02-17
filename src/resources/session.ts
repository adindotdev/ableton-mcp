// Copyright (c) 2026 Adin Kwok <adin@adin.dev>

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AbletonOSC } from "../osc-client.js";

export function registerSessionResource(server: McpServer, osc: AbletonOSC) {
  server.resource(
    "session",
    "ableton://session",
    { description: "Current Ableton session state", mimeType: "application/json" },
    async (uri) => {
      const [tempo] = await osc.query("/live/song/get/tempo");
      const [isPlaying] = await osc.query("/live/song/get/is_playing");
      const [numTracks] = await osc.query("/live/song/get/num_tracks");
      const [numScenes] = await osc.query("/live/song/get/num_scenes");
      const [sigNum] = await osc.query("/live/song/get/signature_numerator");
      const [sigDen] = await osc.query("/live/song/get/signature_denominator");
      const [songTime] = await osc.query("/live/song/get/current_song_time");
      const [metronome] = await osc.query("/live/song/get/metronome");

      const state = {
        tempo,
        isPlaying: !!isPlaying,
        numTracks,
        numScenes,
        timeSignature: `${sigNum}/${sigDen}`,
        currentPosition: songTime,
        metronome: !!metronome,
      };

      return {
        contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(state, null, 2) }],
      };
    },
  );
}
