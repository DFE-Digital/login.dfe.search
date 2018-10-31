const logger = require('./../../infrastructure/logger');
const UserIndex = require('./../indexes/UserIndex');


const reindexUsers = async (correlationId) => {
  // create index
  const index = await UserIndex.create();
  logger.info(`Created users index ${index.name}`, {correlationId});

  // get all users
  await index.indexAllUsers(undefined, correlationId);
  logger.info('Indexed all users', {correlationId});

  // swap index
  await UserIndex.current(index);
  logger.info(`Set users index to ${index.name}`, {correlationId});
};
module.exports = reindexUsers;
