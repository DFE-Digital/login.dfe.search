const { directories } = require("login.dfe.dao");
const config = require("./../config");
const ApiClient = require("./../utils/ApiClient");

const client = new ApiClient(config.directories.service);

const getInvitation = async (id, correlationId) => {
  let resource = `/invitations/${id}`;
  return client.get(resource, correlationId);
};

const getUser = async (id) => directories.getUser(id);

const getUsers = async (ids) => directories.getUsers(ids);

module.exports = {
  getInvitation,
  getUser,
  getUsers,
};
