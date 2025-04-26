import Soundcloud from "../src/soundcloud";
import { application } from "./application";

const soundcloud = new Soundcloud();
describe("soundcloud", () => {
  (global as any).application = application;
  test("should search playlists", async () => {
    const response = await soundcloud.searchPlaylistsV2({ q: "test" });
    expect(response.collection[0].description).not.toBeUndefined();
  });

  test("should search tracks", async () => {
    const response = await soundcloud.searchTracksV2({ q: "test" });
    expect(response.collection[0].description).not.toBeUndefined();
  });

  test("should get playlist", async () => {
    const response = await soundcloud.getPlaylistV2("1812649644");
    expect(response.id).toBeTruthy();
  });

  test("should get top playlists", async () => {
    const response = await soundcloud.getTopPlaylistsV2();
    expect(response).toHaveProperty("collection");
    expect(response.collection.length).toBeGreaterThan(0);
  });
});
