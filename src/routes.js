const users = require('./app/users');
const devices = require('./app/devices');
const devTaskHelpers = require('./app/devTaskHelpers');

const config = require('./infrastructure/config');


const registerRoutes = (app) => {
  app.use('/users', users());
  app.use('/devices', devices());

  if (config.hostingEnvironment.useDevViews) {
    app.use('/', devTaskHelpers());
  }
};

module.exports = registerRoutes;
