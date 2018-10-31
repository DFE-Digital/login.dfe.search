const cache = require('./../../infrastructure/cache');

const getLoginStatsForUser = async (userId) => {
  const key = `UserLoginStats:${userId.toLowerCase()}`;
  const stats = await cache.get(key);
  if (!stats) {
    return undefined;
  }
  return {
    loginsInPast12Months: stats.loginsInPast12Months.map(x => new Date(x)),
    lastLogin: stats.lastLogin ? new Date(stats.lastLogin) : undefined,
    lastStatusChange: stats.lastStatusChange ? new Date(stats.lastStatusChange) : undefined,
  }
};

const setLoginStatsForUser = async (userId, stats) => {
  const key = `UserLoginStats:${userId.toLowerCase()}`;
  await cache.set(key, stats)
};

module.exports = {
  getLoginStatsForUser,
  setLoginStatsForUser,
};
