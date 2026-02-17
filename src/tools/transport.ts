// Copyright (c) 2026 Adin Kwok <adin@adin.dev>

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AbletonOSC } from "../osc-client.js";

export function registerTransportTools(server: McpServer, osc: AbletonOSC) {
  server.tool("transport_play", "Start Ableton Live playback", {}, async () => {
    osc.send("/live/song/start_playing");
    return { content: [{ type: "text", text: "Playback started." }] };
  });

  server.tool("transport_stop", "Stop Ableton Live playback", {}, async () => {
    osc.send("/live/song/stop_playing");
    return { content: [{ type: "text", text: "Playback stopped." }] };
  });

  server.tool("transport_continue", "Resume playback from current position", {}, async () => {
    osc.send("/live/song/continue_playing");
    return { content: [{ type: "text", text: "Playback resumed." }] };
  });

  server.tool(
    "get_tempo",
    "Get the current song tempo in BPM",
    {},
    async () => {
      const [bpm] = await osc.query("/live/song/get/tempo");
      return { content: [{ type: "text", text: `Current tempo: ${bpm} BPM` }] };
    },
  );

  server.tool(
    "set_tempo",
    "Set the song tempo in BPM",
    { bpm: z.number().min(20).max(999).describe("Tempo in BPM") },
    async ({ bpm }) => {
      osc.send("/live/song/set/tempo", bpm);
      return { content: [{ type: "text", text: `Tempo set to ${bpm} BPM.` }] };
    },
  );

  server.tool(
    "set_time_signature",
    "Set the song time signature",
    {
      numerator: z.number().int().min(1).max(99).describe("Beats per bar"),
      denominator: z.number().int().min(1).max(16).describe("Beat value (e.g. 4 = quarter note)"),
    },
    async ({ numerator, denominator }) => {
      osc.send("/live/song/set/signature_numerator", numerator);
      osc.send("/live/song/set/signature_denominator", denominator);
      return { content: [{ type: "text", text: `Time signature set to ${numerator}/${denominator}.` }] };
    },
  );

  server.tool(
    "toggle_metronome",
    "Turn the metronome on or off",
    { enabled: z.boolean().describe("true = on, false = off") },
    async ({ enabled }) => {
      osc.send("/live/song/set/metronome", enabled ? 1 : 0);
      return { content: [{ type: "text", text: `Metronome ${enabled ? "on" : "off"}.` }] };
    },
  );

  server.tool(
    "set_song_position",
    "Jump to a position in the song (in beats)",
    { beats: z.number().min(0).describe("Position in beats") },
    async ({ beats }) => {
      osc.send("/live/song/set/current_song_time", beats);
      return { content: [{ type: "text", text: `Song position set to beat ${beats}.` }] };
    },
  );

  server.tool("undo", "Undo the last action in Ableton", {}, async () => {
    osc.send("/live/song/undo");
    return { content: [{ type: "text", text: "Undo performed." }] };
  });

  server.tool("redo", "Redo the last undone action in Ableton", {}, async () => {
    osc.send("/live/song/redo");
    return { content: [{ type: "text", text: "Redo performed." }] };
  });
}
