jest.mock('./../../src/infrastructure/config', () => require('./../helpers').mockConfig());
jest.mock('./../../src/infrastructure/logger', () => require('./../helpers').mockLogger());
jest.mock('./../../src/infrastructure/cache');
jest.mock('./../../src/app/indexes/DeviceIndex');

const DeviceIndex = require('./../../src/app/indexes/DeviceIndex');
const cache = require('./../../src/infrastructure/cache');
const reindexDevices = require('./../../src/app/scheduledTasks/reindexDevices');

const deviceIndex = {
  indexAllDevices: jest.fn(),
};
const correlationId = 'correlation-id';

describe('when running re-index devices task', () => {
  beforeEach(() => {
    deviceIndex.indexAllDevices.mockReset();
    DeviceIndex.create.mockReset().mockReturnValue(deviceIndex);
    DeviceIndex.current.mockReset();

    cache.set.mockReset();
  });

  it('then it should create a new index', async () => {
    await reindexDevices(correlationId);

    expect(DeviceIndex.create).toHaveBeenCalledTimes(1);
  });

  it('then it should index all devices into new index', async () => {
    await reindexDevices(correlationId);

    expect(deviceIndex.indexAllDevices).toHaveBeenCalledTimes(1);
    expect(deviceIndex.indexAllDevices).toHaveBeenCalledWith(correlationId);
  });

  it('then it should set current index to new index', async () => {
    await reindexDevices(correlationId);

    expect(DeviceIndex.current).toHaveBeenCalledTimes(1);
    expect(DeviceIndex.current).toHaveBeenCalledWith(deviceIndex);
  });

  it('then it should not set current index to new index if error indexing', async () => {
    deviceIndex.indexAllDevices.mockImplementation(() => {
      throw new Error('test error');
    });

    try {
      await reindexDevices(correlationId);
      throw new Error('no error thrown')
    } catch (e) {
      expect(e.message).toBe('test error');
    }

    expect(DeviceIndex.current).toHaveBeenCalledTimes(0);
  });

  it('then it should update pointer in cache after successful update', async () => {
    await reindexDevices(correlationId);

    expect(cache.set).toHaveBeenCalledTimes(1);
    expect(cache.set.mock.calls[0][0]).toBe('Pointer:LastDeviceUpdateTime');
  });
});
