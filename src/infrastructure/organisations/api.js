const config = require('./../config');
const ApiClient = require('./../utils/ApiClient');

const client = new ApiClient(config.organisations.service);

const listUsersOrganisations = async (page, pageSize, correlationId) => {
  return client.get(`/organisations/users?page=${page}&pageSize=${pageSize}`, correlationId);
};
const getUserOrganisations = async (userId, correlationId) => {
  return client.get(`/organisations/associated-with-user/${userId}`, correlationId);
};

const listInvitationsOrganisations = async (page, pageSize, correlationId) => {
  return client.get(`/organisations/invitations?page=${page}&pageSize=${pageSize}`, correlationId);
};
const getInvitationOrganisations = async (invitationId, correlationId) => {
  return client.get(`/invitations/v2/${invitationId}`, correlationId);
};

module.exports = {
  listUsersOrganisations,
  getUserOrganisations,
  listInvitationsOrganisations,
  getInvitationOrganisations,
};
