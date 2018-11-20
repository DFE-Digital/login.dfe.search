jest.mock('./../../src/infrastructure/config', () => require('./../helpers').mockConfig());
jest.mock('./../../src/infrastructure/logger', () => require('./../helpers').mockLogger());
jest.mock('./../../src/app/indexes/UserIndex');

const { mockRequest, mockResponse } = require('./../helpers');
const UserIndex = require('./../../src/app/indexes/UserIndex');
const update = require('./../../src/app/users/update');

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
  store: jest.fn(),
};
const res = mockResponse();

describe('when updating user details', () => {
  let req;

  beforeEach(() => {
    req = mockRequest({
      params: {
        uid: 'user1',
      },
      body: {
        firstName: 'Robert',
        lastName: 'Johnson',
      },
    });
    res.mockResetAll();

    UserIndex.current.mockReset().mockReturnValue(userIndex);
    userIndex.search.mockReset().mockReturnValue({
      users: [user]
    });
  });

  it('then it should return a 400 response if body has unpatchable property', async () => {
    req.body.lastLogin = '2018-11-20T10:40:56Z';

    await update(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.contentType).toHaveBeenCalledTimes(1);
    expect(res.contentType).toHaveBeenCalledWith('json');
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      errors: ['lastLogin is not a patchable property']
    });
  });

  it('then it should return 400 response if attempting to set required properties to blank', async () => {
    req.body.firstName = '';
    req.body.lastName = '';
    req.body.email = '';

    await update(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.contentType).toHaveBeenCalledTimes(1);
    expect(res.contentType).toHaveBeenCalledWith('json');
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      errors: [
        'firstName must have a value',
        'lastName must have a value',
        'email must have a value',
      ]
    });
  });

  it('then it should return 400 response if array properties are not arrays', async () => {
    req.body.organisations = 'not-an-array';
    req.body.services = 'not-an-array';
    req.body.legacyUsernames = 'not-an-array';

    await update(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.contentType).toHaveBeenCalledTimes(1);
    expect(res.contentType).toHaveBeenCalledWith('json');
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      errors: [
        'organisations must be an array',
        'services must be an array',
        'legacyUsernames must be an array',
      ],
    });
  });

  it('then it should return 400 response if organisation item does not have required properties', async () => {
    req.body.organisations = [
      {
        another: 'value',
      },
    ];

    await update(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.contentType).toHaveBeenCalledTimes(1);
    expect(res.contentType).toHaveBeenCalledWith('json');
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      errors: [
        'organisations item at index 0 must have id',
        'organisations item at index 0 must have name',
        'organisations item at index 0 must have categoryId',
        'organisations item at index 0 must have statusId',
        'organisations item at index 0 must have roleId',
      ],
    });
  });

  it('then it should return 404 response if user id is not in index', async () => {
    userIndex.search.mockReturnValue({
      users: []
    });

    await update(req, res);

    expect(userIndex.search).toHaveBeenCalledTimes(1);
    expect(userIndex.search).toHaveBeenCalledWith('*', 1, 1, 'searchableName', true, [
      {
        field: 'id',
        values: [req.params.uid],
      }
    ]);
    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledTimes(1);
  });

  it('then it should update the user with the updated properties in the index', async() => {
    await update(req, res);

    expect(userIndex.store).toHaveBeenCalledTimes(1);
    expect(userIndex.store).toHaveBeenCalledWith([{
      id: 'user1',
      firstName: 'Robert',
      lastName: 'Johnson',
      email: 'user1@unit.test',
      organisations: ['org1'],
      primaryOrganisation: 'Organisation One',
      searchableOrganisations: ['organisationone'],
      organisationCategories: ['001'],
      organisationsJson: JSON.stringify([
        {
          id: 'org1',
          name: 'Organisation One',
          categoryId: '001',
          statusId: 1,
          roleId: 10000,
        },
      ]),
      services: [],
      lastLogin: new Date(2018, 10, 31, 12, 36, 12),
      numberOfSuccessfulLoginsInPast12Months: 10,
      statusLastChangedOn: undefined,
      statusId: 1,
      pendingEmail: undefined,
      legacyUsernames: ['sau1'],
    }], 'correlation-id');
  });

  it('then it should return 202 response', async () => {
    await update(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.send).toHaveBeenCalledTimes(1);
  });
});
