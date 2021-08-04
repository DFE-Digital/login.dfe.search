const SimpleSchema = require('simpl-schema').default;
const { validateConfigAgainstSchema, schemas, patterns } = require('login.dfe.config.schema.common');
const config = require('./index');
const logger = require('./../logger');

const scheduledTasksSchema = new SimpleSchema({
  reindexUsers: String,
  updateUsersIndex: String,
  updateAuditCache: String,
  tidyIndexes: String,
  reindexDevices: String,
});
const cacheSchema = new SimpleSchema({
  type: {
    type: String,
    allowedValues: ['memory', 'redis'],
  },
  params: {
    type: Object,
    optional: true,
    custom: function() {
      if (this.siblingField('type').value === 'redis' && !this.isSet) {
        return SimpleSchema.ErrorTypes.REQUIRED
      }
    },
  },
  'params.connectionString': {
    type: String,
    regEx: patterns.redis,
    optional: true,
    custom: function() {
      if (this.field('type').value === 'redis' && !this.isSet) {
        return SimpleSchema.ErrorTypes.REQUIRED
      }
    },
  },
});
const auditSchema = new SimpleSchema({
  type: {
    type: String,
    allowedValues: ['sequelize'],
  },
  params: schemas.sequelizeConnection,
});
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
  scheduledTasks: scheduledTasksSchema,
  cache: cacheSchema,
  audit: auditSchema,
  search: searchSchema,
  directories: schemas.apiClient,
  organisations: schemas.apiClient,
  access: schemas.apiClient,
  devices: schemas.apiClient,
  notifications: notificationsSchema,
  adapter: adapterSchema,
  assets: schemas.assets,
});
module.exports.validate = () => {
  validateConfigAgainstSchema(config, schema, logger);
};
