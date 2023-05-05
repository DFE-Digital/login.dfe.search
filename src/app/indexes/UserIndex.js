const logger = require('./../../infrastructure/logger');
const { v4:uuid } = require('uuid');
const uniq = require('lodash/uniq');
const flatten = require('lodash/flatten');
const Index = require('./Index');
const cache = require('./../../infrastructure/cache');
const { getLoginStatsForUser } = require('./../../infrastructure/stats');
const { listUsers, listInvitations, getUser, getInvitation } = require('./../../infrastructure/directories');
const { listUsersOrganisations, getUserOrganisationsV2, listInvitationsOrganisations, getInvitationOrganisations } = require('./../../infrastructure/organisations');
const { listUserServices, listAllUsersServices, listInvitationServices, listAllInvitationsServices } = require('./../../infrastructure/access');
const { mapAsync } = require('./../../utils/async');
const BasicArrayList = require('./../../utils/BasicArrayList');
const { getSearchableString } = require('./utils');

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
  organisationIdentifiers: {
    type: 'Collection',
    searchable: true,
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
    sortable: true,
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
    sortable: true,
  },
  pendingEmail: {
    type: 'String',
  },
  legacyUsernames: {
    type: 'Collection',
    searchable: true,
  },
};
const pageSize = 250;
const chunkSize = 50;

const getAllUsers = async (changedAfter, correlationId) => {
  logger.info(`Begin reading user changed after ${changedAfter}`, { correlationId });

  let users;
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
        lastLogin: user.last_login ? new Date(user.last_login) : null,
        legacyUsernames: user.legacyUsernames
      }));

      if (!users) {
        users = new BasicArrayList(page.numberOfPages * pageSize);
      }
      users.add(mapped);

      numberOfPages = page.numberOfPages;
      pageNumber++;
      hasMorePages = pageNumber <= page.numberOfPages;
    } catch (e) {
      throw new Error(`Error reading page ${pageNumber} of users - ${e.message}`);
    }
  }
  return users.toArray();
};

const getUserById = async (id, correlationId) => {
  logger.info('Begin get user by id', {correlationId});

  const user = await getUser(id, correlationId);
  const mapped = {
    id: user.sub,
    firstName: user.given_name,
    lastName: user.family_name,
    email: user.email,
    statusId: user.status,
    lastLogin: user.last_login ? new Date(user.last_login) : null,
    legacyUsernames: user.legacyUsernames
  };
  return [mapped]
};

