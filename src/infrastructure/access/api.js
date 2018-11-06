const config = require('./../config');
const ApiClient = require('./../utils/ApiClient');

const client = new ApiClient(config.access.service);

const listUserServices = async (userId, correlationId) => {
  return client.get(`/users/${userId}/services`, correlationId);
};
const listAllUsersServices = async (page, pageSize, correlationId) => {
  return client.get(`/users?page=${page}&pageSize=${pageSize}`, correlationId);
};

const listInvitationServices = async (invitationId, correlationId) => {
  return client.get(`/invitations/${invitationId}/services`, correlationId);
};

const listAllInvitationsServices = async (page, pageSize, correlationId) => {
  return client.get(`/invitations?page=${page}&pageSize=${pageSize}`, correlationId);
};

module.exports = {
  listUserServices,
  listAllUsersServices,
  listInvitationServices,
  listAllInvitationsServices,
};