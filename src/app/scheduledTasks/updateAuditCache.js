const logger = require('./../../infrastructure/logger');
const cache = require('./../../infrastructure/cache');
const { getBatchOfAuditsSince } = require('./../../infrastructure/audit');
const { getLoginStatsForUser, setLoginStatsForUser } = require('./../../infrastructure/stats');

const processAuditSigninDetails = (entry, stats) => {
  if (entry.type !== 'sign-in' || entry.subType !== 'username-password') {
    return false;
  }

  if (!stats.lastLogin || entry.timestamp.getTime() > stats.lastLogin.getTime()) {
    stats.lastLogin = entry.timestamp;
  }

  stats.loginsInPast12Months.push(entry.timestamp);
  return true;
};
const processAuditChangeDetails = (entry, stats) => {
  if (entry.type !== 'support' || entry.subType !== 'user-edit'
    || !entry.editedUser || !entry.editedFields.find(y => y.name === 'status')) {
    return false;
  }

  if (!stats.lastStatusChange || entry.timestamp.getTime() > stats.lastStatusChange.getTime()) {
    stats.lastStatusChange = entry.timestamp;
    return true;
  }
  return false;
};
const processUserBatch = async (batch) => {
  const stats = await getLoginStatsForUser(batch.userId) || {
    loginsInPast12Months: [],
    lastLogin: undefined,
    lastStatusChange: undefined,
  };
  let statsUpdated = false;

  batch.entries.forEach((entry) => {
    const signinUpdated = processAuditSigninDetails(entry, stats);
    const changeUpdated = processAuditChangeDetails(entry, stats);
    if (signinUpdated || changeUpdated) {
      statsUpdated = true;
    }
  });

  const twelveMonthsAgo = Date.now() - (365 * 24 * 60 * 60 * 1000);
  const filteredloginsInPast12Months = stats.loginsInPast12Months.filter(x => x.getTime() > twelveMonthsAgo);
  if (filteredloginsInPast12Months.length !== stats.loginsInPast12Months.length) {
    stats.loginsInPast12Months = filteredloginsInPast12Months;
    statsUpdated = true;
  }

  if (statsUpdated) {
    await setLoginStatsForUser(batch.userId, stats);
  }
};
const processBatch = async (batch) => {
  const groupedByUser = [];
  batch.forEach((entry) => {
    let userId = entry.userId;
    if (entry.type === 'support' && entry.subType === 'user-edit'
      && entry.editedUser && entry.editedFields.find(y => y.name === 'status')) {
      userId = entry.editedUser;
    }

    if (!userId) {
      return;
    }

    let userBatch = groupedByUser.find(x => x.userId === userId);
    if (!userBatch) {
      userBatch = {
        userId: userId,
        entries: [],
      };
      groupedByUser.push(userBatch);
    }
    userBatch.entries.push(entry);
  });

  for (let i = 0; i < groupedByUser.length; i += 1) {
    await processUserBatch(groupedByUser[i]);
  }
};

const updateAuditCache = async (correlationId) => {
  let lastAuditRecordTime = new Date(await cache.get('Pointer:LastAuditRecordTime') || 0);
  let hasMoreRecords = true;
  while (hasMoreRecords) {
    logger.info(`Reading batch of audit records since ${lastAuditRecordTime}`, { correlationId });
    const batch = await getBatchOfAuditsSince(lastAuditRecordTime, 1000);
    logger.debug(`Received batch of ${batch.length} audits`, { correlationId });

    if (batch.length > 0) {
      await processBatch(batch);

      // Update pointer
      lastAuditRecordTime = batch[batch.length - 1].timestamp;
      await cache.set('Pointer:LastAuditRecordTime', lastAuditRecordTime.getTime());
      logger.info(`Set last audit record time pointer to ${lastAuditRecordTime}`, { correlationId });
    } else {
      hasMoreRecords = false;
    }
  }
};
module.exports = updateAuditCache;
