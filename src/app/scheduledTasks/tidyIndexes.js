const logger = require('./../../infrastructure/logger');
const UserIndex = require('./../indexes/UserIndex');


const tidyIndexes = async (correlationId) => {
  logger.info('tidying user indexes', { correlationId });
  await UserIndex.tidyIndexes(correlationId)
};
module.exports = tidyIndexes;
