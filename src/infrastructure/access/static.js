const config = require('./../config');
const ApiClient = require('./../utils/ApiClient');

const client = new ApiClient(config.access.service);

const listUserServices = async (userId, correlationId) => {
  return Promise.resolve([]);
};
const listAllUsersServices = async (page, pageSize, correlationId) => {
  return Promise.resolve({
    services: [],
    numberOfPages: 0,
  });
};

const listInvitationServices = async (invitationId, correlationId) => {
  return Promise.resolve([]);
};

const listAllInvitationsServices = async (page, pageSize, correlationId) => {
  return Promise.resolve({
    services: [],
    numberOfPages: 0,
  });
};

module.exports = {
  listUserServices,
  listAllUsersServices,
  listInvitationServices,
  listAllInvitationsServices,
};