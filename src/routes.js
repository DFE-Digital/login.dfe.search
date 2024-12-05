const users = require("./app/users");

const registerRoutes = (app) => {
  app.use("/users", users());
};

module.exports = registerRoutes;
