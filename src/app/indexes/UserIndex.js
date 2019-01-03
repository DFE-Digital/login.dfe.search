const logger = require('./../../infrastructure/logger');
const uuid = require('uuid/v4');
const uniq = require('lodash/uniq');
const omit = require('lodash/omit');
const Index = require('./Index');
const cache = require('./../../infrastructure/cache');
const { getLoginStatsForUser } = require('./../../infrastructure/stats');
const { listUsers, listInvitations } = require('./../../infrastructure/directories');
const { listUsersOrganisations, getUserOrganisations, listInvitationsOrganisations, getInvitationOrganisations } = require('./../../infrastructure/organisations');
const { listUserServices, listAllUsersServices, listInvitationServices, listAllInvitationsServices } = require('./../../infrastructure/access');
const { mapAsync } = require('./../../utils/async');

const indexStructure = {
  id: {
    type: 'String',
    key: true,
    filterable: true,
  },
  firstName: {
    type: 'String',
  },
  lastName: {
    type: 'String',
  },
  searchableName: {
    type: 'String',
    searchable: true,
    sortable: true,
  },
  email: {
    type: 'String',
  },
  searchableEmail: {
    type: 'String',
    searchable: true,
    sortable: true,
  },
  primaryOrganisation: {
    type: 'String',
    sortable: true,
  },
  organisations: {
    type: 'Collection',
    filterable: true,
  },
  searchableOrganisations: {
    type: 'Collection',
    searchable: true,
  },
  organisationCategories: {
    type: 'Collection',
    filterable: true,
  },
  organisationsJson: {
    type: 'String',
  },
  services: {
    type: 'Collection',
    filterable: true,
  },
  lastLogin: {
    type: 'Int64',
  },
  numberOfSuccessfulLoginsInPast12Months: {
    type: 'Int64',
  },
  statusLastChangedOn: {
    type: 'Int64',
  },
  statusId: {
    type: 'Int64',
    filterable: true,
  },
  pendingEmail: {
    type: 'String',
  },
  legacyUsernames: {
    type: 'Collection',
    searchable: true,
  },
};
const pageSize = 500;

