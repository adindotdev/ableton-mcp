// Copyright (c) 2026 Adin Kwok <adin@adin.dev>

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AbletonOSC } from "../osc-client.js";

export function registerTrackTools(server: McpServer, osc: AbletonOSC) {
  server.tool(
    "get_track_names",
    "List all track names in the session",
    {},
    async () => {
      const [numTracks] = await osc.query("/live/song/get/num_tracks");
      const names: string[] = [];
      for (let i = 0; i < (numTracks as number); i++) {
        const [name] = await osc.query("/live/track/get/name", i);
        names.push(name as string);
      }
      return {
        content: [{ type: "text", text: names.map((n, i) => `${i}: ${n}`).join("\n") }],
      };
    },
  );

  server.tool(
    "get_track_info",
    "Get detailed info for a single track",
    { trackIndex: z.number().int().min(0).describe("Track index") },
    async ({ trackIndex }) => {
      const [name] = await osc.query("/live/track/get/name", trackIndex);
      const [volume] = await osc.query("/live/track/get/volume", trackIndex);
      const [pan] = await osc.query("/live/track/get/panning", trackIndex);
      const [mute] = await osc.query("/live/track/get/mute", trackIndex);
      const [solo] = await osc.query("/live/track/get/solo", trackIndex);
      const [arm] = await osc.query("/live/track/get/arm", trackIndex);

      const info = {
        index: trackIndex,
        name,
        volume,
        pan,
        mute: !!mute,
        solo: !!solo,
        arm: !!arm,
      };

      return { content: [{ type: "text", text: JSON.stringify(info, null, 2) }] };
    },
  );

  server.tool(
    "create_midi_track",
    "Create a new MIDI track",
    {
      index: z.number().int().min(-1).describe("Insert position (-1 = end)"),
    },
    async ({ index }) => {
      osc.send("/live/song/create_midi_track", index);
      return { content: [{ type: "text", text: `MIDI track created at index ${index === -1 ? "end" : index}.` }] };
    },
  );

  server.tool(
    "create_audio_track",
    "Create a new audio track",
    {
      index: z.number().int().min(-1).describe("Insert position (-1 = end)"),
    },
    async ({ index }) => {
      osc.send("/live/song/create_audio_track", index);
      return { content: [{ type: "text", text: `Audio track created at index ${index === -1 ? "end" : index}.` }] };
    },
  );

  server.tool(
    "delete_track",
    "Delete a track by index",
    { trackIndex: z.number().int().min(0).describe("Track index to delete") },
    async ({ trackIndex }) => {
      osc.send("/live/song/delete_track", trackIndex);
      return { content: [{ type: "text", text: `Track ${trackIndex} deleted.` }] };
    },
  );

  server.tool(
    "rename_track",
    "Rename a track",
    {
      trackIndex: z.number().int().min(0).describe("Track index"),
      name: z.string().min(1).describe("New track name"),
    },
    async ({ trackIndex, name }) => {
      osc.send("/live/track/set/name", trackIndex, name);
      return { content: [{ type: "text", text: `Track ${trackIndex} renamed to "${name}".` }] };
    },
  );

  server.tool(
    "duplicate_track",
    "Duplicate a track",
    { trackIndex: z.number().int().min(0).describe("Track index to duplicate") },
    async ({ trackIndex }) => {
      osc.send("/live/song/duplicate_track", trackIndex);
      return { content: [{ type: "text", text: `Track ${trackIndex} duplicated.` }] };
    },
  );
}
