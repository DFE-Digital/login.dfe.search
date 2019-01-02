jest.mock('./../../src/infrastructure/config', () => require('./../helpers').mockConfig());
jest.mock('./../../src/infrastructure/logger', () => require('./../helpers').mockLogger());
jest.mock('./../../src/infrastructure/cache');
jest.mock('./../../src/app/indexes/UserIndex');

const UserIndex = require('./../../src/app/indexes/UserIndex');
const cache = require('./../../src/infrastructure/cache');
const reindexUsers = require('./../../src/app/scheduledTasks/reindexUsers');

const userIndex = {
  indexAllUsers: jest.fn(),
};
const correlationId = 'correlation-id';

describe('when running re-index users task', () => {
  beforeEach(() => {
    userIndex.indexAllUsers.mockReset();
    UserIndex.create.mockReset().mockReturnValue(userIndex);
    UserIndex.current.mockReset();

    cache.set.mockReset();
  });

  it('then it should create a new index', async () => {
    await reindexUsers(correlationId);

    expect(UserIndex.create).toHaveBeenCalledTimes(1);
  });

  it('then it should index all users into new index', async () => {
    await reindexUsers(correlationId);

    expect(userIndex.indexAllUsers).toHaveBeenCalledTimes(1);
    expect(userIndex.indexAllUsers).toHaveBeenCalledWith(correlationId);
  });

  it('then it should set current index to new index', async () => {
    await reindexUsers(correlationId);

    expect(UserIndex.current).toHaveBeenCalledTimes(1);
    expect(UserIndex.current).toHaveBeenCalledWith(userIndex);
  });

  it('then it should not set current index to new index if error indexing', async () => {
    userIndex.indexAllUsers.mockImplementation(() => {
      throw new Error('test error');
    });

    try {
      await reindexUsers(correlationId);
      throw new Error('no error thrown')
    } catch (e) {
      expect(e.message).toBe('test error');
    }

    expect(UserIndex.current).toHaveBeenCalledTimes(0);
  });

  it('then it should update pointer in cache after successful update', async () => {
    await reindexUsers(correlationId);

    expect(cache.set).toHaveBeenCalledTimes(1);
    expect(cache.set.mock.calls[0][0]).toBe('Pointer:LastUserUpdateTime');
  });
});