const getAllUsers = async (changedAfter, correlationId) => {
  const users = [];
  let hasMorePages = true;
  let pageNumber = 1;
  let numberOfPages;
  while (hasMorePages) {
    if (numberOfPages) {
      logger.debug(`Reading page ${pageNumber} of ${numberOfPages} of users`, { correlationId });
    } else {
      logger.debug(`Reading page ${pageNumber} of users`, { correlationId });
    }

    try {
      const page = await listUsers(pageNumber, pageSize, false, false, true, changedAfter, correlationId);
      const mapped = page.users.map((user) => ({
        id: user.sub,
        firstName: user.given_name,
        lastName: user.family_name,
        email: user.email,
        statusId: user.status,
        legacyUsernames: user.legacyUsernames,
      }));

      users.push(...mapped);

      numberOfPages = page.numberOfPages;
      pageNumber++;
      hasMorePages = pageNumber <= page.numberOfPages;
    } catch (e) {
      throw new Error(`Error reading page ${pageNumber} of users - ${e.message}`);
    }
  }
  return users;
};
const getAllUserOrganisations = async (correlationId) => {
  const organisations = [];
  let hasMorePages = true;
  let pageNumber = 1;
  let numberOfPages;
  while (hasMorePages) {
    if (numberOfPages) {
      logger.debug(`Reading page ${pageNumber} of ${numberOfPages} of user organisations`, { correlationId });
    } else {
      logger.debug(`Reading page ${pageNumber} of user organisations`, { correlationId });
    }

    try {
      const page = await listUsersOrganisations(pageNumber, pageSize, correlationId);

      organisations.push(...page.userOrganisations);

      numberOfPages = page.totalNumberOfPages;
      pageNumber++;
      hasMorePages = pageNumber <= numberOfPages;
    } catch (e) {
      throw new Error(`Error reading page ${pageNumber} of user organisations - ${e.message}`);
    }
  }
  return organisations;
};
const getAllUserServices = async (correlationId) => {
  const services = [];
  let hasMorePages = true;
  let pageNumber = 1;
  let numberOfPages;
  while (hasMorePages) {
    if (numberOfPages) {
      logger.debug(`Reading page ${pageNumber} of ${numberOfPages} of user services`, { correlationId });
    } else {
      logger.debug(`Reading page ${pageNumber} of user services`, { correlationId });
    }

    try {
      const page = await listAllUsersServices(pageNumber, pageSize, correlationId);

      services.push(...page.services);

      numberOfPages = page.numberOfPages;
      pageNumber++;
      hasMorePages = pageNumber <= page.numberOfPages;
    } catch (e) {
      throw new Error(`Error reading page ${pageNumber} of user services - ${e.message}`);
    }
  }
  return services;
};
const mergeUsersOrganisationsServices = (users, userOrganisations, userServices) => {
  return users.map((user) => {
    const userOrgMappings = userOrganisations.filter(x => x.userId.toLowerCase() === user.id.toLowerCase());
    const primaryOrganisation = userOrgMappings.length > 0 ? userOrgMappings[0].organisation.name : undefined;
    const organisations = userOrgMappings.map(x => x.organisation.id);
    const searchableOrganisations = userOrgMappings.map(x => getSearchableString(x.organisation.name));
    const organisationCategories = userOrgMappings.map(x => x.organisation.category ? x.organisation.category.id : undefined).filter(x => x !== undefined);
    const organisationsJson = JSON.stringify(userOrgMappings.map(orgMap => ({
      id: orgMap.organisation.id,
      name: orgMap.organisation.name,
      categoryId: orgMap.organisation.category ? orgMap.organisation.category.id : undefined,
      statusId: orgMap.organisation.status.id,
      roleId: orgMap.role ? orgMap.role.id : 0,
    })));
    const services = userServices.filter(x => x.userId.toLowerCase() === user.id.toLowerCase()).map(x => x.serviceId);
    return Object.assign({}, user, {
      primaryOrganisation,
      organisations,
      searchableOrganisations,
      organisationCategories,
      organisationsJson,
      services
    });
  });
};
const getAllInvitations = async (changedAfter, correlationId) => {
  const invitations = [];
  let hasMorePages = true;
  let pageNumber = 1;
  let numberOfPages;
  while (hasMorePages) {
    if (numberOfPages) {
      logger.debug(`Reading page ${pageNumber} of ${numberOfPages} of invitations`, { correlationId });
    } else {
      logger.debug(`Reading page ${pageNumber} of invitations`, { correlationId });
    }

    try {
      const page = await listInvitations(pageNumber, pageSize, changedAfter, correlationId);
      const mapped = page.invitations.filter(i => !i.isCompleted).map((invitation) => ({
        id: `inv-${invitation.id}`,
        firstName: invitation.firstName,
        lastName: invitation.lastName,
        email: invitation.email,
        statusId: invitation.deactivated ? -2 : -1,
      }));

      invitations.push(...mapped);

      numberOfPages = page.numberOfPages;
      pageNumber++;
      hasMorePages = pageNumber <= page.numberOfPages;
    } catch (e) {
      throw new Error(`Error reading page ${pageNumber} of invitations - ${e.message}`);
    }
  }
  return invitations;
};
const getAllInvitationOrganisations = async (correlationId) => {
  const organisations = [];
  let hasMorePages = true;
  let pageNumber = 1;
  let numberOfPages;
  while (hasMorePages) {
    if (numberOfPages) {
      logger.debug(`Reading page ${pageNumber} of ${numberOfPages} of invitation organisations`, { correlationId });
    } else {
      logger.debug(`Reading page ${pageNumber} of invitation organisations`, { correlationId });
    }

    try {
      const page = await listInvitationsOrganisations(pageNumber, pageSize, correlationId);

      organisations.push(...page.invitationOrganisations);

      numberOfPages = page.numberOfPages;
      pageNumber++;
      hasMorePages = pageNumber <= page.numberOfPages;
    } catch (e) {
      throw new Error(`Error reading page ${pageNumber} of invitation organisations - ${e.message}`);
    }
  }
  return organisations;
};
const getAllInvitationServices = async (correlationId) => {
  const services = [];
  let hasMorePages = true;
  let pageNumber = 1;
  let numberOfPages;
  while (hasMorePages) {
    if (numberOfPages) {
      logger.debug(`Reading page ${pageNumber} of ${numberOfPages} of invitation services`, { correlationId });
    } else {
      logger.debug(`Reading page ${pageNumber} of invitation services`, { correlationId });
    }

    try {
      const page = await listAllInvitationsServices(pageNumber, pageSize, correlationId);

      services.push(...page.services);

      numberOfPages = page.numberOfPages;
      pageNumber++;
      hasMorePages = pageNumber <= page.numberOfPages;
    } catch (e) {
      throw new Error(`Error reading page ${pageNumber} of invitation services - ${e.message}`);
    }
  }
  return services;
};
const mergeInvitationsOrganisationsServices = (invitations, invitationOrganisations, invitationServices) => {
  return invitations.map((invitation) => {
    const invitationOrgMappings = invitationOrganisations.filter(x => x.invitationId.toLowerCase() === invitation.id.toLowerCase());
    const primaryOrganisation = invitationOrgMappings.length > 0 ? invitationOrgMappings[0].organisation.name : undefined;
    const organisations = invitationOrgMappings.map(x => x.organisation.id);
    const searchableOrganisations = invitationOrgMappings.map(x => getSearchableString(x.organisation.name));
    const organisationCategories = invitationOrgMappings.map(x => x.organisation.category ? x.organisation.category.id : undefined).filter(x => x !== undefined);
    const organisationsJson = JSON.stringify(invitationOrgMappings.map(orgMap => ({
      id: orgMap.organisation.id,
      name: orgMap.organisation.name,
      categoryId: orgMap.organisation.category ? orgMap.organisation.category.id : undefined,
      statusId: orgMap.organisation.status.id,
      roleId: orgMap.role.id,
    })));
    const services = invitationServices.filter(x => `inv-${x.invitationId.toLowerCase()}` === invitation.id.toLowerCase()).map(x => x.serviceId);
    return Object.assign({}, invitation, {
      primaryOrganisation,
      organisations,
      searchableOrganisations,
      organisationCategories,
      organisationsJson,
      services
    });
  });
};
const getSearchableString = (source) => {
  return source.toLowerCase()
    .replace(/\s/g, '')
    .replace(/@/g, '__at__')
    .replace(/\./g, '__dot__');
};
const getOrganisations = async (documentId, correlationId) => {
  let accessibleOrganisations;
  if (documentId.startsWith('inv-')) {
    accessibleOrganisations = await getInvitationOrganisations(documentId.substr(4), correlationId)
  } else {
    accessibleOrganisations = await getUserOrganisations(documentId, correlationId)
  }
  return accessibleOrganisations.map(accessibleOrganisation => ({
    id: accessibleOrganisation.organisation.id,
    name: accessibleOrganisation.organisation.name,
    category: accessibleOrganisation.organisation.category ? accessibleOrganisation.organisation.category.id : undefined,
  }));
};
const getServices = async (documentId, correlationId) => {
  let services;
  if (documentId.startsWith('inv-')) {
    services = await listInvitationServices(documentId.substr(4), correlationId)
  } else {
    services = await listUserServices(documentId, correlationId)
  }
  return services ? services.map(service => service.serviceId) : [];
};

