jest.mock('./../../src/infrastructure/config', () => require('./../helpers').mockConfig());
jest.mock('./../../src/infrastructure/logger', () => require('./../helpers').mockLogger());
jest.mock('./../../src/infrastructure/cache');
jest.mock('./../../src/app/indexes/UserIndex');

const UserIndex = require('./../../src/app/indexes/UserIndex');
const cache = require('./../../src/infrastructure/cache');
const updateUsersIndex = require('./../../src/app/scheduledTasks/updateUsersIndex');

const userIndex = {
  indexUsersChangedAfter: jest.fn(),
};
const pointerValue = Date.UTC(2018, 10, 1, 16, 17, 12);
const correlationId = 'correlation-id';

describe('when running re-index users task', () => {
  beforeEach(() => {
    userIndex.indexUsersChangedAfter.mockReset();
    UserIndex.current.mockReset().mockReturnValue(userIndex);

    cache.get.mockReset().mockReturnValue(pointerValue);
    cache.set.mockReset();
  });

  it('then it should get current pointer from cache', async () => {
    await updateUsersIndex(correlationId);

    expect(cache.get).toHaveBeenCalledTimes(1);
    expect(cache.get).toHaveBeenCalledWith('Pointer:LastUserUpdateTime');
  });

  it('then it should get current index', async () => {
    await updateUsersIndex(correlationId);

    expect(UserIndex.current).toHaveBeenCalledTimes(1);
  });

  it('then it should index users changed after pointer on current index', async () => {
    await updateUsersIndex(correlationId);

    expect(userIndex.indexUsersChangedAfter).toHaveBeenCalledTimes(1);
    expect(userIndex.indexUsersChangedAfter).toHaveBeenCalledWith(new Date(pointerValue), correlationId);
  });

  it('then it should use index pointer of 0 if not set in cache', async () => {
    cache.get.mockReturnValue(undefined);

    await updateUsersIndex(correlationId);

    expect(userIndex.indexUsersChangedAfter).toHaveBeenCalledTimes(1);
    expect(userIndex.indexUsersChangedAfter).toHaveBeenCalledWith(new Date(0), correlationId);
  });

  it('then it should update pointer in cache after successful update', async () => {
    await updateUsersIndex(correlationId);

    expect(cache.set).toHaveBeenCalledTimes(1);
    expect(cache.set.mock.calls[0][0]).toBe('Pointer:LastUserUpdateTime');
  })
});
