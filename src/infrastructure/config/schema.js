const SimpleSchema = require('simpl-schema').default;
const { validateConfigAgainstSchema, schemas, patterns } = require('login.dfe.config.schema.common');
const config = require('./index');
const logger = require('./../logger');

const schedulesTasksSchema = new SimpleSchema({
  reindexUsers: String,
  updateAuditCache: String,
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

const schema = new SimpleSchema({
  loggerSettings: schemas.loggerSettings,
  hostingEnvironment: schemas.hostingEnvironment,
  schedulesTasks: schedulesTasksSchema,
  cache: cacheSchema,
  audit: auditSchema,
});
module.exports.validate = () => {
  validateConfigAgainstSchema(config, schema, logger)
};