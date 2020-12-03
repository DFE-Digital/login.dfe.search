const schedule = require('node-schedule');
const config = require('./../../infrastructure/config');
const logger = require('./../../infrastructure/logger');
const uuid = require('uuid/v4');

const reindexUsers = require('./reindexUsers');
const updateUsersIndex = require('./updateUsersIndex');
const updateAuditCache = require('./updateAuditCache');
const tidyIndexes = require('./tidyIndexes');
const reindexDevices = require('./reindexDevices');

const running = {};

const scheduleTask = (name, cronSpec, action) => {
  const job = schedule.scheduleJob(cronSpec, async () => {
    const correlationId = `${name.replace(/[\s,-]/g, '')}-${uuid()}`;
    try {
      logger.info(`starting job ${name}`, { correlationId });

      const start = Date.now();
      if (!running[name]){
        running[name] = true;
        await action(correlationId);
        running[name] = false;

        const durationInMilliseconds = Date.now() - start;
        logger.info(`successfully completed job ${name} in ${durationInMilliseconds / 1000}s`, { correlationId });
      } else {
        logger.info(`another job is running, skipped ${name}`, { correlationId });
      }
    } catch (e) {
      running[name] = false;
      logger.error(`error running job ${name}: ${e.stack}`, { correlationId });
    } finally {
      logger.info(`next invocation of job ${name} will be ${job.nextInvocation()}`);
    }
  });
  logger.info(`first invocation of job ${name} will be ${job.nextInvocation()}`);
};

const start = () => {
  scheduleTask('re-index users', config.scheduledTasks.reindexUsers, reindexUsers);
  scheduleTask('update users index', config.scheduledTasks.updateUsersIndex, updateUsersIndex);
  scheduleTask('update audit cache', config.scheduledTasks.updateAuditCache, updateAuditCache);
  scheduleTask('re-index devices', config.scheduledTasks.reindexDevices, reindexDevices);
  scheduleTask('tidy indexes', config.scheduledTasks.tidyIndexes, tidyIndexes);
};
module.exports = {
  start,
  availableTasks: {
    "Re-index Users" : reindexUsers,
    "Update Users Index": updateUsersIndex,
    "Update Audit Cache": updateAuditCache,
    "Tidy Indexes": tidyIndexes,
    "Re-index Devices": reindexDevices
  }
};
