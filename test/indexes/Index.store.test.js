// eslint-disable-next-line global-require
jest.mock('../../src/infrastructure/logger', () => require('../helpers').mockLogger());
jest.mock('../../src/infrastructure/search', () => ({
  storeDocumentsInIndex: jest.fn(),
}));

const { storeDocumentsInIndex } = require('../../src/infrastructure/search');
const logger = require('../../src/infrastructure/logger');
const Index = require('../../src/app/indexes/Index');

let indexName;
let indexStructure;
let rawDocuments;
let preparedDocuments;

describe('Search Index store function', () => {
  beforeEach(() => {
    indexName = 'TESTING';
    indexStructure = {
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
      email: {
        type: 'String',
      },
    };

    rawDocuments = [
      {
        id: 'doc-1',
        firstName: 'document',
        lastName: 'one',
        email: 'doc-1@test.com',
      },
      {
        id: 'doc-2',
        firstName: 'document',
        lastName: 'two',
        email: 'doc-2@test.com',
      },
      {
        id: 'doc-3',
        firstName: 'document',
        lastName: 'three',
        email: 'doc-3@test.com',
      },
      {
        id: 'doc-4',
        firstName: 'document',
        lastName: 'four',
        email: 'doc-4@test.com',
      },
    ];
    preparedDocuments = rawDocuments.map((doc) => ({ ...doc, '@search.action': 'upload' }));

    logger.mockResetAll();

    storeDocumentsInIndex.mockReset().mockReturnValue({
      statusCode: 200,
      body: {
        value: rawDocuments.map((doc) => ({
          key: doc.id,
          status: true,
          errorMessage: null,
          statusCode: 200,
        })),
      },
    });
  });

  it('Will throw an error if no field in the structure is specified as the key', async () => {
    const index = new Index(indexName, {
      id: {
        type: 'String',
        key: false,
        filterable: true,
      },
    });
    await expect(index.store(rawDocuments, 'testing')).rejects.toThrow(`No field set as the key for Index ${indexName}`);
  });

  it('Will attempt to store the documents if a field is specified as the key', async () => {
    const index = new Index(indexName, indexStructure);
    await expect(index.store(rawDocuments, 'testing')).resolves.not.toThrow();
    expect(storeDocumentsInIndex).toHaveBeenCalledWith(indexName, preparedDocuments);
  });

  it("Will not attempt to retry storing documents, if the response code isn't 207", async () => {
    const index = new Index(indexName, indexStructure);
    await index.store(rawDocuments, 'testing');
    expect(storeDocumentsInIndex).toHaveBeenCalledTimes(1);
  });

  it('Will not attempt to retry storing documents, if the response code is 207 and none of them can be retried', async () => {
    storeDocumentsInIndex.mockReturnValue({
      statusCode: 207,
      body: {
        value: rawDocuments.map((doc) => ({
          key: doc.id,
          status: false,
          errorMessage: '400 Test',
          statusCode: 400,
        })),
      },
    });

    const index = new Index(indexName, indexStructure);
    await index.store(rawDocuments, 'testing');
    expect(storeDocumentsInIndex).toHaveBeenCalledTimes(1);
  });

  it('Will log the response documents, if the response code is 207 and none of them can be retried', async () => {
    const errorStatus = 400;
    const responseDocuments = rawDocuments.map((doc) => ({
      key: doc.id,
      status: false,
      errorMessage: '400 Log test',
      statusCode: errorStatus,
    }));

    storeDocumentsInIndex.mockReturnValue({
      statusCode: 207,
      body: {
        value: responseDocuments,
      },
    });

    const index = new Index(indexName, indexStructure);
    await index.store(rawDocuments, 'testing');
    expect(storeDocumentsInIndex).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(`Documents failed to index into "${indexName}", status code(s): ${errorStatus}`, {
      documents: responseDocuments,
    });
  });

  it('Will attempt to retry storing documents, if the response code is 207 and all of them can be retried (3 attempts default)', async () => {
    const responseDocuments = rawDocuments.map((doc) => ({
      key: doc.id,
      status: false,
      errorMessage: 'Clash testing',
      statusCode: 409,
    }));

    storeDocumentsInIndex.mockReturnValue({
      statusCode: 207,
      body: {
        value: responseDocuments,
      },
    });

    const index = new Index(indexName, indexStructure);
    await index.store(rawDocuments, 'testing');
    expect(storeDocumentsInIndex).toHaveBeenCalledTimes(3);
    expect(storeDocumentsInIndex.mock.calls[0][1].length).toStrictEqual(rawDocuments.length);
    expect(storeDocumentsInIndex.mock.calls[1][1].length).toStrictEqual(rawDocuments.length);
    expect(storeDocumentsInIndex.mock.calls[2][1].length).toStrictEqual(rawDocuments.length);
  });

  it('Will attempt to retry storing documents that can be retried, if the response code is 207 and some of them fail on retries', async () => {
    const errorStatus = 400;
    const retryStatus = 409;
    const firstResponseDocuments = rawDocuments.map((doc, index) => ({
      key: doc.id,
      status: false,
      errorMessage: (index === 0) ? 'Retry testing failure' : 'Retry testing',
      statusCode: (index === 0) ? errorStatus : retryStatus,
    }));
    const secondResponseDocuments = firstResponseDocuments.map((doc, index) => ({
      key: doc.key,
      status: false,
      errorMessage: (index === 1) ? 'Retry testing failure' : 'Retry testing',
      statusCode: (index === 1) ? errorStatus : retryStatus,
    }));
    const thirdResponseDocuments = secondResponseDocuments.map((doc, index) => ({
      key: doc.key,
      status: false,
      errorMessage: (index === 2) ? 'Retry testing failure' : 'Retry testing',
      statusCode: (index === 2) ? errorStatus : retryStatus,
    }));

    storeDocumentsInIndex.mockReturnValueOnce({
      statusCode: 207,
      body: {
        value: firstResponseDocuments,
      },
    }).mockReturnValueOnce({
      statusCode: 207,
      body: {
        value: secondResponseDocuments,
      },
    }).mockReturnValueOnce({
      statusCode: 207,
      body: {
        value: thirdResponseDocuments,
      },
    });

    const index = new Index(indexName, indexStructure);
    await index.store(rawDocuments, 'testing');
    expect(storeDocumentsInIndex).toHaveBeenCalledTimes(3);
    expect(storeDocumentsInIndex.mock.calls[0][1].length).toStrictEqual(rawDocuments.length);
    expect(storeDocumentsInIndex.mock.calls[1][1].length).toStrictEqual(rawDocuments.length - 1);
    expect(storeDocumentsInIndex.mock.calls[2][1].length).toStrictEqual(rawDocuments.length - 2);
  });

  it('Will log any response documents that need to be retried, if they are not indexed after the attempt limit (3 attempts default)', async () => {
    const errorStatus = 400;
    const retryStatus = 409;
    const firstResponseDocuments = rawDocuments.map((doc, index) => ({
      key: doc.id,
      status: false,
      errorMessage: (index === 0) ? 'Retry testing failure' : 'Retry testing',
      statusCode: (index === 0) ? errorStatus : retryStatus,
    }));
    const secondResponseDocuments = firstResponseDocuments.map((doc, index) => ({
      key: doc.key,
      status: false,
      errorMessage: (index === 1) ? 'Retry testing failure' : 'Retry testing',
      statusCode: (index === 1) ? errorStatus : retryStatus,
    }));
    const thirdResponseDocuments = secondResponseDocuments.map((doc, index) => ({
      key: doc.key,
      status: false,
      errorMessage: (index === 2) ? 'Retry testing failure' : 'Retry testing',
      statusCode: (index === 2) ? errorStatus : retryStatus,
    }));

    storeDocumentsInIndex.mockReturnValueOnce({
      statusCode: 207,
      body: {
        value: firstResponseDocuments,
      },
    }).mockReturnValueOnce({
      statusCode: 207,
      body: {
        value: secondResponseDocuments,
      },
    }).mockReturnValueOnce({
      statusCode: 207,
      body: {
        value: thirdResponseDocuments,
      },
    });

    const index = new Index(indexName, indexStructure);
    await index.store(rawDocuments, 'testing');
    expect(storeDocumentsInIndex).toHaveBeenCalledTimes(3);
    expect(logger.error).toHaveBeenCalled();
    expect(logger.error).toHaveBeenLastCalledWith(`Documents failed to index into "${indexName}" after multiple retries, status code(s): ${retryStatus}`, {
      documents: thirdResponseDocuments.filter((doc) => doc.statusCode !== 400),
    });
  });
});