class UserIndex extends Index {
  constructor(name) {
    super(name, indexStructure);
  }

  async search(criteria, page = 1, pageSize = 25, sortBy = 'searchableName', sortAsc = true, filters = undefined) {
    const pageOfDocuments = await super.search(criteria, page, pageSize, sortBy, sortAsc, filters);
    const users = pageOfDocuments.documents.map(document => ({
      id: document.id,
      firstName: document.firstName,
      lastName: document.lastName,
      email: document.email,
      primaryOrganisation: document.primaryOrganisation,
      organisations: JSON.parse(document.organisationsJson),
      services: document.services,
      lastLogin: document.lastLogin ? new Date(document.lastLogin) : null,
      numberOfSuccessfulLoginsInPast12Months: document.numberOfSuccessfulLoginsInPast12Months,
      statusLastChangedOn: document.statusLastChangedOn ? new Date(document.statusLastChangedOn) : null,
      statusId: document.statusId,
      pendingEmail: document.pendingEmail,
      legacyUsernames: document.legacyUsernames,
    }));
    return {
      users,
      totalNumberOfResults: pageOfDocuments.totalNumberOfResults,
      numberOfPages: pageOfDocuments.numberOfPages,
    }
  }

  async store(users, correlationId) {
    const documents = await mapAsync(users, async (user) => {
      const searchableName = getSearchableString(`${user.firstName}${user.lastName}`);
      const searchableEmail = getSearchableString(user.email);
      const document = Object.assign({
        searchableName,
        searchableEmail,
      }, user);
      if (!document.legacyUsernames) {
        document.legacyUsernames = [];
      }
      if (document.organisationsJson) {
        const orgsModel = JSON.parse(document.organisationsJson);
        if (!document.primaryOrganisation) {
          document.primaryOrganisation = orgsModel.length > 0 ? orgsModel[0].name : undefined;
        }
        if (!document.organisations) {
          document.organisations = uniq(orgsModel.map(x => x.id));
        }
        if (!document.searchableOrganisations) {
          document.searchableOrganisations = uniq(orgsModel.map(x => getSearchableString(x.name)));
        }
        if (!document.organisationCategories) {
          document.organisationCategories = uniq(orgsModel.map(x => x.category)).filter(x => x !== undefined);
        }
      }
      if (!document.organisations) {
        logger.debug(`getting organisations for ${document.id}`, { correlationId });
        const organisations = await getOrganisations(document.id);
        document.primaryOrganisation = organisations.length > 0 ? organisations[0].name : undefined;
        document.organisations = uniq(organisations.map(x => x.id));
        document.searchableOrganisations = uniq(organisations.map(x => getSearchableString(x.name)));
        document.organisationCategories = uniq(organisations.map(x => x.category)).filter(x => x !== undefined);
        document.organisationsJson = JSON.stringify(organisations.map(orgMap => ({
          id: orgMap.id,
          name: orgMap.name,
          categoryId: orgMap.category ? orgMap.category : undefined,
          statusId: orgMap.status || 0,
          roleId: orgMap.role || 0,
        })));
      }
      if (!document.services) {
        logger.debug(`getting services for ${document.id}`, { correlationId });
        document.services = await getServices(document.id);
      }
      if (!document.id.startsWith('inv-') && (!document.lastLogin || document.numberOfSuccessfulLoginsInPast12Months || document.statusLastChangedOn)) {
        logger.debug(`getting stats for ${document.id}`, { correlationId });
        const stats = await getLoginStatsForUser(document.id);
        if (stats) {
          document.lastLogin = document.lastLogin || stats.lastLogin;
          document.numberOfSuccessfulLoginsInPast12Months = document.numberOfSuccessfulLoginsInPast12Months || stats.loginsInPast12Months.length;
          document.statusLastChangedOn = document.statusLastChangedOn || stats.lastStatusChange;
        }
      }
      document.lastLogin = document.lastLogin ? document.lastLogin.getTime() : undefined;
      document.statusLastChangedOn = document.statusLastChangedOn ? document.statusLastChangedOn.getTime() : undefined;
      return document;
    });
    return super.store(documents, correlationId);
  }

