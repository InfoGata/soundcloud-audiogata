import { SoundcloudPlaylist } from "soundcloud.ts";

export interface SoundcloudMixedSelectionColleciton {
  urn: string;
  title: string;
  kind: "selection"
  id: string;
  items: SoundcloudMixedSelectionCollecitonItems;
}
export interface SoundcloudMixedSelectionCollecitonItems {
  collection: SoundcloudPlaylist[];
}
export interface SoundcloudMixedSelections {
  collection: SoundcloudMixedSelectionColleciton[];
  query_urn: string;
}