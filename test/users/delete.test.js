/* eslint-disable global-require */
jest.mock('./../../src/infrastructure/config', () => require('../helpers').mockConfig());
jest.mock('./../../src/infrastructure/logger', () => require('../helpers').mockLogger());
/* eslint-enable global-require */
jest.mock('./../../src/app/indexes/UserIndex');

const { mockRequest, mockResponse } = require('../helpers');
const UserIndex = require('../../src/app/indexes/UserIndex');
const deleteUser = require('../../src/app/users/delete');

const user = {
  id: 'user1',
  firstName: 'Bob',
  lastName: 'Johns',
  email: 'user1@unit.test',
  primaryOrganisation: 'org1',
  organisations: [
    {
      id: 'org1',
      name: 'Organisation One',
      categoryId: '001',
      statusId: 1,
      roleId: 10000,
    },
  ],
  services: [],
  lastLogin: new Date(2018, 10, 31, 12, 36, 12),
  numberOfSuccessfulLoginsInPast12Months: 10,
  statusLastChangedOn: undefined,
  statusId: 1,
  pendingEmail: undefined,
  legacyUsernames: ['sau1'],
};
const userIndex = {
  search: jest.fn(),
  delete: jest.fn(),
};
const res = mockResponse();

describe('when deleting a user', () => {
  let req;

  beforeEach(() => {
    req = mockRequest({
      params: {
        uid: 'user1',
      },
    });
    res.mockResetAll();

    UserIndex.mockReset().mockImplementation(() => userIndex);
    userIndex.search.mockReset().mockReturnValue({
      users: [user],
    });
  });

  it('then it should return 404 response if user id is not in index', async () => {
    userIndex.search.mockReturnValue({
      users: [],
    });

    await deleteUser(req, res);

    expect(userIndex.search).toHaveBeenCalledTimes(1);
    expect(userIndex.search).toHaveBeenCalledWith('*', 1, 1, 'searchableName', true, [
      {
        field: 'id',
        values: [req.params.uid],
      },
    ]);
    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledTimes(1);
  });

  it('then it should delete the user from the index', async () => {
    await deleteUser(req, res);

    expect(userIndex.delete).toHaveBeenCalledTimes(1);
    expect(userIndex.delete).toHaveBeenCalledWith('user1');
  });

  it('then it should return 202 response', async () => {
    await deleteUser(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.send).toHaveBeenCalledTimes(1);
  });
});
