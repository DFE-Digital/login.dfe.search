const chunk = require('lodash/chunk');
const logger = require('./../../infrastructure/logger');
const { listIndexes, createIndex, storeDocumentsInIndex, searchIndex, deleteIndex, deleteDocumentInIndex } = require('./../../infrastructure/search');
const cache = require('./../../infrastructure/cache');
const { forEachAsync } = require('./../../utils/async');

const ensureValueValidForField = (value, field) => {
  if (!value && field.key) {
    throw new Error(`document does not have key field ${field.name}`);
  }
  if (!value && field.type === 'Collection') {
    throw new Error(`document does not have a value for field ${field.name}. Collection fields must have a value`);
  }
  if (field.type === 'Int64' && value && isNaN(parseInt(value))) {
    throw new Error(`document has value ${value} for Int64 field ${field.name}, which is not a valid Int64`);
  }
};
const ensureDocumentsAreValidStructure = (documents, structure) => {
  const fields = Object.keys(structure).map(fieldName => ({
    name: fieldName,
    type: structure[fieldName].type,
    key: structure[fieldName].key,
    searchable: structure[fieldName].searchable,
    filterable: structure[fieldName].filterable,
    sortable: structure[fieldName].sortable,
  }));
  documents.forEach((document) => {
    fields.forEach((field) => {
      const documentFieldValue = document[field.name];
      try {
        ensureValueValidForField(documentFieldValue, field);
      } catch (e) {
        throw new Error(`${e.message} (document: ${JSON.stringify(document)})`);
      }
    })
  });
};

class Index {
  constructor(name, structure) {
    this.name = name;
    this.structure = structure;
  }

  async store(documents, correlationId) {
    ensureDocumentsAreValidStructure(documents, this.structure);

    const batches = chunk(documents, 100);
    await forEachAsync(batches, async (batch, index) => {
      logger.debug(`Writing batch ${index + 1} of ${batches.length} to ${this.name}`, { correlationId });
      try {
        await storeDocumentsInIndex(this.name, batch);
      } catch (e) {
        throw new Error(`Error writing batch ${index} to ${this.name} - ${e.message}`);
      }
    })
  }

  async search(criteria, page, pageSize, sortBy, sortAsc = true, filters = undefined) {
    try {
      let mappedFilters;
      if (filters) {
        mappedFilters = [];
        filters.forEach((filter) => {
          if (!filter.field) {
            throw new Error('All filters must have a field');
          }
          if (!filter.values) {
            throw new Error(`All filters must have a values (Missing on ${filter.field})`);
          }
          const field = this.structure[filter.field];
          if (!field) {
            throw new Error(`Field ${filter.field} is not in the index structure for ${this.name}`);
          }

          mappedFilters.push({
            field: filter.field,
            fieldType: field.type,
            values: filter.values,
          });
        })
      }
      return await searchIndex(this.name, criteria, page, pageSize, sortBy, sortAsc, mappedFilters)
    } catch (e) {
      throw new Error(`Error searching ${this.name} using criteria '${criteria}' (page=${page}, pageSize=${pageSize}, sortBy=${sortBy}, sortAsc=${sortAsc}, filters=${JSON.stringify(filters)}) - ${e.message}`);
    }
  }

  async delete(id) {
    try {
      await deleteDocumentInIndex(this.name, id);
    } catch (e) {
      throw new Error(`Error deleting document with id ${id} from index ${this.name} - ${e.message}`)
    }
  }

  static async create(name, structure) {
    try {
      await createIndex(name, structure);
    } catch (e) {
      throw new Error(`Error creating index ${name} - ${e.message}`);
    }
  }

  static async tidyIndexes(name, matcher, correlationId) {
    const previouslyUnusedIndexes = await cache.get(`UnusedIndexes:${name}`);
    if (previouslyUnusedIndexes) {
      const stillUnusedIndexes = await matcher(previouslyUnusedIndexes);
      await forEachAsync(stillUnusedIndexes, async (indexName) => {
        try {
          await deleteIndex(indexName);
          logger.info(`deleted index ${indexName}`, { correlationId });
        } catch (e) {
          throw new Error(`Error deleting index ${indexName} - ${e.message}`);
        }
      });
    }

    const allIndexes = await listIndexes();
    const unusedIndexes = await matcher(allIndexes);
    await cache.set(`UnusedIndexes:${name}`, unusedIndexes);
  }
}

module.exports = Index;
