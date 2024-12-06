const config = require("./../config");
const ApiClient = require("./../utils/ApiClient");
const { invitation } = require("login.dfe.dao");

const client = new ApiClient(config.organisations.service);

const getUserOrganisationsV2 = async (userId, correlationId) => {
  return client.get(
    `/organisations/v2/associated-with-user/${userId}`,
    correlationId,
  );
};

const getInvitationOrganisations = async (invitationId) => {
  return invitation.getInvitationResponseById(invitationId);
};

module.exports = {
  getInvitationOrganisations,
  getUserOrganisationsV2,
};