const updateUsersWithOrganisations = async (users, correlationId) => {
  logger.info('Begin reading user organisations', { correlationId });

  let hasMorePages = true;
  let pageNumber = 1;
  let numberOfPages;
  let user;
  while (hasMorePages) {
    if (numberOfPages) {
      logger.debug(`Reading page ${pageNumber} of ${numberOfPages} of user organisations`, { correlationId });
    } else {
      logger.debug(`Reading page ${pageNumber} of user organisations`, { correlationId });
    }

    try {
      const page = await listUsersOrganisations(pageNumber, pageSize);

      page.userOrganisations.forEach((userOrganisation) => {
        if (!user || user.id.toLowerCase() !== userOrganisation.userId.toLowerCase()) {
          user = users.find(u => u.id.toLowerCase() === userOrganisation.userId.toLowerCase());
          if (!user) {
            logger.warn(`User organisation mapping with id ${userOrganisation.id} is for unknown user ${userOrganisation.userId}`, { correlationId });
            return;
          }
        }

        user.organisationMappings.push(userOrganisation);
      });

      numberOfPages = page.totalNumberOfPages;
      pageNumber++;
      hasMorePages = pageNumber <= numberOfPages;
    } catch (e) {
      throw new Error(`Error reading page ${pageNumber} of user organisations - ${e.message}`);
    }
  }

  console.debug('All user organisations read. Mapping details to user...');
  for (let i = 0; i < users.length; i += 1) {
    user = users[i];
    console.debug(`Mapping org details for user ${i + 1} of ${users.length} (${user.email} / ${user.id})`, { correlationId });

    user.primaryOrganisation = user.organisationMappings.length > 0 ? user.organisationMappings[0].organisation.name : undefined;
    user.organisations = user.organisationMappings.map(x => x.organisation.id);
    user.searchableOrganisations = user.organisationMappings.map(x => getSearchableString(x.organisation.name));
    user.organisationCategories = user.organisationMappings.map(x => x.organisation.category ? x.organisation.category.id : undefined).filter(x => x !== undefined);
    user.organisationIdentifiers = flatten(user.organisationMappings.map(orgMap => ([
      orgMap.organisation.urn,
      orgMap.organisation.uid,
      orgMap.organisation.establishmentNumber,
      orgMap.organisation.localAuthority ? orgMap.organisation.localAuthority.establishmentNumber : undefined,
    ]))).filter(id => id !== undefined && id !== null);
    user.organisationsJson = JSON.stringify(user.organisationMappings.map(orgMap => ({
      id: orgMap.organisation.id,
      name: orgMap.organisation.name,
      urn: orgMap.organisation.urn,
      uid: orgMap.organisation.uid,
      establishmentNumber: orgMap.organisation.establishmentNumber,
      laNumber: orgMap.organisation.localAuthority ? orgMap.organisation.localAuthority.establishmentNumber : undefined,
      categoryId: orgMap.organisation.category ? orgMap.organisation.category.id : undefined,
      statusId: orgMap.organisation.status ? orgMap.organisation.status.id : 0,
      roleId: orgMap.role ? orgMap.role.id : 0,
      numericIdentifier: orgMap.numericIdentifier,
      textIdentifier: orgMap.textIdentifier,
    })));

    user.organisationMappings = undefined;
  }
};
const updateUsersWithServices = async (users, correlationId) => {
  logger.info('Begin reading user services', { correlationId });

  let hasMorePages = true;
  let pageNumber = 1;
  let numberOfPages;
  let user;
  while (hasMorePages) {
    if (numberOfPages) {
      logger.debug(`Reading page ${pageNumber} of ${numberOfPages} of user services`, { correlationId });
    } else {
      logger.debug(`Reading page ${pageNumber} of user services`, { correlationId });
    }

    try {
      const page = await listAllUsersServices(pageNumber, pageSize, correlationId);

      page.services.forEach((userService) => {
        if (!user || user.id.toLowerCase() !== userService.userId.toLowerCase()) {
          user = users.find(u => u.id.toLowerCase() === userService.userId.toLowerCase());
        }
        if (!user) {
          return;
        }

        user.services.push(userService.serviceId);
      });

      numberOfPages = page.numberOfPages;
      pageNumber++;
      hasMorePages = pageNumber <= page.numberOfPages;
    } catch (e) {
      throw new Error(`Error reading page ${pageNumber} of user services - ${e.message}`);
    }
  }
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

const getInvitationById = async (id, correlationId) => {
  logger.info('Begin get invitation by id', {correlationId});

  const invitation = await getInvitation(id.substr(4), correlationId);
  if (!invitation.isCompleted) {
    const mapped = {
      id: `inv-${invitation.id}`,
      firstName: invitation.firstName,
      lastName: invitation.lastName,
      email: invitation.email,
      statusId: invitation.deactivated ? -2 : -1,
    };
    return [mapped]
  }
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
      const page = await listInvitationsOrganisations(pageNumber, pageSize);

      organisations.push(...page.invitationOrganisations);

      numberOfPages = page.totalNumberOfPages;
      pageNumber++;
      hasMorePages = pageNumber <= numberOfPages;
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
    const invitationOrgMappings = invitationOrganisations.filter(x => `inv-${x.invitationId.toLowerCase()}` === invitation.id.toLowerCase());
    const primaryOrganisation = invitationOrgMappings.length > 0 ? invitationOrgMappings[0].organisation.name : undefined;
    const organisations = invitationOrgMappings.map(x => x.organisation.id);
    const searchableOrganisations = invitationOrgMappings.map(x => getSearchableString(x.organisation.name));
    const organisationCategories = invitationOrgMappings.map(x => x.organisation.category ? x.organisation.category.id : undefined).filter(x => x !== undefined);
    const organisationsJson = JSON.stringify(invitationOrgMappings.map(orgMap => ({
      id: orgMap.organisation.id,
      name: orgMap.organisation.name,
      categoryId: orgMap.organisation.category ? orgMap.organisation.category.id : undefined,
      statusId: orgMap.organisation.status ? orgMap.organisation.status.id : 0,
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


const getOrganisations = async (documentId, correlationId) => {
  let accessibleOrganisations;
  if (documentId.startsWith('inv-')) {
    accessibleOrganisations = await getInvitationOrganisations(documentId.substr(4));
  } else {
    accessibleOrganisations = await getUserOrganisationsV2(documentId, correlationId);
  }
  return accessibleOrganisations.map(accessibleOrganisation => ({
    id: accessibleOrganisation.organisation.id,
    name: accessibleOrganisation.organisation.name,
    urn: accessibleOrganisation.organisation.urn,
    uid: accessibleOrganisation.organisation.uid,
    ukprn: accessibleOrganisation.organisation.ukprn,
    category: accessibleOrganisation.organisation.category ? accessibleOrganisation.organisation.category.id : undefined,
    establishmentNumber: accessibleOrganisation.organisation.establishmentNumber,
    laNumber: accessibleOrganisation.organisation.localAuthority ? accessibleOrganisation.organisation.localAuthority.establishmentNumber : undefined,
    status: accessibleOrganisation.organisation.status ? accessibleOrganisation.organisation.status.id : 0,
    role: accessibleOrganisation.role ? accessibleOrganisation.role.id : 0,
    numericIdentifier: accessibleOrganisation.numericIdentifier,
    textIdentifier: accessibleOrganisation.textIdentifier
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

  async search(criteria, page = 1, pageSize = 25, sortBy = 'searchableName', sortAsc = true, filters = undefined, searchFields = undefined) {
    const pageOfDocuments = await super.search(criteria, page, pageSize, sortBy, sortAsc, filters, searchFields);
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

  async storeChunked(users, correlationId) {
    const usersLength = users.length;
    for (let i = 0; i < usersLength; i+=chunkSize) {
      const chunk = users.slice(i, i+chunkSize);
      await this.store(chunk, correlationId);
    }
  }

  async store(users, correlationId) {
    const documents = await mapAsync(users, async (user, index) => {
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
        if (!document.organisationIdentifiers) {
          document.organisationIdentifiers = flatten(orgsModel.map(orgMap => ([
            orgMap.urn,
            orgMap.uid,
            orgMap.establishmentNumber,
            orgMap.localAuthority ? orgMap.localAuthority.establishmentNumber : undefined,
          ]))).filter(id => id !== undefined && id !== null);
        }
      }
      if (!document.organisations) {
        logger.debug(`getting organisations for ${document.id} (${index + 1} of ${users.length})`, { correlationId });
        const organisations = await getOrganisations(document.id);
        document.primaryOrganisation = organisations.length > 0 ? organisations[0].name : undefined;
        document.organisations = uniq(organisations.map(x => x.id));
        document.searchableOrganisations = uniq(organisations.map(x => getSearchableString(x.name)));
        document.organisationCategories = uniq(organisations.map(x => x.category)).filter(x => x !== undefined);
        document.organisationIdentifiers = flatten(organisations.map(x => ([
          x.urn,
          x.uid,
          x.establishmentNumber,
          x.localAuthority ? x.localAuthority.establishmentNumber : undefined,
        ]))).filter(id => id !== undefined && id !== null);
        document.organisationsJson = JSON.stringify(organisations.map(orgMap => ({
          id: orgMap.id,
          name: orgMap.name,
          urn: orgMap.urn,
          uid: orgMap.uid,
          ukprn: orgMap.ukprn,
          establishmentNumber: orgMap.establishmentNumber,
          laNumber: orgMap.laNumber,
          categoryId: orgMap.category ? orgMap.category : undefined,
          statusId: orgMap.status || 0,
          roleId: orgMap.role,
          numericIdentifier: orgMap.numericIdentifier,
          textIdentifier: orgMap.textIdentifier
        })));
      }
      if (!document.services) {
        logger.debug(`getting services for ${document.id} (${index + 1} of ${users.length})`, { correlationId });
        document.services = await getServices(document.id);
      }
      if (!document.id.startsWith('inv-') && (!document.lastLogin || document.numberOfSuccessfulLoginsInPast12Months || document.statusLastChangedOn)) {
        logger.debug(`getting stats for ${document.id} (${index + 1} of ${users.length})`, { correlationId });
        const stats = await getLoginStatsForUser(document.id);
        if (stats) {
          document.lastLogin = document.lastLogin || stats.lastLogin;
          document.numberOfSuccessfulLoginsInPast12Months = document.numberOfSuccessfulLoginsInPast12Months || stats.loginsInPast12Months.length;
          document.statusLastChangedOn = document.statusLastChangedOn || stats.lastStatusChange;
        }
      }
      document.lastLogin = document.lastLogin ? document.lastLogin.getTime() : 0;
      document.statusLastChangedOn = document.statusLastChangedOn ? document.statusLastChangedOn.getTime() : undefined;
      return document;
    });
    return await super.store(documents, correlationId);
  }

  async indexAllUsers(correlationId) {
    const stats = {
      start: Date.now(),
      readUsers: 0,
      addedUserOrgs: 0,
      addedUserServices: 0,
      storedUsers: 0,
      readInvitationData: 0,
      mergedInvitationData: 0,
      storedInvitations: 0,
    };

    const users = await getAllUsers(undefined, correlationId);
    users.forEach((user) => {
      user.organisationMappings = [];
      user.services = [];
    });
    stats.readUsers = Date.now();
    await updateUsersWithOrganisations(users, correlationId);
    stats.addedUserOrgs = Date.now();
    await updateUsersWithServices(users, correlationId);
    stats.addedUserServices = Date.now();
    logger.debug(`Finished building ${users.length} user details. Storing...`);
    await this.storeChunked(users, correlationId);
    stats.storedUsers = Date.now();
    logger.debug(`Stored ${users.length} users in ${this.name}`);

    const getInvitationsPromise = getAllInvitations(undefined, correlationId);
    const getInvitationOrganisationsPromise = getAllInvitationOrganisations(correlationId);
    const getInvitationServicesPromise = getAllInvitationServices(correlationId);
    const invitations = await getInvitationsPromise;
    const invitationOrganisations = await getInvitationOrganisationsPromise;
    const invitationServices = await getInvitationServicesPromise;
    stats.readInvitationData = Date.now();
    logger.debug(`Found ${invitations.length} invitations and ${invitationServices.length} services for indexing into ${this.name}`, { correlationId });
    const mergedInvitations = mergeInvitationsOrganisationsServices(invitations, invitationOrganisations, invitationServices);
    stats.mergedInvitationData = Date.now();
    logger.debug('Merged invitation details');
    await this.storeChunked(mergedInvitations, correlationId);
    stats.storedInvitations = Date.now();
    logger.debug(`Stored ${mergedInvitations.length} invitations in ${this.name}`);

    logger.debug(`re-index stats are: ${JSON.stringify(stats)}`);
  }

  async indexUsersChangedAfter(changedAfter, correlationId) {
    const users = await getAllUsers(changedAfter, correlationId);
    logger.debug(`Found ${users.length} users for indexing into ${this.name} (changed after = ${changedAfter})`, { correlationId });
    await this.storeChunked(users, correlationId);

    const invitations = await getAllInvitations(changedAfter, correlationId);
    logger.debug(`Found ${invitations.length} invitations for indexing into ${this.name} (changed after = ${changedAfter})`, { correlationId });
    await this.storeChunked(invitations, correlationId);
  }

  async indexUserById(id, correlationId) {
    if (id.startsWith('inv-')) {
      const invitation = await getInvitationById(id, correlationId);
      logger.debug(`Invitation ${id} for indexing into ${this.name}`, { correlationId });
      await this.store(invitation, correlationId);

    } else {
      const user = await getUserById(id, correlationId);
      logger.debug(`User ${id} for indexing into ${this.name}`, { correlationId });
      await this.store(user, correlationId);
    }
  }

  async deleteUserById(id) {
    logger.debug(`Deleting document with id: ${id}`);
    await super.delete(id);
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
    await super.tidyIndexes(async (indexes) => {
      const matching = indexes.filter(x => x.match(/^search\-users\-/));
      const currentIndexName = await cache.get('Pointer:UserIndex');
      return matching.filter(x => x !== currentIndexName);
    }, correlationId);
  }
}




module.exports = UserIndex;
