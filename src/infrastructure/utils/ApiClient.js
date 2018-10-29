const config = require('./../config');
const KeepAliveAgent = require('agentkeepalive').HttpsAgent;
const rp = require('login.dfe.request-promise-retry').defaults({
  agent: new KeepAliveAgent({
    maxSockets: config.hostingEnvironment.agentKeepAlive.maxSockets,
    maxFreeSockets: config.hostingEnvironment.agentKeepAlive.maxFreeSockets,
    timeout: config.hostingEnvironment.agentKeepAlive.timeout,
    keepAliveTimeout: config.hostingEnvironment.agentKeepAlive.keepAliveTimeout,
  }),
});
const jwtStrategy = require('login.dfe.jwt-strategies');

class ApiClient {
  constructor(config) {
    this._config = config;

    this._baseUrl = config.url.substr(config.url.length - 1) === '/' ? config.url.substr(0, config.url.length - 1) : config.url;
  }

  async get(resource, correlationId) {
    try {
      const token = await jwtStrategy(this._config).getBearerToken();

      return await rp({
        method: 'GET',
        uri: `${this._baseUrl}${resource}`,
        headers: {
          'x-correlation-id': correlationId,
          authorization: `bearer ${token}`,
        },
        json: true,
      });
    } catch (e) {
      if (e.statusCode === 404) {
        return undefined;
      }
      throw e;
    }
  }
}

module.exports = ApiClient;
