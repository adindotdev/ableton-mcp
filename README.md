# ableton-mcp

An MCP server that lets Claude control Ableton Live. Talk to Claude about your session and it can play, stop, create tracks, write MIDI, tweak the mixer, and adjust device parameters — all in real time.

## How It Works

```
Claude Code  <--stdio-->  ableton-mcp  <--OSC/UDP-->  AbletonOSC  <-->  Ableton Live
```

This server speaks [MCP](https://modelcontextprotocol.io) over stdio to Claude, and [OSC](https://en.wikipedia.org/wiki/Open_Sound_Control) over UDP to Ableton. The bridge on the Ableton side is [AbletonOSC](https://github.com/ideoforms/AbletonOSC), a free Remote Script that exposes Ableton's full API over the network.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Ableton Live 11](https://www.ableton.com/en/live/) or later
- [Claude Code](https://claude.ai/code)

## Setup

### 1. Install AbletonOSC

1. Clone or download [AbletonOSC](https://github.com/ideoforms/AbletonOSC)
2. Copy the folder to your Ableton User Library:
   - **Windows:** `Documents\Ableton\User Library\Remote Scripts\AbletonOSC\`
   - **macOS:** `~/Music/Ableton/User Library/Remote Scripts/AbletonOSC/`
3. Open Ableton Live
4. Go to **Preferences > Link, Tempo & MIDI**
5. Under **Control Surface**, select **AbletonOSC**
6. The status bar should show: *AbletonOSC: Listening for OSC on port 11000*

### 2. Build the server

```bash
git clone https://github.com/adindotdev/ableton-mcp.git
cd ableton-mcp
npm install
npm run build
```

### 3. Register with Claude Code

```bash
claude mcp add ableton -- node /path/to/ableton-mcp/dist/index.js
```

Restart Claude Code. The Ableton tools will appear automatically.

## What Can It Do?

### Transport
Play, stop, and resume playback. Set tempo, time signature, and metronome. Jump to any position in the song. Undo and redo.

### Tracks
List all tracks, get detailed track info. Create MIDI or audio tracks, rename, duplicate, and delete them.

### Clips
Fire and stop clips or entire scenes. Create MIDI clips, read and write individual MIDI notes, rename and delete clips.

### Mixer
Set volume, pan, mute, solo, and arm per track. Adjust send levels to return tracks.

### Devices
List all devices on a track, inspect every parameter with its name, value, and range, and set any parameter by index.

### Resources
Claude can read a snapshot of your session state (tempo, track count, time signature) and per-track details at any time without calling a tool.

## WSL Note

If you're running Claude Code in WSL while Ableton runs on Windows, the server auto-detects the Windows host IP so OSC packets reach Ableton. No extra configuration needed.

## Development

```bash
npm run dev    # watch mode — recompiles on save
npm run build  # one-time build
npm start      # run the server directly
```
