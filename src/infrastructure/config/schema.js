const SimpleSchema = require('simpl-schema').default;
const { validateConfigAgainstSchema, schemas } = require('login.dfe.config.schema.common');
const config = require('./index');
const logger = require('./../logger');

const schedulesTasksSchema = new SimpleSchema({
  reindexUsers: String,
  updateAuditCache: String,
});

const schema = new SimpleSchema({
  loggerSettings: schemas.loggerSettings,
  hostingEnvironment: schemas.hostingEnvironment,
  schedulesTasks: schedulesTasksSchema,
});
module.exports.validate = () => {
  validateConfigAgainstSchema(config, schema, logger)
};