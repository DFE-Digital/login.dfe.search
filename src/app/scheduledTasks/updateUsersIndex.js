const logger = require('./../../infrastructure/logger');
const UserIndex = require('./../indexes/UserIndex');
const cache = require('./../../infrastructure/cache');

const updateUsersIndex = async (correlationId) => {
  const index = await UserIndex.current();
  if (!index) {
    logger.warn(`Abandoning update user index as no current index set.`, { correlationId });
    return;
  }

  const lastUpdated = new Date(await cache.get('Pointer:LastUserUpdateTime') || 0);
  const start = new Date();

  logger.info(`Starting to process users updated since ${lastUpdated} into ${index.name}`, { correlationId });

  await index.indexUsersChangedAfter(lastUpdated, correlationId);
  logger.info(`Finished processing users updated since ${lastUpdated} into ${index.name}`, { correlationId });

  await cache.set('Pointer:LastUserUpdateTime', start.getTime());
  logger.info(`Updated user update pointer to ${start}`, { correlationId });
};
module.exports = updateUsersIndex;
