const UserIndex = require("../indexes/UserIndex");

const create = async (req, res) => {
  if (!req.body.id) {
    return res.status(400).send();
  }

  const userIndex = new UserIndex();
  const searchResult = await userIndex.search(
    "*",
    1,
    1,
    "searchableName",
    true,
    [
      {
        field: "id",
        values: [req.body.id],
      },
    ],
  );
  if (searchResult.users.length > 0) {
    return res.status(403).send();
  }

  await userIndex.indexUserById(req.body.id, req.correlationId);
  return res.status(201).send();
};

module.exports = create;
