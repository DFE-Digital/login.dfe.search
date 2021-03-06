const logger = require('./../../infrastructure/logger');
const UserIndex = require('./../indexes/UserIndex');
const cache = require('./../../infrastructure/cache');

const reindexUsers = async (correlationId) => {
  const start = new Date();

  // create index
  const index = await UserIndex.create();
  logger.info(`Created users index ${index.name}`, {correlationId});

  // get all users
  await index.indexAllUsers(correlationId);
  logger.info('Indexed all users', {correlationId});

  // swap index
  await UserIndex.current(index);
  logger.info(`Set users index to ${index.name}`, {correlationId});

  // update pointer
  await cache.set('Pointer:LastUserUpdateTime', start.getTime());
  logger.info(`Updated user update pointer to ${start}`, { correlationId });
};
module.exports = reindexUsers;
