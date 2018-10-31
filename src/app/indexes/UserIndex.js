const logger = require('./../../infrastructure/logger');
const uuid = require('uuid/v4');
const uniq = require('lodash/uniq');
const omit = require('lodash/omit');
const Index = require('./Index');
const cache = require('./../../infrastructure/cache');
const { getLoginStatsForUser } = require('./../../infrastructure/stats');
const { listUsers, listInvitations } = require('./../../infrastructure/directories');
const { getUserOrganisations, getInvitationOrganisations } = require('./../../infrastructure/organisations');
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

class UserIndex extends Index {
  constructor(name) {
    super(name, indexStructure);
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
      if (!document.organisations) {
        logger.debug(`getting organisations for ${document.id}`, { correlationId });
        const organisations = await getOrganisations(document.id);
        document.primaryOrganisation = organisations.length > 0 ? organisations[0].name : undefined;
        document.organisations = uniq(organisations.map(x => x.id));
        document.searchableOrganisations = uniq(organisations.map(x => getSearchableString(x.name)));
        document.organisationCategories = uniq(organisations.map(x => x.category)).filter(x => x !== undefined);
      }
      if (!document.services) {
        logger.debug(`getting services for ${document.id}`, { correlationId });
        // TODO: add services
        document.services = [];
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
    return super.store(documents);
  }

  async search(criteria, page = 1, pageSize = 25, sortBy = 'searchableName', sortAsc = true, filters = undefined) {
    const pageOfDocuments = await super.search(criteria, page, pageSize, sortBy, sortAsc, filters);
    return {
      users: pageOfDocuments.documents.map(d => omit(d, ['searchableName', 'searchableEmail', 'searchableOrganisations'])),
      totalNumberOfResults: pageOfDocuments.totalNumberOfResults,
      numberOfPages: pageOfDocuments.numberOfPages,
    }
  }

  async indexAllUsers(changedAfter, correlationId) {
    const users = await getAllUsers(changedAfter, correlationId);
    logger.debug(`Found ${users.length} users for indexing into ${this.name} (changed after = ${changedAfter})`, { correlationId });
    await this.store(users);

    const invitations = await getAllInvitations(changedAfter, correlationId);
    logger.debug(`Found ${invitations.length} invitations for indexing into ${this.name} (changed after = ${changedAfter})`, { correlationId });
    await this.store(invitations, correlationId);
  }

  static async current(newIndex = undefined) {
    if (newIndex) {
      await cache.set('Pointer:UserIndex', newIndex.name)
    } else {
      const currentIndexName = await cache.get('Pointer:UserIndex');
      return new UserIndex(currentIndexName);
    }
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
