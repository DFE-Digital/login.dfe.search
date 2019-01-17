const config = require('./../config');
const ApiClient = require('./../utils/ApiClient');

const client = new ApiClient(config.devices.service);

const listDevices = async (pageNumber, pageSize, correlationId) => {
  return client.get(`/digipass/v2?page=${pageNumber}&pageSize=${pageSize}`, correlationId)
};

module.exports = {
  listDevices,
};
