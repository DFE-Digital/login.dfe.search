const { getUser, getUsers } = require("../infrastructure/directories");

/**
 * Overwrite the lastLogin property in a user object from UserIndex
 * to the value from the user table (last_login) in the directories database.
 * @param {Object} userData - User data retrieved from the UserIndex.
 * @returns {Promise<Object>} - User data object with the last login updated from the database.
 */
async function overwriteAuditLastLogin(userData) {
  const user = userData;

  if (!user.id.startsWith("inv-")) {
    const databaseUser = await getUser(user.id);
    user.lastLogin = databaseUser.last_login;
  }

  return user;
}

/**
 * Overwrite the lastLogin property in multiple user objects from UserIndex
 * to their values from the user table (last_login) in the directories database.
 * @param {Object[]} usersData Multiple user's data retrieved from the UserIndex.
 * @returns {Promise<Object[]>} Multiple users data object with the last login updated from the database.
 */
async function overwriteAuditLastLogins(usersData) {
  const users = usersData;
  const userIndexes = new Map(users.map((user, index) => [user.id, index]));
  // Invitations have a different ID, and they won't have a last login, so cannot be overwritten.
  const userOverwriteIds = usersData
    .filter((user) => !user.id.startsWith("inv-"))
    .map((user) => user.id);

  if (userOverwriteIds.length > 0) {
    const databaseUsers = await getUsers(userOverwriteIds);
    databaseUsers.forEach((dbUser) => {
      users[userIndexes.get(dbUser.sub)].lastLogin = dbUser.last_login;
    });
  }

  return users;
}

module.exports = {
  overwriteAuditLastLogin,
  overwriteAuditLastLogins,
};
