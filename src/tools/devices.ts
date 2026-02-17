// Copyright (c) 2026 Adin Kwok <adin@adin.dev>

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AbletonOSC } from "../osc-client.js";

const trackIndex = z.number().int().min(0).describe("Track index");
const deviceIndex = z.number().int().min(0).describe("Device index on the track");

export function registerDeviceTools(server: McpServer, osc: AbletonOSC) {
  server.tool(
    "get_track_devices",
    "List all devices on a track with their names and types",
    { trackIndex },
    async ({ trackIndex }) => {
      const names = await osc.query("/live/track/get/devices/name", trackIndex);
      const types = await osc.query("/live/track/get/devices/type", trackIndex);

      const devices = names.map((name, i) => ({
        index: i,
        name,
        type: types[i],
      }));

      return { content: [{ type: "text", text: JSON.stringify(devices, null, 2) }] };
    },
  );

  server.tool(
    "get_device_parameters",
    "Get all parameters for a device with their names, values, and ranges",
    { trackIndex, deviceIndex },
    async ({ trackIndex, deviceIndex }) => {
      const names = await osc.query("/live/device/get/parameters/name", trackIndex, deviceIndex);
      const values = await osc.query("/live/device/get/parameters/value", trackIndex, deviceIndex);
      const mins = await osc.query("/live/device/get/parameters/min", trackIndex, deviceIndex);
      const maxes = await osc.query("/live/device/get/parameters/max", trackIndex, deviceIndex);

      const params = names.map((name, i) => ({
        index: i,
        name,
        value: values[i],
        min: mins[i],
        max: maxes[i],
      }));

      return { content: [{ type: "text", text: JSON.stringify(params, null, 2) }] };
    },
  );

  server.tool(
    "set_device_parameter",
    "Set a device parameter value by index",
    {
      trackIndex,
      deviceIndex,
      paramIndex: z.number().int().min(0).describe("Parameter index"),
      value: z.number().describe("Parameter value (within the parameter's min/max range)"),
    },
    async ({ trackIndex, deviceIndex, paramIndex, value }) => {
      osc.send("/live/device/set/parameter/value", trackIndex, deviceIndex, paramIndex, value);
      return {
        content: [{
          type: "text",
          text: `Device ${deviceIndex} parameter ${paramIndex} set to ${value}.`,
        }],
      };
    },
  );
}
