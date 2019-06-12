const DeviceIndex = require('./../indexes/DeviceIndex');

const patchableProperties = ['assigneeId', 'assignee', 'organisationName', 'statusId'];

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

    result.patch[propertyName] = value;
  });

  if (result.patch.assignee && !result.patch.assigneeId) {
    result.errors.push(`If patching assignee, you must also patch assigneeId`);
  }
  if (result.patch.assigneeId && !result.patch.assignee) {
    result.errors.push(`If patching assigneeId, you must also patch assignee`);
  }

  if (result.patch.statusId !== undefined && (result.patch.statusId < 1 || result.patch.statusId > 3)) {
    result.errors.push(`If patching statusId, value can only be 1 (Unassigned), 2 (Assigned), or 3 (Deactivated)`);
  }

  return result;
};
const update = async (req, res) => {
  const index = await DeviceIndex.current();
  const pageOfDevices = await index.search('*', 1, 1, 'serialNumber', true, [
    {
      field: 'serialNumber',
      values: [req.params.sn],
    },
  ]);
  if (pageOfDevices.devices.length === 0) {
    return res.status(404).send();
  }

  const patchRequest = processPatchProperties(req);
  if (patchRequest.errors.length > 0) {
    return res.status(400).contentType('json').send({ errors: patchRequest.errors });
  }

  const patched = Object.assign({}, pageOfDevices.devices[0], patchRequest.patch);

  await index.store([patched], req.correlationId);
  return res.status(202).send();
};
module.exports = update;
