// Copyright (c) 2026 Adin Kwok <adin@adin.dev>

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AbletonOSC } from "../osc-client.js";

const trackIndex = z.number().int().min(0).describe("Track index");
const clipIndex = z.number().int().min(0).describe("Clip slot / scene index");

export function registerClipTools(server: McpServer, osc: AbletonOSC) {
  server.tool(
    "fire_clip",
    "Launch a clip by track and scene index",
    { trackIndex, clipIndex },
    async ({ trackIndex, clipIndex }) => {
      osc.send("/live/clip/fire", trackIndex, clipIndex);
      return { content: [{ type: "text", text: `Clip fired: track ${trackIndex}, scene ${clipIndex}.` }] };
    },
  );

  server.tool(
    "stop_clip",
    "Stop a clip by track and scene index",
    { trackIndex, clipIndex },
    async ({ trackIndex, clipIndex }) => {
      osc.send("/live/clip/stop", trackIndex, clipIndex);
      return { content: [{ type: "text", text: `Clip stopped: track ${trackIndex}, scene ${clipIndex}.` }] };
    },
  );

  server.tool(
    "stop_all_clips",
    "Stop all playing clips in the session",
    {},
    async () => {
      osc.send("/live/song/stop_all_clips");
      return { content: [{ type: "text", text: "All clips stopped." }] };
    },
  );

  server.tool(
    "fire_scene",
    "Launch an entire scene",
    { sceneIndex: z.number().int().min(0).describe("Scene index") },
    async ({ sceneIndex }) => {
      osc.send("/live/scene/fire", sceneIndex);
      return { content: [{ type: "text", text: `Scene ${sceneIndex} fired.` }] };
    },
  );

  server.tool(
    "create_clip",
    "Create a new MIDI clip in a clip slot",
    {
      trackIndex,
      clipIndex,
      lengthBeats: z.number().min(0.25).describe("Clip length in beats (e.g. 4 = one bar at 4/4)"),
    },
    async ({ trackIndex, clipIndex, lengthBeats }) => {
      osc.send("/live/clip_slot/create_clip", trackIndex, clipIndex, lengthBeats);
      return {
        content: [{
          type: "text",
          text: `MIDI clip created: track ${trackIndex}, scene ${clipIndex}, ${lengthBeats} beats.`,
        }],
      };
    },
  );

  server.tool(
    "delete_clip",
    "Delete a clip from a clip slot",
    { trackIndex, clipIndex },
    async ({ trackIndex, clipIndex }) => {
      osc.send("/live/clip_slot/delete_clip", trackIndex, clipIndex);
      return { content: [{ type: "text", text: `Clip deleted: track ${trackIndex}, scene ${clipIndex}.` }] };
    },
  );

  server.tool(
    "get_clip_info",
    "Get clip properties (name, length, looping, etc.)",
    { trackIndex, clipIndex },
    async ({ trackIndex, clipIndex }) => {
      const [name] = await osc.query("/live/clip/get/name", trackIndex, clipIndex);
      const [length] = await osc.query("/live/clip/get/length", trackIndex, clipIndex);
      const [isLooping] = await osc.query("/live/clip/get/looping", trackIndex, clipIndex);
      const [isPlaying] = await osc.query("/live/clip/get/is_playing", trackIndex, clipIndex);
      const [isAudio] = await osc.query("/live/clip/get/is_audio_clip", trackIndex, clipIndex);

      const info: Record<string, unknown> = {
        trackIndex,
        clipIndex,
        name,
        length,
        looping: !!isLooping,
        playing: !!isPlaying,
        isAudio: !!isAudio,
      };

      if (isAudio) {
        try {
          const [filePath] = await osc.query("/live/clip/get/file_path", trackIndex, clipIndex);
          if (filePath) info.filePath = filePath;
        } catch {
          // file_path may not be available for all audio clips
        }
      }

      return { content: [{ type: "text", text: JSON.stringify(info, null, 2) }] };
    },
  );

  server.tool(
    "set_clip_name",
    "Rename a clip",
    {
      trackIndex,
      clipIndex,
      name: z.string().min(1).describe("New clip name"),
    },
    async ({ trackIndex, clipIndex, name }) => {
      osc.send("/live/clip/set/name", trackIndex, clipIndex, name);
      return { content: [{ type: "text", text: `Clip renamed to "${name}".` }] };
    },
  );

  server.tool(
    "get_clip_notes",
    "Get all MIDI notes from a clip. Returns pitch, start (beats), duration (beats), velocity, mute for each note.",
    { trackIndex, clipIndex },
    async ({ trackIndex, clipIndex }) => {
      const result = await osc.query("/live/clip/get/notes", trackIndex, clipIndex);
      // AbletonOSC returns notes as a flat array: [pitch, start, duration, velocity, mute, pitch, start, ...]
      const notes: { pitch: number; start: number; duration: number; velocity: number; mute: boolean }[] = [];
      for (let i = 0; i < result.length; i += 5) {
        notes.push({
          pitch: result[i] as number,
          start: result[i + 1] as number,
          duration: result[i + 2] as number,
          velocity: result[i + 3] as number,
          mute: !!(result[i + 4]),
        });
      }

      return { content: [{ type: "text", text: JSON.stringify(notes, null, 2) }] };
    },
  );

  server.tool(
    "add_clip_notes",
    "Add MIDI notes to a clip. Each note needs pitch (0-127), start (beats), duration (beats), velocity (1-127).",
    {
      trackIndex,
      clipIndex,
      notes: z.array(z.object({
        pitch: z.number().int().min(0).max(127).describe("MIDI note number (60 = C3)"),
        start: z.number().min(0).describe("Start position in beats"),
        duration: z.number().min(0.01).describe("Note duration in beats"),
        velocity: z.number().int().min(1).max(127).describe("Note velocity"),
      })).min(1).describe("Array of MIDI notes to add"),
    },
    async ({ trackIndex, clipIndex, notes }) => {
      // AbletonOSC expects: /live/clip/add/notes track clip [pitch start duration velocity mute ...]
      const flat: number[] = [];
      for (const note of notes) {
        flat.push(note.pitch, note.start, note.duration, note.velocity, 0);
      }
      osc.send("/live/clip/add/notes", trackIndex, clipIndex, ...flat);
      return { content: [{ type: "text", text: `Added ${notes.length} note(s) to clip.` }] };
    },
  );

  server.tool(
    "remove_clip_notes",
    "Remove MIDI notes from a region of a clip",
    {
      trackIndex,
      clipIndex,
      startBeat: z.number().min(0).describe("Start of region in beats"),
      spanBeats: z.number().min(0.01).describe("Length of region in beats"),
      pitchMin: z.number().int().min(0).max(127).describe("Lowest pitch to remove"),
      pitchMax: z.number().int().min(0).max(127).describe("Highest pitch to remove"),
    },
    async ({ trackIndex, clipIndex, startBeat, spanBeats, pitchMin, pitchMax }) => {
      osc.send(
        "/live/clip/remove/notes",
        trackIndex, clipIndex,
        startBeat, spanBeats,
        pitchMin, pitchMax - pitchMin + 1,
      );
      return {
        content: [{
          type: "text",
          text: `Removed notes from beat ${startBeat}–${startBeat + spanBeats}, pitch ${pitchMin}–${pitchMax}.`,
        }],
      };
    },
  );
}
