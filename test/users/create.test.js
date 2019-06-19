jest.mock('./../../src/infrastructure/config', () => require('./../helpers').mockConfig());
jest.mock('./../../src/infrastructure/logger', () => require('./../helpers').mockLogger());
jest.mock('./../../src/app/indexes/UserIndex');

const { mockRequest, mockResponse } = require('./../helpers');
const UserIndex = require('./../../src/app/indexes/UserIndex');
const create = require('./../../src/app/users/create');

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
  indexUserById: jest.fn(),
};
const res = mockResponse();

describe('when creating a user in the index', () => {
  let req;

  beforeEach(() => {
    req = mockRequest({
      body: {
        id: 'user1'
      },
    });
    res.mockResetAll();

    UserIndex.current.mockReset().mockReturnValue(userIndex);
    userIndex.search.mockReset().mockReturnValue({
      users: [user]
    });
  });

  it('then it should return 403 response if user id is already indexed', async () => {
    await create(req, res);

    expect(userIndex.search).toHaveBeenCalledTimes(1);
    expect(userIndex.search).toHaveBeenCalledWith('*', 1, 1, 'searchableName', true, [
      {
        field: 'id',
        values: [req.body.id],
      }
    ]);
    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledTimes(1);
  });

  it('then it should update the user with the updated properties in the index', async() => {
    userIndex.search.mockReturnValue({
      users: []
    });

    await create(req, res);

    expect(userIndex.indexUserById).toHaveBeenCalledTimes(1);
    expect(userIndex.indexUserById).toHaveBeenCalledWith(req.body.id, 'correlation-id')
  });

  it('then it should return 201 response', async () => {
    userIndex.search.mockReturnValue({
      users: []
    });
    
    await create(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.send).toHaveBeenCalledTimes(1);
  });
});
