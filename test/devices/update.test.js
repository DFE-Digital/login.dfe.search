jest.mock('./../../src/infrastructure/config', () => require('./../helpers').mockConfig());
jest.mock('./../../src/infrastructure/logger', () => require('./../helpers').mockLogger());
jest.mock('./../../src/app/indexes/DeviceIndex');

const { mockRequest, mockResponse } = require('./../helpers');
const DeviceIndex = require('./../../src/app/indexes/DeviceIndex');
const update = require('./../../src/app/devices/update');

const deviceIndex = {
  search: jest.fn(),
  store: jest.fn(),
};
const res = mockResponse();

describe('when updating a device', () => {
  let req;

  beforeEach(() => {
    deviceIndex.search.mockReset().mockReturnValue({
      devices: [{
        serialNumber: '1234567890',
        statusId: 1,
        assigneeId: 'user-1',
        assignee: 'User One',
        organisationName: 'Organisation A',
        lastLogin: new Date(2019, 0, 18, 12, 20, 19),
        numberOfSuccessfulLoginsInPast12Months: 2,
      }],
      totalNumberOfResults: 1,
      numberOfPages: 2,
    });
    DeviceIndex.current.mockReset().mockReturnValue(deviceIndex);

    req = mockRequest({
      params: {
        sn: '1234567890',
      },
      body: {
        assigneeId: '',
        assignee: '',
        organisationName: '',
      },
    });

    res.mockResetAll();
  });

  it('then it should search the current index for the device', async () => {
    await update(req, res);

    expect(DeviceIndex.current).toHaveBeenCalledTimes(1);
    expect(deviceIndex.search).toHaveBeenCalledTimes(1);
    expect(deviceIndex.search).toHaveBeenCalledWith('*', 1, 1, 'serialNumber', true, [
      {
        field: 'serialNumber',
        values: [req.params.sn],
      },
    ]);
  });

  it('then it should update the current index with the patched properties', async () => {
    await update(req, res);

    expect(deviceIndex.store).toHaveBeenCalledTimes(1);
    expect(deviceIndex.store).toHaveBeenCalledWith([{
      serialNumber: '1234567890',
      statusId: 1,
      assigneeId: '',
      assignee: '',
      organisationName: '',
      lastLogin: new Date(2019, 0, 18, 12, 20, 19),
      numberOfSuccessfulLoginsInPast12Months: 2,
    }], 'correlation-id');
  });

  it('then it should return an accepted response', async () => {
    await update(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.send).toHaveBeenCalledTimes(1);
  });

  it('then it should return a not found response if device not in current index', async () => {
    deviceIndex.search.mockReturnValue({
      devices: [],
      totalNumberOfResults: 0,
      numberOfPages: 0,
    });

    await update(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledTimes(1);
  });

  it('then it should return a bad request response if attempting to patch an unpatchable property', async () => {
    req.body.serialNumber = 'nope';

    await update(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      errors: ['serialNumber is not a patchable property'],
    });
  });

  it('then it should return a bad request response if attempting to patch an assignee but not assigneeId', async () => {
    req.body.assigneeId = undefined;
    req.body.assignee = "User One";

    await update(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      errors: ['If patching assignee, you must also patch assigneeId'],
    });
  });

  it('then it should return a bad request response if attempting to patch an assigneeId but not assignee', async () => {
    req.body.assignee = undefined;
    req.body.assigneeId = "User1";

    await update(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      errors: ['If patching assigneeId, you must also patch assignee'],
    });
  });
});