  async indexAllUsers(correlationId) {
    const getUsersPromise = getAllUsers(undefined, correlationId);
    const getUserOrganisationsPromise = getAllUserOrganisations(correlationId);
    const getUserServicesPromise = getAllUserServices(correlationId);
    const users = await getUsersPromise;
    const userOrganisations = await getUserOrganisationsPromise;
    const userServices = await getUserServicesPromise;
    logger.debug(`Found ${users.length} users, ${userOrganisations.length} organisations and ${userServices.length} services for indexing into ${this.name}`, { correlationId });
    const mergedUsers = mergeUsersOrganisationsServices(users, userOrganisations, userServices);
    logger.debug('Merged user details');
    await this.store(mergedUsers, correlationId);
    logger.debug(`Stored ${mergedUsers.length} users in ${this.name}`);

    const getInvitationsPromise = getAllInvitations(undefined, correlationId);
    const getInvitationOrganisationsPromise = getAllInvitationOrganisations(correlationId);
    const getInvitationServicesPromise = getAllInvitationServices(correlationId);
    const invitations = await getInvitationsPromise;
    const invitationOrganisations = await getInvitationOrganisationsPromise;
    const invitationServices = await getInvitationServicesPromise;
    logger.debug(`Found ${invitations.length} invitations and ${invitationServices.length} services for indexing into ${this.name}`, { correlationId });
    const mergedInvitations = mergeInvitationsOrganisationsServices(invitations, invitationOrganisations, invitationServices);
    logger.debug('Merged invitation details');
    await this.store(mergedInvitations, correlationId);
    logger.debug(`Stored ${mergedInvitations.length} invitations in ${this.name}`);
  }

  async indexUsersChangedAfter(changedAfter, correlationId) {
    const users = await getAllUsers(changedAfter, correlationId);
    logger.debug(`Found ${users.length} users for indexing into ${this.name} (changed after = ${changedAfter})`, { correlationId });
    await this.store(users, correlationId);

    const invitations = await getAllInvitations(changedAfter, correlationId);
    logger.debug(`Found ${invitations.length} invitations for indexing into ${this.name} (changed after = ${changedAfter})`, { correlationId });
    await this.store(invitations, correlationId);
  }

  static async current(newIndex = undefined) {
    if (newIndex) {
      await cache.set('Pointer:UserIndex', newIndex.name);
      return;
    }

    const currentIndexName = await cache.get('Pointer:UserIndex');
    if (!currentIndexName) {
      return undefined;
    }
    return new UserIndex(currentIndexName);
  }

  static async create() {
    const name = `search-users-${uuid()}`;
    await Index.create(name, indexStructure);
    return new UserIndex(name);
  }

  static async tidyIndexes(correlationId) {
    await super.tidyIndexes('users', async (indexes) => {
      const matching = indexes.filter(x => x.match(/^search\-users\-/));
      const currentIndexName = await cache.get('Pointer:UserIndex');
      return matching.filter(x => x !== currentIndexName);
    }, correlationId);
  }
}

module.exports = UserIndex;
