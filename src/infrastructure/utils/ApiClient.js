const config = require("./../config");
const { fetchApi } = require("login.dfe.async-retry");
const jwtStrategy = require("login.dfe.jwt-strategies");

class ApiClient {
  constructor(config) {
    this._config = config;

    this._baseUrl =
      config.url.substr(config.url.length - 1) === "/"
        ? config.url.substr(0, config.url.length - 1)
        : config.url;
  }

  async get(resource, correlationId) {
    try {
      const token = await jwtStrategy(this._config).getBearerToken();

      return await fetchApi(`${this._baseUrl}${resource}`, {
        method: "GET",
        headers: {
          "x-correlation-id": correlationId,
          authorization: `bearer ${token}`,
        },
      });
    } catch (e) {
      if (e.statusCode === 404) {
        return undefined;
      }
      throw new Error(`${e.message} (GET: ${this._baseUrl}${resource})`);
    }
  }
}

module.exports = ApiClient;
