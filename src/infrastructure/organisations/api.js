const { invitation } = require("login.dfe.dao");

const getInvitationOrganisations = async (invitationId) => {
  return invitation.getInvitationResponseById(invitationId);
};

module.exports = {
  getInvitationOrganisations,
};
