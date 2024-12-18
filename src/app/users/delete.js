const UserIndex = require("../indexes/UserIndex");
const logger = require("../../infrastructure/logger");

const deleteUser = async (req, res) => {
  const userIndex = new UserIndex();
  try {
    const searchResult = await userIndex.search(
      "*",
      1,
      1,
      "searchableName",
      true,
      [
        {
          field: "id",
          values: [req.params.uid],
        },
      ],
    );

    if (searchResult.users.length === 0) {
      return res.status(404).send();
    }

    await userIndex.delete(searchResult.users[0].id);
    return res.status(202).send();
  } catch (e) {
    logger.error(
      `Error deleting document (correlation id: ${req.correlationId} - ${e.message}`,
    );
    throw e;
  }
};

module.exports = deleteUser;
