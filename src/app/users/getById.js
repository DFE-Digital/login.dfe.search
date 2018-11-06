const UserIndex = require('./../indexes/UserIndex');

const getById = async (req, res) => {
  const index = await UserIndex.current();
  const pageOfUsers = await index.search('*', 1, 1, 'searchableName', true, [
    {
      field: 'id',
      values: [req.params.uid],
    }
  ]);
  if(pageOfUsers.users.length === 0){
    return res.status(404).send();
  }
  return res.json(pageOfUsers.users[0]);
};
module.exports = getById;
