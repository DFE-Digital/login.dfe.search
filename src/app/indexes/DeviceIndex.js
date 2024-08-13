const Index = require('./Index');
const { v4:uuid } = require('uuid');
const cache = require('./../../infrastructure/cache');
const { getSearchableString } = require('./utils');

const indexStructure = {
  serialNumber: {
    type: 'String',
    key: true,
    searchable: true,
    sortable: true,
  },
  statusId: {
    type: 'Int64',
    filterable: true,
  },
  assigneeId: {
    type: 'String',
  },
  assignee: {
    type: 'String',
  },
  searchableAssignee: {
    type: 'String',
    searchable: true,
    sortable: true,
  },
  organisationName: {
    type: 'String',
  },
  searchableOrganisationName: {
    type: 'String',
    searchable: true,
    sortable: true,
  },
  lastLogin: {
    type: 'Int64',
    sortable: true,
  },
  numberOfSuccessfulLoginsInPast12Months: {
    type: 'Int64',
  },
};

class DeviceIndex extends Index {
  constructor(name) {
    super(name, indexStructure);
  }

  async search(criteria, page = 1, pageSize = 25, sortBy = 'serialNumber', sortAsc = true, filters = undefined) {
    const pageOfDocuments = await super.search(criteria, page, pageSize, sortBy, sortAsc, filters);
    const devices = pageOfDocuments.documents.map(document => ({
      serialNumber: document.serialNumber,
      statusId: document.statusId,
      assigneeId: document.assigneeId,
      assignee: document.assignee,
      organisationName: document.organisationName,
      lastLogin: document.lastLogin,
      numberOfSuccessfulLoginsInPast12Months: document.numberOfSuccessfulLoginsInPast12Months,
    }));
    return {
      devices,
      totalNumberOfResults: pageOfDocuments.totalNumberOfResults,
      numberOfPages: pageOfDocuments.numberOfPages,
    };
  }

  async store(devices, correlationId) {
    const documents = devices.map((device) => {
      return Object.assign({}, device, {
        searchableAssignee: device.assignee ? getSearchableString(device.assignee) : '',
        searchableOrganisationName: device.organisationName ? getSearchableString(device.organisationName) : '',
      });
    });
    return await super.store(documents, correlationId);
  }

  static async current(newIndex = undefined) {
    if (newIndex) {
      await cache.set('Pointer:DeviceIndex', newIndex.name);
      return;
    }

    const currentIndexName = await cache.get('Pointer:DeviceIndex');
    if (!currentIndexName) {
      return undefined;
    }
    return new DeviceIndex(currentIndexName);
  }

  static async create() {
    const name = `search-devices-${uuid()}`;
    await Index.create(name, indexStructure);
    return new DeviceIndex(name);
  }
}

module.exports = DeviceIndex;
