const SimpleSchema = require('simpl-schema').default;
const { validateConfigAgainstSchema, schemas, patterns } = require('login.dfe.config.schema.common');
const config = require('./index');
const logger = require('./../logger');

const searchSchema = new SimpleSchema({
  azureSearch: Object,
  'azureSearch.serviceName': String,
  'azureSearch.apiKey': String,
});
const notificationsSchema = new SimpleSchema({
  connectionString: patterns.redis,
});
const adapterSchema = new SimpleSchema({
  type: {
    type: String,
    allowedValues: ['file', 'redis', 'mongo', 'azuread', 'sequelize'],
  },
  directories: {
    type: schemas.sequelizeConnection,
    optional: true,
  },
  organisation: {
    type: schemas.sequelizeConnection,
    optional: true,
  },
});

const schema = new SimpleSchema({
  loggerSettings: schemas.loggerSettings,
  hostingEnvironment: schemas.hostingEnvironment,
  auth: schemas.apiServerAuth,
  search: searchSchema,
  directories: schemas.apiClient,
  organisations: schemas.apiClient,
  access: schemas.apiClient,
  notifications: notificationsSchema,
  adapter: adapterSchema,
  assets: schemas.assets,
});
module.exports.validate = () => {
  validateConfigAgainstSchema(config, schema, logger);
};
