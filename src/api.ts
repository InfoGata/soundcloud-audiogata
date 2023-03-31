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
      const urls = text.match(
        /(?!<script crossorigin src=")https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*\.js)(?=">)/g
      );
      let script: string;
      do {
        let scriptResponse = await application.networkRequest(
          urls?.pop() || ""
        );
        script = await scriptResponse.text();
      } while (!script.includes(',client_id:"') && (urls?.length || 0) > 0);
      this.clientId = script.match(/,client_id:"(\w+)"/)?.[1];

      if (!this.clientId) {
        Promise.reject("Unable to fetch a SoundCloud API key.");
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
