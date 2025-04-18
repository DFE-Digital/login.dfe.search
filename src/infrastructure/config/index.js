const fs = require('fs');
const os = require('os');
const path = require('path');

require('dotenv').config();

const config = {
  loggerSettings: {
    logLevel: "info",
    applicationName: "Search-API"
  },
  hostingEnvironment: {
    useDevViews: true,
    env: process.env.LOCAL_ENV || "azure",
    host: process.env.LOCAL_HOST || process.env.STANDALONE_SEARCH_HOST_NAME,
    port: process.env.LOCAL_PORT_SEARCH || 443,
    sslCert: process.env.LOCAL_SSL_CERT || "",
    sslKey: process.env.LOCAL_SSL_KEY || "",
    protocol: "https",
    applicationInsights: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
    agentKeepAlive: {
      maxSockets: 35,
      maxFreeSockets: 10,
      timeout: 60000,
      keepAliveTimeout: 30000
    }
  },
  auth: {
    type: "aad",
    identityMetadata: process.env.TENANT_URL + "/.well-known/openid-configuration",
    clientID: process.env.AAD_SHD_APP_ID
  },
  search: {
    azureSearch: {
      serviceName: process.env.AZURE_SEARCH_NAME,
      apiKey: process.env.AZURE_SEARCH_KEY
    }
  },
  directories: {
    type: "api",
    service: {
      url: "https://" + process.env.STANDALONE_DIRECTORIES_HOST_NAME,
      auth: {
        type: "aad",
        tenant: process.env.PLATFORM_GLOBAL_TENANT_DOMAIN,
        authorityHostUrl: process.env.TENANT_URL,
        clientId: process.env.AAD_SHD_CLIENT_ID,
        clientSecret: process.env.AAD_SHD_CLIENT_SECRET,
        resource: process.env.AAD_SHD_APP_ID
      }
    }
  },
  organisations: {
    type: "api",
    service: {
      url: "https://" + process.env.STANDALONE_ORGANISATIONS_HOST_NAME,
      auth: {
        type: "aad",
        tenant: process.env.PLATFORM_GLOBAL_TENANT_DOMAIN,
        authorityHostUrl: process.env.TENANT_URL,
        clientId: process.env.AAD_SHD_CLIENT_ID,
        clientSecret: process.env.AAD_SHD_CLIENT_SECRET,
        resource: process.env.AAD_SHD_APP_ID
      }
    }
  },
  access: {
    type: "api",
    service: {
      url: "https://" + process.env.STANDALONE_ACCESS_HOST_NAME,
      auth: {
        type: "aad",
        tenant: process.env.PLATFORM_GLOBAL_TENANT_DOMAIN,
        authorityHostUrl: process.env.TENANT_URL,
        clientId: process.env.AAD_SHD_CLIENT_ID,
        clientSecret: process.env.AAD_SHD_CLIENT_SECRET,
        resource: process.env.AAD_SHD_APP_ID
      }
    }
  },
  adapter: {
    type: "sequelize",
    directories: {
      host: process.env.PLATFORM_GLOBAL_SERVER_NAME,
      username: process.env.SVC_SIGNIN_DIR,
      password: process.env.SVC_SIGNIN_DIR_PASSWORD,
      dialect: "mssql",
      name: process.env.PLATFORM_GLOBAL_DIRECTORIES_DATABASE_NAME,
      encrypt: true,
      schema: "dbo",
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    },
    organisation: {
      host: process.env.PLATFORM_GLOBAL_SERVER_NAME,
      username: process.env.SVC_SIGNIN_ORG,
      password: process.env.SVC_SIGNIN_ORG_PASSWORD,
      dialect: "mssql",
      name: process.env.PLATFORM_GLOBAL_ORGANISATIONS_DATABASE_NAME,
      encrypt: true,
      schema: "dbo",
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    }
  },
  notifications: {
    connectionString: process.env.REDIS_CONN + "/4?tls=true"
  },
  assets: {
    url: process.env.CDN_HOST_NAME,
    version: process.env.CDN_ASSETS_VERSION
  }
}


// Persist configuration to a temporary file and then point the `settings` environment
// variable to the path of the temporary file. The `login.dfe.dao` package can then load
// this configuration.
function mimicLegacySettings(config) {
  // TODO: This can be improved by refactoring the `login.dfe.dao` package.
  const tempDirectoryPath = fs.mkdtempSync(path.join(os.tmpdir(), 'config-'));
  const tempConfigFilePath = path.join(tempDirectoryPath, 'config.json');

  fs.writeFileSync(tempConfigFilePath, JSON.stringify(config), { encoding: 'utf8' });
  process.env.settings = tempConfigFilePath;
}

mimicLegacySettings(config);

module.exports = config; 
