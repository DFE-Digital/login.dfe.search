const { getUser } = require('../infrastructure/directories');

/**
 * Overwrite the lastLogin property in a user object from UserIndex
 * to the value from the user table (last_login) in the directories database.
 * @param {Object} userData - User data retrieved from the UserIndex.
 * @returns {Promise<Object>} - User data object with the last login updated from the database.
 */
async function overwriteAuditLastLogin(userData) {
  const user = userData;
  const databaseUser = await getUser(user.id);
  user.lastLogin = (databaseUser.last_login);
  return user;
}

module.exports = {
  overwriteAuditLastLogin,
};
