import type {
  SoundcloudPlaylistFilter,
  SoundcloudPlaylistSearch,
  SoundcloudPlaylist,
  SoundcloudTrackFilter,
  SoundcloudTrackSearch,
  SoundcloudTrack,
} from "soundcloud.ts";
import { API } from "./api";
import { SoundcloudMixedSelections } from "./types";

export default class Soundcloud {
  api: API;
  constructor(proxy?: string) {
    this.api = new API(proxy);
  }

  searchTracksV2 = async (params: SoundcloudTrackFilter) => {
    const response = await this.api.getV2("search/tracks", params);
    return response as Promise<SoundcloudTrackSearch>;
  };

  searchPlaylistsV2 = async (params: SoundcloudPlaylistFilter) => {
    const response = await this.api.getV2("search/playlists", params);
    return response as Promise<SoundcloudPlaylistSearch>;
  };

  private resolveV2 = async (resolvable: string | number) => {
    if (
      !String(resolvable).match(/\d{8,}/) &&
      !String(resolvable).includes("soundcloud")
    ) {
      resolvable = `https://soundcloud.com/${resolvable}`;
    }
    let id = resolvable;
    if (String(resolvable).includes("soundcloud")) {
      const resolved = await this.api.getV2("resolve", { url: resolvable });
      id = resolved.id;
    }
    return id;
  };

  getTrackV2 = async (trackResolvable: string | number) => {
    const trackId = await this.resolveV2(trackResolvable);
    const response = await this.api.getV2(`tracks/${trackId}`);
    return response as Promise<SoundcloudTrack>;
  };

  private getTracksArrayV2 = async (trackIds: number[]) => {
    if (trackIds.length === 0) return [];
    // Max 50 ids per request => split into chunks of 50 ids
    const chunks: number[][] = [];
    let i = 0;
    while (i < trackIds.length) chunks.push(trackIds.slice(i, (i += 50)));
    const response: SoundcloudTrack[] = [];
    const tracks = await Promise.all(
      chunks.map((chunk) => this.api.getV2(`tracks`, { ids: chunk.join(",") }))
    );
    return response.concat(...tracks);
  };

  private fetchPlaylistTracks = async (playlist: SoundcloudPlaylist) => {
    const unresolvedTracks = playlist.tracks
      .splice(playlist.tracks.findIndex((t) => !t.title))
      .map((t) => t.id);
    if (unresolvedTracks.length === 0) return playlist;
    playlist.tracks = playlist.tracks.concat(
      await this.getTracksArrayV2(unresolvedTracks)
    );
    return playlist;
  };

  getPlaylistV2 = async (playlistResolvable: string | number) => {
    const playlistId = await this.resolveV2(playlistResolvable);
    const response = await this.api.getV2(`playlists/${playlistId}`);
    return this.fetchPlaylistTracks(response) as Promise<SoundcloudPlaylist>;
  }

  getTopPlaylistsV2 = async () => {
    const response = await this.api.getV2("mixed-selections");
    return response as Promise<SoundcloudMixedSelections>;
  }
}
