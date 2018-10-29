const logger = require('./../../infrastructure/logger');
const Index = require('./Index');
const cache = require('./../../infrastructure/cache');
const uuid = require('uuid/v4');
const { listUsers } = require('./../../infrastructure/directories');
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
  organisations: {
    type: 'Collection',
    filterable: true,
  },
  searchableOrganisations: {
    type: 'Collection',
    searchable: true,
    filterable: true,
  },
  primaryOrganisation: {
    type: 'String',
    sortable: true,
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
  statusDescription: {
    type: 'String',
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
const getSearchableString = (source) => {
  return source.toLowerCase()
    .replace(/\s/g, '')
    .replace(/@/g, '');
};

class UserIndex extends Index {
  constructor(name) {
    super(name, indexStructure);
  }

  async store(users) {
    const documents = await mapAsync(users, async (user) => {
      const searchableName = getSearchableString(`${user.firstName}${user.lastName}`);
      const searchableEmail = getSearchableString(user.email);
      const document = Object.assign({
        searchableName,
        searchableEmail
      }, user);
      // TODO: add orgs, services and stats
      return document;
    });
    return super.store(documents);
  }

  async indexAllUsers(changedAfter, correlationId) {
    const users = await getAllUsers(changedAfter, correlationId);
    logger.debug(`Found ${users.length} users for indexing into ${this.name} (changed after = ${changedAfter})`, { correlationId });
    await this.store(users);

    // TODO: get invitations
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
    const name = `users-${uuid()}`;
    await Index.create(name, indexStructure);
    return new UserIndex(name);
  }
}

module.exports = UserIndex;
