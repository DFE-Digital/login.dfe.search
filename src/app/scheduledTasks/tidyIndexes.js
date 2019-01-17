const logger = require('./../../infrastructure/logger');
const UserIndex = require('./../indexes/UserIndex');
const DeviceIndex = require('./../indexes/DeviceIndex');

const tidyIndexes = async (correlationId) => {
  logger.info('tidying user indexes', { correlationId });
  await UserIndex.tidyIndexes(correlationId);

  logger.info('tidying device indexes', { correlationId });
  await DeviceIndex.tidyIndexes(correlationId);
};
module.exports = tidyIndexes;
