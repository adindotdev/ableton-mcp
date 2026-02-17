// Copyright (c) 2026 Adin Kwok <adin@adin.dev>

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AbletonOSC } from "../osc-client.js";

const trackIndex = z.number().int().min(0).describe("Track index");

export function registerMixerTools(server: McpServer, osc: AbletonOSC) {
  server.tool(
    "get_track_mixer",
    "Get mixer state for a track (volume, pan, mute, solo, arm)",
    { trackIndex },
    async ({ trackIndex }) => {
      const [volume] = await osc.query("/live/track/get/volume", trackIndex);
      const [pan] = await osc.query("/live/track/get/panning", trackIndex);
      const [mute] = await osc.query("/live/track/get/mute", trackIndex);
      const [solo] = await osc.query("/live/track/get/solo", trackIndex);
      const [arm] = await osc.query("/live/track/get/arm", trackIndex);

      const state = {
        trackIndex,
        volume,
        pan,
        mute: !!mute,
        solo: !!solo,
        arm: !!arm,
      };

      return { content: [{ type: "text", text: JSON.stringify(state, null, 2) }] };
    },
  );

  server.tool(
    "set_track_volume",
    "Set track volume (0.0 = -inf dB, 0.85 = 0 dB, 1.0 = +6 dB)",
    {
      trackIndex,
      volume: z.number().min(0).max(1).describe("Volume level (0.0 to 1.0)"),
    },
    async ({ trackIndex, volume }) => {
      osc.send("/live/track/set/volume", trackIndex, volume);
      return { content: [{ type: "text", text: `Track ${trackIndex} volume set to ${volume}.` }] };
    },
  );

  server.tool(
    "set_track_pan",
    "Set track panning (-1.0 = full left, 0 = center, 1.0 = full right)",
    {
      trackIndex,
      pan: z.number().min(-1).max(1).describe("Pan position (-1.0 to 1.0)"),
    },
    async ({ trackIndex, pan }) => {
      osc.send("/live/track/set/panning", trackIndex, pan);
      return { content: [{ type: "text", text: `Track ${trackIndex} pan set to ${pan}.` }] };
    },
  );

  server.tool(
    "set_track_mute",
    "Mute or unmute a track",
    {
      trackIndex,
      mute: z.boolean().describe("true = muted, false = unmuted"),
    },
    async ({ trackIndex, mute }) => {
      osc.send("/live/track/set/mute", trackIndex, mute ? 1 : 0);
      return { content: [{ type: "text", text: `Track ${trackIndex} ${mute ? "muted" : "unmuted"}.` }] };
    },
  );

  server.tool(
    "set_track_solo",
    "Solo or unsolo a track",
    {
      trackIndex,
      solo: z.boolean().describe("true = soloed, false = unsoloed"),
    },
    async ({ trackIndex, solo }) => {
      osc.send("/live/track/set/solo", trackIndex, solo ? 1 : 0);
      return { content: [{ type: "text", text: `Track ${trackIndex} ${solo ? "soloed" : "unsoloed"}.` }] };
    },
  );

  server.tool(
    "set_track_arm",
    "Arm or disarm a track for recording",
    {
      trackIndex,
      arm: z.boolean().describe("true = armed, false = disarmed"),
    },
    async ({ trackIndex, arm }) => {
      osc.send("/live/track/set/arm", trackIndex, arm ? 1 : 0);
      return { content: [{ type: "text", text: `Track ${trackIndex} ${arm ? "armed" : "disarmed"}.` }] };
    },
  );

  server.tool(
    "set_track_send",
    "Set send level from a track to a return track",
    {
      trackIndex,
      sendIndex: z.number().int().min(0).describe("Send index (0 = Send A, 1 = Send B, etc.)"),
      level: z.number().min(0).max(1).describe("Send level (0.0 to 1.0)"),
    },
    async ({ trackIndex, sendIndex, level }) => {
      osc.send("/live/track/set/send", trackIndex, sendIndex, level);
      return {
        content: [{ type: "text", text: `Track ${trackIndex} send ${sendIndex} set to ${level}.` }],
      };
    },
  );
}
