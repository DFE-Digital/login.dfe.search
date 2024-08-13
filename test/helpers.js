const mockConfig = (customConfig) => {
  return Object.assign({
    hostingEnvironment: {
      agentKeepAlive: {
        maxSockets: 160,
        maxFreeSockets: 10,
        timeout: 60000,
        keepAliveTimeout: 30000,
      },
    },
    cache: {
      type: 'memory',
    },
    search: {
      azureSearch: {
        serviceName: 'unit-tests',
        apiKey: 'unit-tests',
      },
    },
    directories: {
      type: 'static',
    },
    organisations: {
      type: 'static',
    },
    access: {
      type: 'static',
    },
    devices: {
      type: 'static',
    },
  }, customConfig);
};
const mockLogger = () => {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    mockResetAll: function () {
      this.debug.mockReset();
      this.info.mockReset();
      this.warn.mockReset();
      this.error.mockReset();
    },
  };
};

const mockRequest = (customRequestProperties) => {
  return Object.assign({
    params: {},
    query: {},
    correlationId: 'correlation-id',
  }, customRequestProperties);
};
const mockResponse = () => {
  const res = {
    status: jest.fn(),
    contentType: jest.fn(),
    json: jest.fn(),
    send: jest.fn(),
    mockResetAll: function() {
      this.status.mockReset().mockReturnValue(this);
      this.contentType.mockReset().mockReturnValue(this);
      this.json.mockReset().mockReturnValue(this);
      this.send.mockReset().mockReturnValue(this);
    },
  };
  return res;
};

module.exports = {
  mockConfig,
  mockLogger,
  mockRequest,
  mockResponse,
};
