import { API } from "../src/api";

const desktopPage = `<script crossorigin src="https://a-v2.sndcdn.com/assets/0-aaa.js"></script>
<script crossorigin src="https://a-v2.sndcdn.com/assets/1-bbb.js"></script>`;
const mobilePage = `<script src="https://m.sndcdn.com/_next/static/chunks/polyfills.js"></script>
<script id="__NEXT_DATA__" type="application/json">{"runtimeConfig":{"clientId":"mobileId123"}}</script>`;

const mockPages = (pages: Record<string, string>) => {
  const requested: string[] = [];
  (global as any).application = {
    networkRequest: async (url: string) => {
      requested.push(url);
      return { text: async () => pages[url] ?? "" };
    },
  };
  return requested;
};

describe("API.getClientId", () => {
  test("reads the id from the desktop site's scripts", async () => {
    mockPages({
      "https://www.soundcloud.com/": desktopPage,
      "https://a-v2.sndcdn.com/assets/1-bbb.js": 'x={},client_id:"desktopId456",y',
    });
    expect(await new API().getClientId()).toBe("desktopId456");
  });

  test("reads the id from the mobile site's page data", async () => {
    const requested = mockPages({ "https://www.soundcloud.com/": mobilePage });
    expect(await new API().getClientId()).toBe("mobileId123");
    expect(requested).toEqual(["https://www.soundcloud.com/"]);
  });

  test("throws when no id can be found", async () => {
    mockPages({ "https://www.soundcloud.com/": desktopPage });
    await expect(new API().getClientId()).rejects.toThrow(
      "Unable to fetch a SoundCloud API key."
    );
  });
});
