import Soundcloud from "./soundcloud";
import SoundcloudPlugin from "./soundcloud-plugin";

export const init = async () => {
  const corsDisabled = await application.isNetworkRequestCorsDisabled();
  let corsProxy = await application.getCorsProxy();

  let soundcloud: Soundcloud | undefined;
  if (!corsProxy) {
    corsProxy = "https://cloudcors.audio-pwa.workers.dev/";
  }
  if (corsDisabled) {
    soundcloud = new Soundcloud();
  } else {
    soundcloud = new Soundcloud(corsProxy);
  }
  const plugin = new SoundcloudPlugin(soundcloud);

  application.onSearchAll = plugin.searchAll.bind(plugin);
  application.onSearchTracks = plugin.searchTracks.bind(plugin);
  application.onSearchPlaylists = plugin.searchPlaylists.bind(plugin);
  application.onGetPlaylistTracks = plugin.getPlaylistTracks.bind(plugin);
  application.onGetTrackUrl = plugin.getTrackByUrl.bind(plugin);
  application.onGetTopItems = plugin.getTopItems.bind(plugin);
};

init();
