const { directories } = require("login.dfe.dao");

const getUser = async (id) => directories.getUser(id);

const getUsers = async (ids) => directories.getUsers(ids);

module.exports = {
  getUser,
  getUsers,
};
