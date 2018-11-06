jest.mock('./../../src/infrastructure/config', () => require('./../helpers').mockConfig());
jest.mock('./../../src/infrastructure/logger', () => require('./../helpers').mockLogger());
jest.mock('./../../src/infrastructure/cache');
jest.mock('./../../src/infrastructure/audit');
jest.mock('./../../src/infrastructure/stats');

const cache = require('./../../src/infrastructure/cache');
const { getBatchOfAuditsSince } = require('./../../src/infrastructure/audit');
const { getLoginStatsForUser, setLoginStatsForUser } = require('./../../src/infrastructure/stats');
const updateAuditCache = require('./../../src/app/scheduledTasks/updateAuditCache');

const correlationId = 'correlation-id';
const lastAuditRecordTime = Date.UTC(2018, 9, 2, 10, 45, 12);
const batchOfAuditRecords = [
  {
    type: 'sign-in',
    subType: 'username-password',
    timestamp: new Date(Date.UTC(2018, 9, 30, 16, 47, 1)),
    userId: 'user-1',
  },
  {
    type: 'sign-in',
    subType: 'username-password',
    timestamp: new Date(Date.UTC(2018, 9, 31, 9, 2, 0)),
    userId: 'user-1',
  },
  {
    type: 'support',
    subType: 'user-edit',
    timestamp: new Date(Date.UTC(2018, 9, 31, 10, 45, 45)),
    userId: 'user-x',
    editedUser: 'user-2',
    editedFields: [
      { name: 'status' },
    ],
  },
  {
    type: 'sign-in',
    subType: 'username-password',
    timestamp: new Date(Date.UTC(2018, 9, 31, 10, 56, 32)),
    userId: 'user-2',
  },
];
const loginStats = [
  {
    userId: 'user-1',
    stats: {
      lastLogin: new Date(Date.UTC(2018, 9, 2, 10, 45, 12)),
      lastStatusChange: undefined,
      loginsInPast12Months: [
        new Date(Date.UTC(2018, 10, 2, 10, 45, 12)),
      ],
    },
  },
  {
    userId: 'user-2',
    stats: {
      lastLogin: undefined,
      lastStatusChange: undefined,
      loginsInPast12Months: [],
    },
  },
];

describe('when updating audit cache with stats', () => {
  beforeEach(() => {
    cache.get.mockReset().mockReturnValue(lastAuditRecordTime);
    cache.set.mockReset();

    getBatchOfAuditsSince.mockReset().mockReturnValueOnce(batchOfAuditRecords).mockReturnValueOnce([]);

    getLoginStatsForUser.mockReset().mockImplementation((userId) => {
      const userStats = loginStats.find(x => x.userId === userId);
      if (!userStats) {
        return undefined;
      }
      return {
        lastLogin: userStats.stats.lastLogin,
        lastStatusChange: userStats.stats.lastStatusChange,
        loginsInPast12Months: userStats.stats.loginsInPast12Months.map(d => d),
      };
    });
    setLoginStatsForUser.mockReset();
  });

  it('then it should read audits using pointer from cache when process has run before', async () => {
    await updateAuditCache(correlationId);

    expect(cache.get).toHaveBeenCalledTimes(1);
    expect(cache.get).toHaveBeenCalledWith('Pointer:LastAuditRecordTime');
    expect(getBatchOfAuditsSince).toHaveBeenCalledTimes(2);
    expect(getBatchOfAuditsSince).toHaveBeenCalledWith(new Date(lastAuditRecordTime), 1000);
    expect(getBatchOfAuditsSince).toHaveBeenCalledWith(new Date(Date.UTC(2018, 9, 31, 10, 56, 32)), 1000);
  });

  it('then it should read audits using start of time when process has not run before', async () => {
    cache.get.mockReturnValue(undefined);

    await updateAuditCache(correlationId);

    expect(cache.get).toHaveBeenCalledTimes(1);
    expect(cache.get).toHaveBeenCalledWith('Pointer:LastAuditRecordTime');
    expect(getBatchOfAuditsSince).toHaveBeenCalledTimes(2);
    expect(getBatchOfAuditsSince).toHaveBeenCalledWith(new Date(0), 1000);
    expect(getBatchOfAuditsSince).toHaveBeenCalledWith(new Date(Date.UTC(2018, 9, 31, 10, 56, 32)), 1000);
  });

  it('then it should update users with last login when new login audits found', async () => {
    await updateAuditCache(correlationId);

    expect(getLoginStatsForUser).toHaveBeenCalledTimes(2);
    expect(getLoginStatsForUser).toHaveBeenCalledWith('user-1');
    expect(getLoginStatsForUser).toHaveBeenCalledWith('user-2');
    expect(setLoginStatsForUser).toHaveBeenCalledTimes(2);
    expect(setLoginStatsForUser.mock.calls[0][0]).toBe('user-1');
    expect(setLoginStatsForUser.mock.calls[0][1]).toMatchObject({
      lastLogin: new Date(Date.UTC(2018, 9, 31, 9, 2, 0)),
    });
    expect(setLoginStatsForUser.mock.calls[1][0]).toBe('user-2');
    expect(setLoginStatsForUser.mock.calls[1][1]).toMatchObject({
      lastLogin: new Date(Date.UTC(2018, 9, 31, 10, 56, 32)),
    });
  });

  it('then it should update users with logins in last 12 months when new login audits found', async () => {
    await updateAuditCache(correlationId);

    expect(getLoginStatsForUser).toHaveBeenCalledTimes(2);
    expect(getLoginStatsForUser).toHaveBeenCalledWith('user-1');
    expect(getLoginStatsForUser).toHaveBeenCalledWith('user-2');
    expect(setLoginStatsForUser).toHaveBeenCalledTimes(2);
    expect(setLoginStatsForUser.mock.calls[0][0]).toBe('user-1');
    expect(setLoginStatsForUser.mock.calls[0][1]).toMatchObject({
      loginsInPast12Months: [
        new Date(Date.UTC(2018, 10, 2, 10, 45, 12)),
        new Date(Date.UTC(2018, 9, 30, 16, 47, 1)),
        new Date(Date.UTC(2018, 9, 31, 9, 2, 0)),
      ],
    });
    expect(setLoginStatsForUser.mock.calls[1][0]).toBe('user-2');
    expect(setLoginStatsForUser.mock.calls[1][1]).toMatchObject({
      loginsInPast12Months: [
        new Date(Date.UTC(2018, 9, 31, 10, 56, 32)),
      ],
    });
  });

  it('then it should update users with status changes when status edit audits found', async () => {
    await updateAuditCache(correlationId);

    expect(setLoginStatsForUser.mock.calls[1][0]).toBe('user-2');
    expect(setLoginStatsForUser.mock.calls[1][1]).toMatchObject({
      lastStatusChange: new Date(Date.UTC(2018, 9, 31, 10, 45, 45))
    });
  });
});
