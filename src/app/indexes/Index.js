const { createIndex, storeDocumentsInIndex } = require('./../../infrastructure/search');
const { forEachAsync } = require('./../../utils/async');
const chunk = require('lodash/chunk');

class Index {
  constructor(name, structure) {
    this.name = name;
    this.structure = structure;
  }

  async store(documents) {
    // TODO: ensure documents match structure

    const batches = chunk(documents, 100);
    await forEachAsync(batches, async (batch, index) => {
      try {
        await storeDocumentsInIndex(this.name, batch);
      } catch (e) {
        throw new Error(`Error writing batch ${index} to ${this.name} - ${e.message}`);
      }
    })
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
