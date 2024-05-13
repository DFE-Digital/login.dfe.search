const chunk = require('lodash/chunk');
const logger = require('../../infrastructure/logger');
const {
  listIndexes, createIndex, storeDocumentsInIndex, searchIndex, deleteIndex, deleteDocumentInIndex,
} = require('../../infrastructure/search');
const { forEachAsync } = require('../../utils/async');

const ensureValueValidForField = (value, field) => {
  if (!value && field.key) {
    throw new Error(`document does not have key field ${field.name}`);
  }
  if (!value && field.type === 'Collection') {
    throw new Error(`document does not have a value for field ${field.name}. Collection fields must have a value`);
  }
  if (field.type === 'Int64' && value && Number.isNaN(parseInt(value, 10))) {
    throw new Error(`document has value ${value} for Int64 field ${field.name}, which is not a valid Int64`);
  }
  if (field.type === 'DateTimeOffset' && value && !(value instanceof Date)) {
    throw new Error(`document has value ${value} for DateTimeOffset field ${field.name}, which is not a valid date`);
  }
};

const ensureDocumentsAreValidStructure = (documents, structure) => {
  const fields = Object.keys(structure).map((fieldName) => ({
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
    });
  });
};

const attemptToStoreDocuments = async (name, keyFieldName, documents, attempts = 3) => {
  if (attempts > 0 && documents.length > 0) {
    const response = await storeDocumentsInIndex(name, documents);

    // Response code 207 indicates there were some failures in the request, some of which can be retried.
    // https://learn.microsoft.com/en-us/rest/api/searchservice/addupdate-or-delete-documents#response
    if (response.statusCode === 207) {
      const responseDocuments = response.body.value ?? [];
      const failedDocuments = responseDocuments.filter((doc) => doc.status === false);
      const canRetry = (document) => [409, 422, 503].includes(document.statusCode);

      const errorDocuments = failedDocuments.filter((doc) => !canRetry(doc));
      if (errorDocuments.length > 1) {
        const statusCodes = [...new Set(errorDocuments.map((doc) => doc.statusCode))].join();
        logger.error(`Documents failed to index into "${name}", status code(s): ${statusCodes}`, {
          documents: errorDocuments,
        });
      }

      const responseRetryDocuments = failedDocuments.filter((doc) => canRetry(doc));
      const retryKeys = responseRetryDocuments.map((doc) => doc.key);
      if (retryKeys.length > 1) {
        if (attempts === 1) {
          const statusCodes = [...new Set(responseRetryDocuments.map((doc) => doc.statusCode))].join();
          logger.error(`Documents failed to index into "${name}" after multiple retries, status code(s): ${statusCodes}`, {
            documents: responseRetryDocuments,
          });
        } else {
          await new Promise((resolve) => { setTimeout(resolve, 500); });
        }
        const retryDocuments = documents.filter((doc) => retryKeys.includes(doc[keyFieldName]));
        await attemptToStoreDocuments(name, keyFieldName, retryDocuments, attempts - 1);
      }
    }
  }
};

class Index {
  constructor(name, structure) {
    this.name = name;
    this.structure = structure;
  }

  async store(documents, correlationId) {
    ensureDocumentsAreValidStructure(documents, this.structure);

    const batches = chunk(documents, 40);

    await forEachAsync(batches, async (batch, index) => {
      logger.debug(`Writing batch ${index + 1} of ${batches.length} to ${this.name}`, { correlationId });
      try {
        const keyField = Object.entries(this.structure).find(([, value]) => value.key === true);
        if (typeof keyField === 'undefined') {
          throw new Error(`No field set as the key for Index ${this.name}`);
        }

        const keyFieldName = keyField[0];
        await attemptToStoreDocuments(
          this.name,
          keyFieldName,
          batch.map((x) => ({ ...x, '@search.action': 'upload' })),
        );
      } catch (e) {
        throw new Error(`Error writing batch ${index} to ${this.name} - ${e.message}`);
      }
    });
  }

  async search(criteria, page, pageSize, sortBy, sortAsc = true, filters = undefined, searchFields = undefined) {
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
        });
      }
      return await searchIndex(this.name, criteria, page, pageSize, sortBy, sortAsc, mappedFilters, searchFields);
    } catch (e) {
      throw new Error(`Error searching ${this.name} using criteria '${criteria}' (page=${page}, pageSize=${pageSize}, sortBy=${sortBy}, sortAsc=${sortAsc}, filters=${JSON.stringify(filters)}) - ${e.message}`);
    }
  }

  async delete(id) {
    try {
      await deleteDocumentInIndex(this.name, id);
    } catch (e) {
      throw new Error(`Error deleting document with id ${id} from index ${this.name} - ${e.message}`);
    }
  }

  static async create(name, structure) {
    try {
      await createIndex(name, structure);
    } catch (e) {
      throw new Error(`Error creating index ${name} - ${e.message}`);
    }
  }

  static async tidyIndexes(matcher, correlationId) {
    const allIndexes = await listIndexes();
    const unusedIndexes = await matcher(allIndexes);
    if (unusedIndexes) {
      await forEachAsync(unusedIndexes, async (indexName) => {
        try {
          await deleteIndex(indexName);
          logger.info(`deleted index ${indexName}`, { correlationId });
        } catch (e) {
          throw new Error(`Error deleting index ${indexName} - ${e.message}`);
        }
      });
    }
  }
}

module.exports = Index;
