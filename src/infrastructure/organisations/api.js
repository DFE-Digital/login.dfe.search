const config = require('./../config');
const ApiClient = require('./../utils/ApiClient');

const client = new ApiClient(config.organisations.service);

const getUserOrganisations = async (userId, correlationId) => {
  return client.get(`/organisations/associated-with-user/${userId}`, correlationId);
};
const getInvitationOrganisations = async (invitationId, correlationId) => {
  return client.get(`/invitations/v2/${invitationId}`, correlationId);
};

module.exports = {
  getUserOrganisations,
  getInvitationOrganisations,
};
