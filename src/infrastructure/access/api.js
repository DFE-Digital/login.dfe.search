const config = require('./../config');
const ApiClient = require('./../utils/ApiClient');

const client = new ApiClient(config.access.service);

const listUserServices = async (userId, correlationId) => {
  return client.get(`/users/${userId}/services`, correlationId);
};

const listInvitationServices = async (invitationId, correlationId) => {
  return client.get(`/invitations/${invitationId}/services`, correlationId);
};

module.exports = {
  listUserServices,
  listInvitationServices,
};