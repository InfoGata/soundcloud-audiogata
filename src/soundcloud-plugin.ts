import type {
  SoundcloudTrack,
  SoundcloudTranscoding,
  SoundcloudUser,
} from "soundcloud.ts";
import Soundcloud from "./soundcloud";

export default class SoundcloudPlugn {
  constructor(public soundcloud: Soundcloud) {}

  private getArtwork = (track: {
    artwork_url: string | null;
    user: SoundcloudUser;
  }): ImageInfo[] => {
    let artwork = track.artwork_url ? track.artwork_url : track.user.avatar_url;
    return [
      { url: artwork, height: 100, width: 100 },
      { url: artwork.replace("-large", "-t500x500"), height: 500, width: 500 },
    ];
  };

  private soundcloudTrackToTrack = (t: SoundcloudTrack): Track => {
    return {
      name: t.title,
      apiId: t.id.toString(),
      duration: t.duration / 1000,
      artistName: (t.publisher_metadata as any)?.artist || "",
      source: t.media.transcodings.find(this.trackFilter.bind(this))?.url,
      images: this.getArtwork(t),
    };
  };

  private trackFilter(transcoding: SoundcloudTranscoding) {
    return this.progressiveFilter(transcoding) || this.hlsFilter(transcoding);
  }

  private progressiveFilter(transcoding: SoundcloudTranscoding) {
    return (
      transcoding.format.mime_type === "audio/mpeg" &&
      transcoding.format.protocol === "progressive"
    );
  }

  private hlsFilter(transcoding: SoundcloudTranscoding) {
    return (
      transcoding.format.mime_type === "audio/mpeg" &&
      transcoding.format.protocol === "hls"
    );
  }

  async searchTracks(request: SearchRequest): Promise<SearchTrackResult> {
    const limit = 50;
    const offset = request.pageInfo?.offset || 0;
    const trackSearch = await this.soundcloud?.searchTracksV2({
      q: request.query,
      limit,
      offset,
    });

    const tracks: Track[] | undefined = trackSearch?.collection.map(
      this.soundcloudTrackToTrack.bind(this)
    );
    const page: PageInfo = {
      offset: offset,
      resultsPerPage: limit,
      totalResults: trackSearch?.total_results || 0,
    };
    return {
      items: tracks?.filter((t) => !!t.source) || [],
      pageInfo: page,
    };
  }

  async searchPlaylists(request: SearchRequest): Promise<SearchPlaylistResult> {
    const limit = 50;
    const offset = request.pageInfo?.offset || 0;
    const playlistSearch = await this.soundcloud?.searchPlaylistsV2({
      q: request.query,
      limit,
      offset,
    });

    const playlists = playlistSearch?.collection.map(
      (c): PlaylistInfo => ({
        name: c.title,
        apiId: c.id.toString(),
        images: this.getArtwork(c),
      })
    );
    const page: PageInfo = {
      offset: offset,
      resultsPerPage: limit,
      totalResults: playlistSearch?.total_results || 0,
    };
    return {
      items: playlists || [],
      pageInfo: page,
    };
  }

  async getPlaylistTracks(
    request: PlaylistTrackRequest
  ): Promise<PlaylistTracksResult> {
    const playlist = await this.soundcloud.getPlaylistV2(request.apiId || "");
    const tracks = playlist?.tracks.map(this.soundcloudTrackToTrack.bind(this));

    return {
      items: tracks?.filter((t) => !!t.source) || [],
      playlist: playlist && {
        name: playlist.title,
        apiId: playlist.id.toString(),
        images: this.getArtwork(playlist),
      },
    };
  }

  async searchAll(request: SearchRequest): Promise<SearchAllResult> {
    const tracksPromise = this.searchTracks(request);
    const playlistsPromise = this.searchPlaylists(request);
    const [tracks, playlists] = await Promise.all([
      tracksPromise,
      playlistsPromise,
    ]);
    return { tracks, playlists };
  }

  async getTrackByUrl(request: GetTrackUrlRequest): Promise<string> {
    const corsDisabled = await application.isNetworkRequestCorsDisabled();
    const corsProxy =
      (await application.getCorsProxy()) ||
      "https://cloudcors.audio-pwa.workers.dev/";
    const proxy = corsDisabled ? "" : corsProxy;

    let clientId = await this.soundcloud.api.getClientId();
    const track = await this.soundcloud.getTrackV2(request.apiId || "");
    let source =
      track?.media.transcodings.find(this.progressiveFilter.bind(this))?.url ||
      "";
    // Check if there is an hls source
    if (!source) {
      source =
        track?.media.transcodings.find(this.hlsFilter.bind(this))?.url || "";
    }
    let url = "";
    let connect = source?.includes("secret_token")
      ? `&client_id=${clientId}`
      : `?client_id=${clientId}`;
    try {
      const response = await application.networkRequest(
        proxy + source + connect
      );
      const json = await response.json();
      url = json.url;
    } catch {
      clientId = await this.soundcloud.api.getClientId(true);
      connect = source?.includes("secret_token")
        ? `&client_id=${clientId}`
        : `?client_id=${clientId}`;
      const response = await application.networkRequest(
        proxy + source + connect
      );
      const json = await response.json();
      url = json.url;
    }

    return url;
  }
}
