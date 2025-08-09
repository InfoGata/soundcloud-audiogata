# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run build` - Build the plugin using Vite
- `npm run start` - Build and watch for changes during development  
- `npm test` - Run tests using Vitest

## Architecture Overview

This is an AudioGata plugin that provides SoundCloud integration. The plugin architecture follows a modular design:

### Core Components

- **`src/index.ts`** - Plugin initialization and event binding. Sets up CORS proxy handling and binds plugin methods to the AudioGata application interface.
- **`src/soundcloud-plugin.ts`** - Main plugin class implementing AudioGata plugin interface. Handles search, playlist retrieval, and track URL resolution.
- **`src/soundcloud.ts`** - SoundCloud API wrapper that handles authentication, API calls, and data transformation.
- **`src/api.ts`** - Low-level API client that manages client ID extraction and network requests with proxy support.

### Key Integration Points

The plugin integrates with AudioGata through event handlers:
- `onSearchAll`, `onSearchTracks`, `onSearchPlaylists` - Search functionality
- `onGetPlaylistTracks` - Playlist track retrieval
- `onGetTrackUrl` - Audio stream URL resolution
- `onGetTopItems` - Featured content retrieval

### CORS and Proxy Handling

The plugin automatically detects CORS capabilities and uses proxy servers when needed:
- Default proxy: `https://cloudcors.audio-pwa.workers.dev/`
- Handles both progressive MP3 and HLS audio streams
- Client ID is dynamically extracted from SoundCloud's web interface

### Data Flow

1. API client extracts SoundCloud client ID from web scripts
2. SoundCloud wrapper makes authenticated API calls
3. Plugin transforms SoundCloud data to AudioGata format
4. Audio URLs are resolved through transcoding endpoint calls

The codebase uses TypeScript with Preact for any UI components and follows the AudioGata plugin specification defined in `@infogata/audiogata-plugin-typings`.