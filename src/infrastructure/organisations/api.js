const { organisation, invitation } = require('login.dfe.dao');
const config = require('./../config');
const ApiClient = require('./../utils/ApiClient');

const client = new ApiClient(config.organisations.service);

const listUsersOrganisations = async (page, pageSize, correlationId) => {
  return client.get(`/organisations/users?page=${page}&pageSize=${pageSize}`, correlationId);
};
const getUserOrganisations = async (userId, correlationId) => {
  return client.get(`/organisations/associated-with-user/${userId}`, correlationId);
};

const getUserOrganisationsV2 = async (userId) => organisation.getOrganisationsForUserIncludingServices(userId);

const listInvitationsOrganisations = async (page, pageSize, correlationId) => {
  return client.get(`/organisations/invitations?page=${page}&pageSize=${pageSize}`, correlationId);
};
const getInvitationOrganisations = async (invitationId) => invitation.getInvitationById(invitationId);

module.exports = {
  listUsersOrganisations,
  getUserOrganisations,
  listInvitationsOrganisations,
  getInvitationOrganisations,
  getUserOrganisationsV2,
};
