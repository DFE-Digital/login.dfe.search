jest.mock('./../../src/infrastructure/config', () => require('./../helpers').mockConfig());
jest.mock('./../../src/infrastructure/logger', () => require('./../helpers').mockLogger());
jest.mock('./../../src/app/indexes/DeviceIndex');

const { mockRequest, mockResponse } = require('./../helpers');
const DeviceIndex = require('./../../src/app/indexes/DeviceIndex');
const search = require('./../../src/app/devices/search');

const deviceIndex = {
  search: jest.fn(),
};
const res = mockResponse();

describe('when searching devices', () => {
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
      query: {
        criteria: 'test',
        page: 2,
      },
    });

    res.mockResetAll();
  });

  it('then it should search the current device index using the parameters of the request', async () => {
    await search(req, res);

    expect(DeviceIndex.current).toHaveBeenCalledTimes(1);
    expect(deviceIndex.search).toHaveBeenCalledTimes(1);
    expect(deviceIndex.search).toHaveBeenCalledWith('test', 2, 25, 'serialNumber', true, undefined);
  });

  it('then it should search the current device index with default criteria if none supplied in request', async () => {
    req.query.criteria = undefined;

    await search(req, res);

    expect(DeviceIndex.current).toHaveBeenCalledTimes(1);
    expect(deviceIndex.search).toHaveBeenCalledTimes(1);
    expect(deviceIndex.search).toHaveBeenCalledWith('*', 2, 25, 'serialNumber', true, undefined);
  });

  it('then it should the current device index with page 1 if none supplied in request', async () => {
    req.query.page = undefined;

    await search(req, res);

    expect(DeviceIndex.current).toHaveBeenCalledTimes(1);
    expect(deviceIndex.search).toHaveBeenCalledTimes(1);
    expect(deviceIndex.search).toHaveBeenCalledWith('test', 1, 25, 'serialNumber', true, undefined);
  });

  it('then it should return results as json', async () => {
    await search(req, res);

    expect(res.json).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({
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
  });
});
