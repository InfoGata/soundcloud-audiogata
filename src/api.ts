const webUrl = "https://www.soundcloud.com/";
const apiV2URL = "https://api-v2.soundcloud.com/";
export class API {
  clientId?: string;
  constructor(public proxy?: string) {}

  getClientId = async (reset?: boolean) => {
    if (!this.clientId || reset) {
      let url = webUrl;
      if (this.proxy) {
        url = this.proxy + webUrl;
      }
      const response = await application.networkRequest(url);
      const text = await response.text();
      // A mobile user agent, which is what Android WebViews send, gets the
      // mobile site. It embeds the id in its page data and none of its
      // scripts define it.
      this.clientId = text.match(/"clientId":"(\w+)"/)?.[1];
      // The desktop site defines it in one of its script bundles, usually
      // the last one.
      const urls =
        text.match(
          /(?!<script crossorigin src=")https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*\.js)(?=">)/g
        ) || [];
      while (!this.clientId && urls.length > 0) {
        const scriptResponse = await application.networkRequest(urls.pop()!);
        const script = await scriptResponse.text();
        this.clientId = script.match(/,client_id:"(\w+)"/)?.[1];
      }

      // Thrown rather than returned: every request would otherwise go out
      // with client_id=undefined and come back empty, with nothing saying why.
      if (!this.clientId) {
        throw new Error("Unable to fetch a SoundCloud API key.");
      }
    }

    return this.clientId;
  };

  getV2 = async (endpoint: string, params?: any) => {
    if (!params) params = {};
    params.client_id = await this.getClientId();
    let url = (endpoint = apiV2URL + endpoint);
    if (this.proxy) url = this.proxy + endpoint;
    const endpointUrl = new URL(url);
    try {
      endpointUrl.search = new URLSearchParams(params).toString();
      const response = await application.networkRequest(endpointUrl.toString());
      const json = await response.json();
      return json;
    } catch {
      params.client_id = await this.getClientId(true);
      endpointUrl.search = new URLSearchParams(params).toString();
      const response = await application.networkRequest(endpointUrl.toString());
      const json = await response.json();
      return json;
    }
  };
}
