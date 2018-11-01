const listUsersOrganisations = async (page, pageSize, correlationId) => {
  return Promise.resolve({
    userOrganisations: [],
    totalNumberOfRecords: 0,
    totalNumberOfPages: 0,
  });
};
const getUserOrganisations = async (userId, correlationId) => {
  return Promise.resolve([]);
};

const listInvitationsOrganisations = async (page, pageSize, correlationId) => {
  return Promise.resolve({
    invitationOrganisations: [],
    totalNumberOfRecords: 0,
    totalNumberOfPages: 0,
  });
};
const getInvitationOrganisations = async (invitationId, correlationId) => {
  return Promise.resolve([]);
};

module.exports = {
  listUsersOrganisations,
  getUserOrganisations,
  listInvitationsOrganisations,
  getInvitationOrganisations,
};
