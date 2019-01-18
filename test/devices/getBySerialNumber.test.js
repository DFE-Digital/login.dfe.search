jest.mock('./../../src/infrastructure/config', () => require('./../helpers').mockConfig());
jest.mock('./../../src/infrastructure/logger', () => require('./../helpers').mockLogger());
jest.mock('./../../src/app/indexes/DeviceIndex');

const { mockRequest, mockResponse } = require('./../helpers');
const DeviceIndex = require('./../../src/app/indexes/DeviceIndex');
const getBySerialNumber = require('./../../src/app/devices/getBySerialNumber');

const deviceIndex = {
  search: jest.fn(),
};
const res = mockResponse();

describe('when getting device by serial number', () => {
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
    });

    res.mockResetAll();
  });

  it('then it should search the current device index filtering by serial number', async () => {
    await getBySerialNumber(req, res);

    expect(DeviceIndex.current).toHaveBeenCalledTimes(1);
    expect(deviceIndex.search).toHaveBeenCalledTimes(1);
    expect(deviceIndex.search).toHaveBeenCalledWith('*', 1, 1, 'serialNumber', true, [{
      field: 'serialNumber',
      values: [req.params.sn],
    }]);
  });

  it('then it should return devices as json', async () => {
    await getBySerialNumber(req, res);

    expect(res.json).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({
      serialNumber: '1234567890',
      statusId: 1,
      assigneeId: 'user-1',
      assignee: 'User One',
      organisationName: 'Organisation A',
      lastLogin: new Date(2019, 0, 18, 12, 20, 19),
      numberOfSuccessfulLoginsInPast12Months: 2,
    });
  });

  it('then it should return 404 is device not found', async () => {
    deviceIndex.search.mockReset().mockReturnValue({
      devices: [],
      totalNumberOfResults: 0,
      numberOfPages: 0,
    });

    await getBySerialNumber(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledTimes(1);
  });
});
