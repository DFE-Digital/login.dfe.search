jest.mock('node-schedule');
jest.mock('./../../src/infrastructure/config', () => require('./../helpers').mockConfig());
jest.mock('./../../src/infrastructure/logger', () => require('./../helpers').mockLogger());
jest.mock('./../../src/app/scheduledTasks/reindexUsers');
jest.mock('./../../src/app/scheduledTasks/updateUsersIndex');
jest.mock('./../../src/app/scheduledTasks/updateAuditCache');
jest.mock('./../../src/app/scheduledTasks/tidyIndexes');

const schedule = require('node-schedule');
const reindexUsers = require('./../../src/app/scheduledTasks/reindexUsers');
const updateUsersIndex = require('./../../src/app/scheduledTasks/updateUsersIndex');
const updateAuditCache = require('./../../src/app/scheduledTasks/updateAuditCache');
const tidyIndexes = require('./../../src/app/scheduledTasks/tidyIndexes');
const { start } = require('./../../src/app/scheduledTasks');

const job = {
  nextInvocation: jest.fn().mockReturnValue(new Date(Date.UTC(20418, 10, 1, 15, 52, 32))),
};

const wait = async (milliseconds = 150) => {
  await new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
};

describe('when starting scheduled tasks', () => {
  beforeEach(() => {
    schedule.scheduleJob.mockReset().mockImplementation((spec, action) => {
      setTimeout(action, 100);
      return job;
    })
  });

  it('then it should schedule re-index users task', async () => {
    start();

    await wait();

    expect(reindexUsers).toHaveBeenCalledTimes(1);
  });

  it('then it should schedule update users index task', async () => {
    start();

    await wait();

    expect(updateUsersIndex).toHaveBeenCalledTimes(1);
  });

  it('then it should schedule update audit cache task', async () => {
    start();

    await wait();

    expect(updateAuditCache).toHaveBeenCalledTimes(1);
  });

  it('then it should schedule tidy indexes task', async () => {
    start();

    await wait();

    expect(tidyIndexes).toHaveBeenCalledTimes(1);
  });
});