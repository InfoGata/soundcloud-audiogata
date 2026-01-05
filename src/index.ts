import Soundcloud from "./soundcloud";
import SoundcloudPlugin from "./soundcloud-plugin";

const DEFAULT_CORS_PROXY = "https://cloudcors.audio-pwa.workers.dev/";

// Create plugin synchronously with default proxy so handlers are immediately available
const soundcloud = new Soundcloud(DEFAULT_CORS_PROXY);
const plugin = new SoundcloudPlugin(soundcloud);

application.onSearchAll = plugin.searchAll.bind(plugin);
application.onSearchTracks = plugin.searchTracks.bind(plugin);
application.onSearchPlaylists = plugin.searchPlaylists.bind(plugin);
application.onGetPlaylistTracks = plugin.getPlaylistTracks.bind(plugin);
application.onGetTrackUrl = plugin.getTrackByUrl.bind(plugin);
application.onGetTopItems = plugin.getTopItems.bind(plugin);

// Update soundcloud instance based on actual CORS settings
const init = async () => {
  const corsDisabled = await application.isNetworkRequestCorsDisabled();
  const corsProxy = await application.getCorsProxy();

  if (corsDisabled) {
    plugin.soundcloud = new Soundcloud();
  } else if (corsProxy) {
    plugin.soundcloud = new Soundcloud(corsProxy);
  }
  // If neither condition is true, keep the default proxy
};

init();
