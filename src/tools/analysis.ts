// Copyright (c) 2026 Adin Kwok <adin@adin.dev>

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AbletonOSC } from "../osc-client.js";

interface ClipSnapshot {
  sceneIndex: number;
  name: string;
  length: number;
  looping: boolean;
  isAudio: boolean;
  filePath?: string;
  notes?: { pitch: number; start: number; duration: number; velocity: number }[];
}

interface DeviceSnapshot {
  name: string;
  type: number;
  params: { name: string; value: number; min: number; max: number }[];
}

interface TrackSnapshot {
  index: number;
  name: string;
  type: "midi" | "audio" | "unknown";
  mixer: { volume: number; pan: number; mute: boolean; solo: boolean; arm: boolean };
  devices: DeviceSnapshot[];
  clips: ClipSnapshot[];
}

interface SessionSnapshot {
  tempo: number;
  timeSignature: { numerator: number; denominator: number };
  numScenes: number;
  tracks: TrackSnapshot[];
}

export function registerAnalysisTools(server: McpServer, osc: AbletonOSC) {
  server.tool(
    "analyze_session",
    "Get a complete snapshot of the entire Ableton session in one call — all tracks, devices with parameters, mixer state, clip grid, MIDI notes, and audio file paths. Use this instead of querying tracks individually.",
    {},
    async () => {
      const [tempo] = await osc.query("/live/song/get/tempo");
      const [numerator] = await osc.query("/live/song/get/signature_numerator");
      const [denominator] = await osc.query("/live/song/get/signature_denominator");
      const [numTracks] = await osc.query("/live/song/get/num_tracks");
      const [numScenes] = await osc.query("/live/song/get/num_scenes");

      const tracks: TrackSnapshot[] = [];

      for (let t = 0; t < (numTracks as number); t++) {
        // Track name
        const [name] = await osc.query("/live/track/get/name", t);

        // Mixer state
        const [volume] = await osc.query("/live/track/get/volume", t);
        const [pan] = await osc.query("/live/track/get/panning", t);
        const [mute] = await osc.query("/live/track/get/mute", t);
        const [solo] = await osc.query("/live/track/get/solo", t);
        const [arm] = await osc.query("/live/track/get/arm", t);

        // Devices
        const deviceNames = await osc.query("/live/track/get/devices/name", t);
        const deviceTypes = await osc.query("/live/track/get/devices/type", t);

        const devices: DeviceSnapshot[] = [];
        for (let d = 0; d < deviceNames.length; d++) {
          const paramNames = await osc.query("/live/device/get/parameters/name", t, d);
          const paramValues = await osc.query("/live/device/get/parameters/value", t, d);
          const paramMins = await osc.query("/live/device/get/parameters/min", t, d);
          const paramMaxes = await osc.query("/live/device/get/parameters/max", t, d);

          const params: DeviceSnapshot["params"] = [];
          for (let p = 0; p < paramNames.length; p++) {
            const value = paramValues[p] as number;
            const min = paramMins[p] as number;
            // Skip params sitting at their minimum (likely default/off)
            if (value === min) continue;
            params.push({
              name: paramNames[p] as string,
              value,
              min,
              max: paramMaxes[p] as number,
            });
          }

          devices.push({
            name: deviceNames[d] as string,
            type: deviceTypes[d] as number,
            params,
          });
        }

        // Clips — scan all scenes for this track
        const clips: ClipSnapshot[] = [];
        let trackType: "midi" | "audio" | "unknown" = "unknown";

        for (let s = 0; s < (numScenes as number); s++) {
          const [hasClip] = await osc.query("/live/clip_slot/get/has_clip", t, s);
          if (!hasClip) continue;

          const [clipName] = await osc.query("/live/clip/get/name", t, s);
          const [clipLength] = await osc.query("/live/clip/get/length", t, s);
          const [clipLooping] = await osc.query("/live/clip/get/looping", t, s);
          const [isAudio] = await osc.query("/live/clip/get/is_audio_clip", t, s);

          const clip: ClipSnapshot = {
            sceneIndex: s,
            name: clipName as string,
            length: clipLength as number,
            looping: !!clipLooping,
            isAudio: !!isAudio,
          };

          if (isAudio) {
            trackType = "audio";
            try {
              const [filePath] = await osc.query("/live/clip/get/file_path", t, s);
              if (filePath) clip.filePath = filePath as string;
            } catch {
              // file_path may not be available for all audio clips
            }
          } else {
            trackType = "midi";
            const noteData = await osc.query("/live/clip/get/notes", t, s);
            if (noteData.length > 0) {
              const notes: ClipSnapshot["notes"] = [];
              for (let i = 0; i < noteData.length; i += 5) {
                notes.push({
                  pitch: noteData[i] as number,
                  start: noteData[i + 1] as number,
                  duration: noteData[i + 2] as number,
                  velocity: noteData[i + 3] as number,
                });
              }
              clip.notes = notes;
            }
          }

          clips.push(clip);
        }

        tracks.push({
          index: t,
          name: name as string,
          type: trackType,
          mixer: {
            volume: volume as number,
            pan: pan as number,
            mute: !!mute,
            solo: !!solo,
            arm: !!arm,
          },
          devices,
          clips,
        });
      }

      const snapshot: SessionSnapshot = {
        tempo: tempo as number,
        timeSignature: {
          numerator: numerator as number,
          denominator: denominator as number,
        },
        numScenes: numScenes as number,
        tracks,
      };

      return { content: [{ type: "text", text: JSON.stringify(snapshot, null, 2) }] };
    },
  );
}
