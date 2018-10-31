const schedule = require('node-schedule');
const config = require('./../../infrastructure/config');
const logger = require('./../../infrastructure/logger');
const uuid = require('uuid/v4');

const reindexUsers = require('./reindexUsers');
const updateAuditCache = require('./updateAuditCache');
const tidyIndexes = require('./tidyIndexes');

const scheduleTask = (name, cronSpec, action) => {
  const job = schedule.scheduleJob(cronSpec, async () => {
    const correlationId = `${name.replace(/[\s,-]/g, '')}-${uuid()}`;
    try {
      logger.info(`starting job ${name}`, { correlationId });

      const start = Date.now();
      await action(correlationId);
      const durationInMilliseconds = Date.now() - start;

      logger.info(`successfully completed job ${name} in ${durationInMilliseconds / 1000}s`, { correlationId });
    } catch (e) {
      logger.error(`error running job ${name}: ${e.stack}`, { correlationId });
    } finally {
      logger.info(`next invocation of job ${name} will be ${job.nextInvocation()}`);
    }
  });
  logger.info(`first invocation of job ${name} will be ${job.nextInvocation()}`);
};

const start = () => {
  scheduleTask('re-index users', config.schedulesTasks.reindexUsers, reindexUsers);
  scheduleTask('update audit cache', config.schedulesTasks.updateAuditCache, updateAuditCache);
  scheduleTask('tidy indexes', config.schedulesTasks.tidyIndexes, tidyIndexes);
};
module.exports = {
  start,
};
