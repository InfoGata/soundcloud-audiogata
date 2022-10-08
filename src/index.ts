import Soundcloud, {
  SoundcloudTrackV2,
  SoundcloudTranscoding,
  SoundcloudUserV2,
} from "soundcloud.ts";
import axios from "axios";
import "audiogata-plugin-typings";
let soundcloud: Soundcloud | undefined;

const getArtwork = (track: {
  artwork_url: string | null;
  user: SoundcloudUserV2;
}): ImageInfo[] => {
  let artwork = track.artwork_url ? track.artwork_url : track.user.avatar_url;
  return [
    { url: artwork, height: 100, width: 100 },
    { url: artwork.replace("-large", "-t500x500"), height: 500, width: 500 },
  ];
};

const soundcloudTrackToTrack = (t: SoundcloudTrackV2): Track => {
  return {
    name: t.title,
    apiId: t.id.toString(),
    duration: t.duration / 1000,
    artistName: t.label_name || "",
    source: t.media.transcodings.find(trackFilter)?.url,
    images: getArtwork(t),
  };
};

function trackFilter(transcoding: SoundcloudTranscoding) {
  return progressiveFilter(transcoding) || hlsFilter(transcoding);
}

function progressiveFilter(transcoding: SoundcloudTranscoding) {
  return (
    transcoding.format.mime_type === "audio/mpeg" &&
    transcoding.format.protocol === "progressive"
  );
}

function hlsFilter(transcoding: SoundcloudTranscoding) {
  return (
    transcoding.format.mime_type === "audio/mpeg" &&
    transcoding.format.protocol === "hls"
  );
}

async function searchTracks(
  request: SearchRequest
): Promise<SearchTrackResult> {
  const limit = 50;
  const offset = request.page?.offset || 0;
  const trackSearch = await soundcloud?.tracks.searchV2({
    q: request.query,
    limit,
    offset,
  });

  const tracks: Track[] | undefined = trackSearch?.collection.map(
    soundcloudTrackToTrack
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

async function searchPlaylists(
  request: SearchRequest
): Promise<SearchPlaylistResult> {
  const limit = 50;
  const offset = request.page?.offset || 0;
  const playlistSearch = await soundcloud?.playlists.searchV2({
    q: request.query,
    limit,
    offset,
  });

  const playlists = playlistSearch?.collection.map(
    (c): PlaylistInfo => ({
      name: c.title,
      apiId: c.id.toString(),
      images: getArtwork(c),
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

async function getPlaylistTracks(
  request: PlaylistTrackRequest
): Promise<PlaylistTracksResult> {
  const playlist = await soundcloud?.playlists.getV2(request.apiId || "");
  const tracks = playlist?.tracks.map(soundcloudTrackToTrack);

  return {
    items: tracks?.filter((t) => !!t.source) || [],
    playlist: playlist && {
      name: playlist.title,
      apiId: playlist.id.toString(),
      images: getArtwork(playlist),
    },
  };
}

async function searchAll(request: SearchRequest): Promise<SearchAllResult> {
  const tracksPromise = searchTracks(request);
  const playlistsPromise = searchPlaylists(request);
  const [tracks, playlists] = await Promise.all([
    tracksPromise,
    playlistsPromise,
  ]);
  return { tracks, playlists };
}

async function getTrackByUrl(request: GetTrackUrlRequest): Promise<string> {
  const corsProxy = await application.getCorsProxy();
  let clientId = await soundcloud?.api.getClientID();
  const track = await soundcloud?.tracks.getV2(request.apiId || "");
  let source = track?.media.transcodings.find(progressiveFilter)?.url || "";
  // Check if there is an hls source
  if (!source) {
    source = track?.media.transcodings.find(hlsFilter)?.url || "";
  }
  let url = "";
  let connect = source?.includes("secret_token")
    ? `&client_id=${clientId}`
    : `?client_id=${clientId}`;
  try {
    url = await axios.get(corsProxy + source + connect).then((r) => r.data.url);
  } catch {
    clientId = await soundcloud?.api.getClientID(true);
    connect = source?.includes("secret_token")
      ? `&client_id=${clientId}`
      : `?client_id=${clientId}`;
    url = await axios.get(corsProxy + source + connect).then((r) => r.data.url);
  }

  return url;
}

const init = async () => {
  let corsProxy = await application.getCorsProxy();
  if (!corsProxy) {
    corsProxy = "https://cloudcors.audio-pwa.workers.dev/";
  }
  soundcloud = new Soundcloud(undefined, undefined, {
    proxy: corsProxy,
  });

  application.onSearchAll = searchAll;
  application.onSearchTracks = searchTracks;
  application.onSearchPlaylists = searchPlaylists;
  application.onGetPlaylistTracks = getPlaylistTracks;
  application.onGetTrackUrl = getTrackByUrl;
};

init();
