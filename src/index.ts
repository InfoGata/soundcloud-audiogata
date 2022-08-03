import Soundcloud, {
  SoundcloudTrackV2,
  SoundcloudTranscoding,
} from "soundcloud.ts";
import axios from "axios";
import "audiogata-plugin-typings";
let soundcloud: Soundcloud | undefined;

const getArtwork = (track: SoundcloudTrackV2): ImageInfo[] => {
  let artwork = track.artwork_url ? track.artwork_url : track.user.avatar_url;
  return [
    { url: artwork, height: 100, width: 100 },
    { url: artwork.replace("-large", "-t500x500"), height: 500, width: 500 },
  ];
};

function trackFilter(transcoding: SoundcloudTranscoding) {
  return (
    transcoding.format.mime_type === "audio/mpeg" &&
    transcoding.format.protocol === "progressive"
  );
}

async function searchTracks(
  request: SearchRequest
): Promise<SearchTrackResult> {
  const limit = 50;
  const trackSearch = await soundcloud?.tracks.searchV2({
    q: request.query,
    limit,
  });

  const tracks: Track[] | undefined = trackSearch?.collection.map((c) => ({
    name: c.title,
    apiId: c.id.toString(),
    duration: c.duration / 1000,
    artistName: c.label_name || "",
    source: c.media.transcodings.find(trackFilter)?.url,
    images: getArtwork(c),
  }));
  return {
    items: tracks?.filter((t) => !!t.source) || [],
  };
}

async function searchAll(request: SearchRequest): Promise<SearchAllResult> {
  const [tracks] = await Promise.all([searchTracks(request)]);
  return { tracks };
}

async function getTrackByUrl(request: GetTrackUrlRequest): Promise<string> {
  const corsProxy = await application.getCorsProxy();
  let clientId = await soundcloud?.api.getClientID();
  const track = await soundcloud?.tracks.getV2(request.apiId || "");
  const source = track?.media.transcodings.find(trackFilter)?.url || "";
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
  application.onGetTrackUrl = getTrackByUrl;
};

init();
