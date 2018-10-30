const { createIndex, storeDocumentsInIndex, searchIndex } = require('./../../infrastructure/search');
const { forEachAsync } = require('./../../utils/async');
const chunk = require('lodash/chunk');

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

  async store(documents) {
    ensureDocumentsAreValidStructure(documents, this.structure);

    const batches = chunk(documents, 100);
    await forEachAsync(batches, async (batch, index) => {
      try {
        await storeDocumentsInIndex(this.name, batch);
      } catch (e) {
        throw new Error(`Error writing batch ${index} to ${this.name} - ${e.message}`);
      }
    })
  }

  async search(criteria, page, pageSize, sortBy, sortAsc = true, filters = undefined) {
    try {
      return await searchIndex(this.name, criteria, page, pageSize, sortBy, sortAsc, filters)
    } catch (e) {
      throw new Error(`Error searching ${this.name} using criteria '${criteria}' (page=${page}, pageSize=${pageSize}, sortBy=${sortBy}, sortAsc=${sortAsc}, filters=${JSON.stringify(filters)}) - ${e.message}`);
    }
  }

  static async create(name, structure) {
    try {
      await createIndex(name, structure);
    } catch (e) {
      throw new Error(`Error creating index ${name} - ${e.message}`);
    }
  }
}

module.exports = Index;
