const logger = require('./../../infrastructure/logger');
const Index = require('./Index');
const { v4:uuid } = require('uuid');
const cache = require('./../../infrastructure/cache');
const { listDevices } = require('./../../infrastructure/devices');
const { listDeviceAssociations } = require('./../../infrastructure/directories');
const { getUserOrganisations } = require('./../../infrastructure/organisations');
const { getSearchableString } = require('./utils');
const { getLoginStatsForUser } = require('./../../infrastructure/stats');

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
const pageSize = 250;

const getAllDevices = async (correlationId) => {
  logger.info('Getting list of devices to index', { correlationId });

  const devices = [];
  let pageNumber = 1;
  let numberOfPages;
  while (numberOfPages === undefined || pageNumber <= numberOfPages) {
    if (numberOfPages) {
      logger.debug(`Getting page ${pageNumber} of ${numberOfPages} of devices`, { correlationId });
    } else {
      logger.debug(`Getting page ${pageNumber} of unknown of devices`, { correlationId });
    }
    const page = await listDevices(pageNumber, pageSize, correlationId);

    devices.push(...page.devices);

    numberOfPages = page.numberOfPages;
    pageNumber += 1;
  }
  return devices;
};
const updateDevicesWithAssignees = async (devices, correlationId) => {
  logger.info('Updating devices with assignee details for index', { correlationId });

  let pageNumber = 1;
  let numberOfPages;
  while (!numberOfPages || pageNumber <= numberOfPages) {
    if (numberOfPages) {
      logger.debug(`Getting page ${pageNumber} of ${numberOfPages} of device associations`, { correlationId });
    } else {
      logger.debug(`Getting page ${pageNumber} of unknown of device associations`, { correlationId });
    }
    const page = await listDeviceAssociations(pageNumber, pageSize, correlationId);

    page.deviceAssociations.forEach((association) => {
      const device = devices.find(d => d.serialNumber.toUpperCase() === association.serialNumber.toUpperCase());
      if (!device) {
        logger.warn(`Found user ${association.userId} associated to device ${association.serialNumber}, however could not find device in store`, { correlationId });
        return;
      }

      device.user = association.user;
    });

    numberOfPages = page.numberOfPages;
    pageNumber += 1;
  }
};
const updateDevicesWithOrganisationDetails = async (devices, correlationId) => {
  logger.info('Updating devices with organisation details for index', { correlationId });

  for (let i = 0; i < devices.length; i += 1) {
    const device = devices[i];
    if (!device.user) {
      continue;
    }
    logger.debug(`Getting organisation details for ${device.serialNumber} assigned to ${device.user.sub}`, { correlationId });

    const userOrganisations = await getUserOrganisations(device.user.sub, correlationId);
    device.organisation = userOrganisations.length > 0 ? userOrganisations[0].organisation : undefined;
  }
};
const updateDevicesWithLoginStats = async (devices, correlationId) => {
  logger.info('Updating devices with login stats for index', { correlationId });

  for (let i = 0; i < devices.length; i += 1) {
    const device = devices[i];
    if (!device.user) {
      continue;
    }
    logger.debug(`Getting login stats for ${device.serialNumber} assigned to ${device.user.sub}`, { correlationId });

    const stats = await getLoginStatsForUser(device.user.sub);
    device.loginStats = stats;
  }
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

  async indexAllDevices(correlationId) {
    const devices = await getAllDevices(correlationId);
    await updateDevicesWithAssignees(devices, correlationId);
    await updateDevicesWithOrganisationDetails(devices, correlationId);
    await updateDevicesWithLoginStats(devices, correlationId);

    const indexableDevices = devices.map((device) => {
      const assignee = device.user ? `${device.user.given_name} ${device.user.family_name}` : '';
      const organisationName = device.organisation ? device.organisation.name : '';
      let statusId = 1;

      if (device.deactivated) {
        statusId = 3;
      } else if (device.user) {
        statusId = 2;
      }

      return {
        serialNumber: device.serialNumber,
        statusId,
        assigneeId: device.user ? device.user.sub : '',
        assignee,
        organisationName,
        lastLogin: device.loginStats && device.loginStats.lastLogin ? device.loginStats.lastLogin.getTime() : 0,
        numberOfSuccessfulLoginsInPast12Months: device.loginStats ? device.loginStats.loginsInPast12Months.length : 0,
      };
    });

    return this.store(indexableDevices, correlationId);
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

  static async tidyIndexes(correlationId) {
    await super.tidyIndexes(async (indexes) => {
      const matching = indexes.filter(x => x.match(/^search\-devices\-/));
      const currentIndexName = await cache.get('Pointer:DeviceIndex');
      return matching.filter(x => x !== currentIndexName);
    }, correlationId);
  }
}

module.exports = DeviceIndex;
