const { overwriteAuditLastLogin } = require('../../utils/userHelper');
const UserIndex = require('../indexes/UserIndex');

const getById = async (req, res) => {
  const index = new UserIndex();
  const pageOfUsers = await index.search('*', 1, 1, 'searchableName', true, [
    {
      field: 'id',
      values: [req.params.uid],
    },
  ]);
  if (pageOfUsers.users.length === 0) {
    return res.status(404).send();
  }

  return res.json(await overwriteAuditLastLogin(pageOfUsers.users[0]));
};
module.exports = getById;
