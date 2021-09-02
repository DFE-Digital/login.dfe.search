const config = require('./../config');
const ApiClient = require('./../utils/ApiClient');
const { invitation, organisation } = require('login.dfe.dao');

const client = new ApiClient(config.organisations.service);

const listUsersOrganisations = async (page, pageSize) => organisation.getUsersOrganisations(page, pageSize);

const getUserOrganisations = async (userId, correlationId) => {
  return client.get(`/organisations/associated-with-user/${userId}`, correlationId);
};

const getUserOrganisationsV2 = async (userId, correlationId) => {
  return client.get(`/organisations/v2/associated-with-user/${userId}`, correlationId);
}

const listInvitationsOrganisations = async (page, pageSize) => {
  return invitation.listInvitationsForOrganisations(page, pageSize);
};

const getInvitationOrganisations = async (invitationId) => {
  return invitation.getInvitationResponseById(invitationId);
}

module.exports = {
  listUsersOrganisations,
  getUserOrganisations,
  listInvitationsOrganisations,
  getInvitationOrganisations,
  getUserOrganisationsV2,
};
