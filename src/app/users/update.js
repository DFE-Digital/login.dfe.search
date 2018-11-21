const UserIndex = require('./../indexes/UserIndex');

const patchableProperties = ['firstName', 'lastName', 'email', 'organisations', 'services', 'statusId', 'pendingEmail', 'legacyUsernames'];
const requiredOrganisationProperties = ['id', 'name', 'categoryId', 'statusId', 'roleId'];

const processPatchProperties = (req) => {
  const result = {
    patch: {},
    errors: [],
  };
  const requestedProperties = Object.keys(req.body);
  requestedProperties.forEach((propertyName) => {
    const value = req.body[propertyName];

    if (!patchableProperties.find(x => x === propertyName)) {
      result.errors.push(`${propertyName} is not a patchable property`);
      return;
    }

    if ((propertyName === 'firstName' || propertyName === 'lastName' || propertyName === 'email') && !value) {
      result.errors.push(`${propertyName} must have a value`);
      return;
    }

    if ((propertyName === 'organisations' || propertyName === 'services' || propertyName === 'legacyUsernames') && !(value instanceof Array)) {
      result.errors.push(`${propertyName} must be an array`);
      return;
    }

    if (propertyName === 'organisations') {
      for (let i = 0; i < value.length; i++) {
        const org = value[i];
        requiredOrganisationProperties.forEach((reqOrgPropName) => {
          const propValue = org[reqOrgPropName];
          if (propValue === '' || propValue === undefined || propValue === null) {
            result.errors.push(`organisations item at index ${i} must have ${reqOrgPropName}`);
          }
        });
      }
    }

    result.patch[propertyName] = value;
  });
  return result;
};
const update = async (req, res) => {
  const userIndex = await UserIndex.current();
  const searchResult = await userIndex.search('*', 1, 1, 'searchableName', true, [
    {
      field: 'id',
      values: [req.params.uid],
    }
  ]);
  if (searchResult.users.length === 0) {
    return res.status(404).send();
  }

  const patchRequest = processPatchProperties(req);
  if (patchRequest.errors.length > 0) {
    return res.status(400).contentType('json').send({ errors: patchRequest.errors });
  }

  const patched = Object.assign({}, searchResult.users[0], patchRequest.patch);
  patched.organisationsJson = JSON.stringify(patched.organisations);
  patched.organisations = undefined;
  patched.primaryOrganisation = undefined;

  await userIndex.store([patched], req.correlationId);
  return res.status(202).send();
};
module.exports = update;
