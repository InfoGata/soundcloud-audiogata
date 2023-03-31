import { application } from "./application";
import SoundcloudPlugin from "../src/soundcloud-plugin";
import Soundcloud from "../src/soundcloud";

const soundcloud = new Soundcloud();
describe("index", () => {
  (global as any).application = application;
  test("should get track by url", async () => {
    const plugin = new SoundcloudPlugin(soundcloud);
    const url = await plugin.getTrackByUrl({ apiId: "1396619680" });
    expect(url).toBeTruthy();
  });
});
