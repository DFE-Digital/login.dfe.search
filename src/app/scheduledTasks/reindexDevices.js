const logger = require('./../../infrastructure/logger');
const DeviceIndex = require('./../indexes/DeviceIndex');
const cache = require('./../../infrastructure/cache');

const reindexDevices = async (correlationId) => {
  const start = new Date();

  // create index
  const index = await DeviceIndex.create();
  logger.info(`Created devices index ${index.name}`, {correlationId});

  // get all devices
  await index.indexAllDevices(correlationId);
  logger.info('Indexed all devices', {correlationId});

  // swap index
  await DeviceIndex.current(index);
  logger.info(`Set devices index to ${index.name}`, {correlationId});

  // update pointer
  await cache.set('Pointer:LastDeviceUpdateTime', start.getTime());
  logger.info(`Updated devices update pointer to ${start}`, { correlationId });
};
module.exports = reindexDevices;