const users = require('./app/users');
const devices = require('./app/devices');

const registerRoutes = (app) => {
  app.use('/users', users());
  app.use('/devices', devices());
};

module.exports = registerRoutes;