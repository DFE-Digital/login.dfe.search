jest.mock('./../../src/infrastructure/config', () => require('./../helpers').mockConfig());
jest.mock('./../../src/infrastructure/logger', () => require('./../helpers').mockLogger());
jest.mock('./../../src/app/indexes/UserIndex');
jest.mock('./../../src/app/indexes/DeviceIndex');

const UserIndex = require('./../../src/app/indexes/UserIndex');
const DeviceIndex = require('./../../src/app/indexes/DeviceIndex');
const tidyIndexes = require('./../../src/app/scheduledTasks/tidyIndexes');


const correlationId = 'correlation-id';

describe('when running tidy indexes task', () => {
  beforeEach(() => {
    UserIndex.tidyIndexes.mockReset();

    DeviceIndex.tidyIndexes.mockReset();
  });

  it('then it should tidy user indexes', async () => {
    await tidyIndexes(correlationId);

    expect(UserIndex.tidyIndexes).toHaveBeenCalledTimes(1);
    expect(UserIndex.tidyIndexes).toHaveBeenCalledWith(correlationId);
  });

  it('then it should tidy device indexes', async () => {
    await tidyIndexes(correlationId);

    expect(DeviceIndex.tidyIndexes).toHaveBeenCalledTimes(1);
    expect(DeviceIndex.tidyIndexes).toHaveBeenCalledWith(correlationId);
  });
});
