const config = require('./../config');
const KeepAliveAgent = require('agentkeepalive').HttpsAgent;
const rp = require('login.dfe.request-promise-retry').defaults({
  agent: new KeepAliveAgent({
    maxSockets: config.hostingEnvironment.agentKeepAlive.maxSockets,
    maxFreeSockets: config.hostingEnvironment.agentKeepAlive.maxFreeSockets,
    timeout: config.hostingEnvironment.agentKeepAlive.timeout,
    keepAliveTimeout: config.hostingEnvironment.agentKeepAlive.keepAliveTimeout,
  }),
});
const omit = require('lodash/omit');

const baseUri = `https://${config.search.azureSearch.serviceName}.search.windows.net/indexes`;
const apiVersion = '2016-09-01';

const createIndex = async (name, structure) => {
  const fields = Object.keys(structure).map((fieldName) => {
    const fieldDetails = structure[fieldName];
    let type;
    switch (fieldDetails.type) {
      case 'String':
        type = 'Edm.String';
        break;
      case 'Collection':
        type = 'Collection(Edm.String)';
        break;
      case 'Int64':
        type = 'Edm.Int64';
        break;
      default:
        throw new Error(`Unrecognised type of ${fieldDetails.type} for field ${fieldName} when creating index ${name}`);
    }

    return {
      name: fieldName,
      type,
      key: fieldDetails.key,
      searchable: fieldDetails.searchable,
      filterable: fieldDetails.filterable,
      sortable: fieldDetails.sortable,
    };
  });

  await rp({
    method: 'PUT',
    uri: `${baseUri}/${name}?api-version=${apiVersion}`,
    headers: {
      'content-type': 'application/json',
      'api-key': config.search.azureSearch.apiKey,
    },
    body: {
      name,
      fields,
    },
    json: true,
  });
};

const storeDocumentsInIndex = async (name, documents) => {
  const indexDocuments = documents.map(x => Object.assign({ '@search.action': 'upload' }, x));
  await rp({
    method: 'POST',
    uri: `${baseUri}/${name}/docs/index?api-version=${apiVersion}`,
    headers: {
      'content-type': 'application/json',
      'api-key': config.search.azureSearch.apiKey,
    },
    body: {
      value: indexDocuments,
    },
    json: true,
  });
};

const searchIndex = async (name, criteria, page, pageSize, sortBy, sortAsc = true, filters = undefined) => {
  const skip = (page - 1) * pageSize;
  let uri = `${baseUri}/${name}/docs?api-version=${apiVersion}&search=${criteria}&$count=true&$skip=${skip}&$top=${pageSize}`;
  if (sortBy) {
    const orderBy = sortAsc ? sortBy : `${sortBy} desc`;
    uri += `&$orderby=${orderBy}`;
  }
  if (filters) {
    let filterParam = '';
    filters.forEach((filter) => {
      if(filterParam.length > 0) {
        filterParam += ' and ';
      }
      filterParam += `${filter.field}/any(x: search.in(x, '${filter.values.join(', ')}', ','))`
    });
    uri += `&$filter=${filterParam}`;
  }

  const response = await rp({
    method: 'GET',
    uri,
    headers: {
      'content-type': 'application/json',
      'api-key': config.search.azureSearch.apiKey,
    },
    json: true,
  });
  let numberOfPages = 1;
  const totalNumberOfResults = parseInt(response['@odata.count']);
  if (!isNaN(totalNumberOfResults)) {
    numberOfPages = Math.ceil(totalNumberOfResults / pageSize);
  }

  return {
    documents: response.value.map(x => omit(x, ['@search.score'])),
    totalNumberOfResults,
    numberOfPages,
  };
};

module.exports = {
  createIndex,
  storeDocumentsInIndex,
  searchIndex,
};