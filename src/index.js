const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const flash = require('login.dfe.express-flash-2');
const path = require('path');
const https = require('https');
const http = require('http');
const helmet = require('helmet');
const healthCheck = require('login.dfe.healthcheck');
const { getErrorHandler } = require('login.dfe.express-error-handling');
const apiAuth = require('login.dfe.api.auth');
const registerRoutes = require('./routes');
const configSchema = require('./infrastructure/config/schema');
const config = require('./infrastructure/config');
const logger = require('./infrastructure/logger');

configSchema.validate();

const app = express();
https.globalAgent.maxSockets = http.globalAgent.maxSockets = config.hostingEnvironment.agentKeepAlive.maxSockets || 50;

app.use(helmet({
  noCache: true,
  frameguard: {
    action: 'deny',
  },
}));

logger.info('set helmet policy defaults');

// Setting helmet Content Security Policy
const scriptSources = ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'localhost', '*.signin.education.gov.uk', 'https://code.jquery.com'];

app.use(helmet.contentSecurityPolicy({
  browserSniff: false,
  setAllHeaders: false,
  useDefaults: false,
  directives: {
    defaultSrc: ["'self'"],
    childSrc: ["'none'"],
    objectSrc: ["'none'"],
    scriptSrc: scriptSources,
    styleSrc: ["'self'", "'unsafe-inline'", 'localhost', '*.signin.education.gov.uk'],
    imgSrc: ["'self'", 'data:', 'blob:', 'localhost', '*.signin.education.gov.uk'],
    fontSrc: ["'self'", 'data:', '*.signin.education.gov.uk'],
    connectSrc: ["'self'"],
    formAction: ["'self'", '*'],
  },
}));

logger.info('Set helmet filters');

app.use(helmet.xssFilter());
app.use(helmet.frameguard('false'));
app.use(helmet.ieNoOpen());

logger.info('helmet setup complete');

if (config.hostingEnvironment.env !== 'dev') {
  app.set('trust proxy', 1);
}

if (config.hostingEnvironment.useDevViews) {
  app.use(session({
    secret: 'development, screens, only',
    httpOnly: true,
    secure: true,
    resave: true,
    saveUninitialized: true,
  }));
  app.use(flash());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.set('view engine', 'ejs');
  app.set('views', path.resolve(__dirname, 'app'));
  app.use(expressLayouts);
  app.set('layout', 'layouts/layout');
  let assetsUrl = config.assets.url;
  assetsUrl = assetsUrl.endsWith('/') ? assetsUrl.substr(0, assetsUrl.length - 1) : assetsUrl;

  Object.assign(app.locals, {
    urls: {
      assets: assetsUrl,
    },
  });
}

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
} else {
  app.listen(process.env.PORT, () => {
    logger.info(`Server listening on http://${config.hostingEnvironment.host}:${config.hostingEnvironment.port}`);
  });
}
