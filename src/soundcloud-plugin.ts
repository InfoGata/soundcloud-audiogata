import type {
  SoundcloudPlaylist,
  SoundcloudTrack,
  SoundcloudTranscoding,
  SoundcloudUser,
} from "soundcloud.ts";
import Soundcloud from "./soundcloud";

const getArtwork = (track: {
  artwork_url: string | null;
  user: SoundcloudUser;
}): ImageInfo[] => {
  let artwork = track.artwork_url
    ? track.artwork_url
    : track.user?.avatar_url;
  if (!artwork)
    return [];
  return [
    { url: artwork, height: 100, width: 100 },
    { url: artwork.replace("-large", "-t500x500"), height: 500, width: 500 },
  ];
};


const soundcloudPlaylistToPlaylist = (
  playlist: SoundcloudPlaylist
): PlaylistInfo => {
  return {
    name: playlist.title,
    apiId: playlist.id.toString(),
    images: getArtwork(playlist),
  };  
}

export default class SoundcloudPlugn {
  constructor(public soundcloud: Soundcloud) {}


  private soundcloudTrackToTrack = (t: SoundcloudTrack): Track => {
    return {
      name: t.title,
      apiId: t.id.toString(),
      duration: t.duration / 1000,
      artistName: (t.publisher_metadata as any)?.artist || "",
      source: this.pickTranscoding(t.media.transcodings)?.url,
      images: getArtwork(t),
    };
  };

  // Ordered by preference. SoundCloud has dropped audio/mpeg transcodings for
  // many tracks, which now only offer HLS as audio/mp4 (AAC). Such tracks may
  // also list an "audio/mpegurl" HLS transcoding, but its endpoint returns 404,
  // so it is deliberately not matched.
  private transcodingFilters: ((t: SoundcloudTranscoding) => boolean)[] = [
    (t) =>
      t.format.protocol === "progressive" && t.format.mime_type === "audio/mpeg",
    (t) => t.format.protocol === "hls" && t.format.mime_type === "audio/mpeg",
    (t) =>
      t.format.protocol === "hls" && t.format.mime_type.startsWith("audio/mp4"),
  ];

  private pickTranscoding(
    transcodings: SoundcloudTranscoding[] | undefined
  ): SoundcloudTranscoding | undefined {
    for (const filter of this.transcodingFilters) {
      const match = transcodings?.find(filter);
      if (match) return match;
    }
    return undefined;
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

    const playlists = playlistSearch?.collection
      .map(soundcloudPlaylistToPlaylist);
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
        images: getArtwork(playlist),
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

  async getTopItems(): Promise<SearchAllResult> {
    console.log("getTopItems");
    const playlists = await this.soundcloud.getTopPlaylistsV2();
    console.log("playlists", playlists);
    const playlistInfos = playlists.collection.flatMap(c => c.items.collection.map(soundcloudPlaylistToPlaylist));
    console.log("playlistInfos", playlistInfos);
    return {
      playlists: {
        items: playlistInfos,
      },
    }
  }

  async getTrackByUrl(request: GetTrackUrlRequest): Promise<string> {
    const corsDisabled = await application.isNetworkRequestCorsDisabled();
    const corsProxy =
      (await application.getCorsProxy()) ||
      "https://cloudcors.audio-pwa.workers.dev/";
    const proxy = corsDisabled ? "" : corsProxy;

    let clientId = await this.soundcloud.api.getClientId();
    const track = await this.soundcloud.getTrackV2(request.apiId || "");
    const source = this.pickTranscoding(track?.media.transcodings)?.url || "";
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
