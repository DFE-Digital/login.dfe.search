const { invitation, directories } = require('login.dfe.dao');
const config = require('./../config');
const ApiClient = require('./../utils/ApiClient');

const client = new ApiClient(config.directories.service);

const listUsers = async (page, pageSize, includeDevices, includeCodes, includeLegacyUsernames, changedAfter, correlationId) => {
  let resource = `/users?page=${page}&pageSize=${pageSize}`;
  if (changedAfter) {
    resource += `&changedAfter=${changedAfter.toISOString()}`;
  }
  const includes = [
    includeDevices ? 'devices' : undefined,
    includeCodes ? 'codes' : undefined,
    includeLegacyUsernames ? 'legacyusernames' : undefined,
  ].filter(x => x !== undefined);
  if (includes) {
    resource += `&include=${includes.join(',')}`;
  }
  return client.get(resource, correlationId);
};

const listInvitations = async (page, pageSize, changedAfter, correlationId) => {
  let resource = `/invitations?page=${page}&pageSize=${pageSize}`;
  if (changedAfter) {
    resource += `&changedAfter=${changedAfter.toISOString()}`;
  }
  return client.get(resource, correlationId);
};

const listDeviceAssociations = async (page, pageSize, correlationId) => {
  const resource = `/devices?page=${page}&pageSize=${pageSize}`;
  return client.get(resource, correlationId);
};

const getInvitation = async (id, correlationId) => {
  let resource = `/invitations/${id}`;
  return client.get(resource, correlationId);
};

const getUser = async (id) => directories.getUser(id);

module.exports = {
  listUsers,
  listInvitations,
  listDeviceAssociations,
  getInvitation,
  getUser,
};
