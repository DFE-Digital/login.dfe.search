const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const session = require('express-session');
const flash = require('express-flash-2');
const path = require('path');
const logger = require('./infrastructure/logger');
const https = require('https');
const config = require('./infrastructure/config');
const configSchema = require('./infrastructure/config/schema');
const helmet = require('helmet');
const healthCheck = require('login.dfe.healthcheck');
const registerRoutes = require('./routes');
const { getErrorHandler } = require('login.dfe.express-error-handling');
const apiAuth = require('login.dfe.api.auth');

configSchema.validate();

const app = express();
app.use(helmet({
  noCache: true,
  frameguard: {
    action: 'deny',
  },
}));

if (config.hostingEnvironment.env !== 'dev') {
  app.set('trust proxy', 1);
}


if (config.hostingEnvironment.useDevViews) {

  app.use(session({
    secret: 'development, screens, only',
    httpOnly: true,
    secure: true,
  }));
  app.use(flash());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(bodyParser.json());

  app.set('view engine', 'ejs');
  app.set('views', path.resolve(__dirname, 'app'));
  app.use(expressLayouts);
  app.set('layout', 'layouts/layout');
  let assetsUrl = config.hostingEnvironment.assetsUrl || 'https://rawgit.com/DFE-Digital/dfe.ui.toolkit/master/dist/';
  assetsUrl = assetsUrl.endsWith('/') ? assetsUrl.substr(0, assetsUrl.length - 1) : assetsUrl;

  Object.assign(app.locals, {
    urls: {
      assets: assetsUrl,
    },
  });
}

app.use(bodyParser.json());
app.use((req, res, next) => {
  req.correlationId = req.get('x-correlation-id') || `srchci-${Date.now()}`;
  next();
});

app.use('/healthcheck', healthCheck({ config }));
if (config.hostingEnvironment.env !== 'dev') {
  app.use(apiAuth(app, config));
}
registerRoutes(app);

app.use(getErrorHandler({
  logger,
}));

if (config.hostingEnvironment.env === 'dev') {
  app.proxy = true;

  const options = {
    key: config.hostingEnvironment.sslKey,
    cert: config.hostingEnvironment.sslCert,
    requestCert: false,
    rejectUnauthorized: false,
  };
  const server = https.createServer(options, app);

  server.listen(config.hostingEnvironment.port, () => {
    logger.info(`Dev server listening on https://${config.hostingEnvironment.host}:${config.hostingEnvironment.port}`);
  });
} else if (config.hostingEnvironment.env === 'docker') {
  app.listen(config.hostingEnvironment.port, () => {
    logger.info(`Server listening on http://${config.hostingEnvironment.host}:${config.hostingEnvironment.port}`);
  });
} else {
  app.listen(process.env.PORT, () => {
    logger.info(`Server listening on http://${config.hostingEnvironment.host}:${config.hostingEnvironment.port}`);
  });
}
