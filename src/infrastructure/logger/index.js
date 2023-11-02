'use strict';

/* eslint-disable no-unused-expressions */

const winston = require('winston');
const config = require('../config');
const appInsights = require('applicationinsights');
const AuditTransporter = require('login.dfe.audit.transporter');
const AppInsightsTransport = require('login.dfe.winston-appinsights');

const logLevel = (config && config.loggerSettings && config.loggerSettings.logLevel) ? config.loggerSettings.logLevel : 'info';

const customLevels = {
  levels: {
    audit: 0,
    error: 1,
    warn: 2,
    info: 3,
    verbose: 4,
    debug: 5,
    silly: 6,
  },
  colors: {
    info: 'yellow',
    ok: 'green',
    error: 'red',
    audit: 'magenta',
  },
};

const loggerConfig = {
  levels: customLevels.levels,
  transports: [],
};

loggerConfig.transports.push(new (winston.transports.Console)({ level: logLevel, colorize: true }));

const opts = { application: config.loggerSettings.applicationName, level: 'audit' };
const auditTransport = AuditTransporter(opts);

if (auditTransport) {
  loggerConfig.transports.push(auditTransport);
}

if (config.hostingEnvironment.applicationInsights) {
  appInsights.setup(config.hostingEnvironment.applicationInsights).setAutoCollectConsole(false, false).start();
  loggerConfig.transports.push(new AppInsightsTransport({
    client: appInsights.defaultClient,
    applicationName: config.loggerSettings.applicationName || 'Search',
    type: 'event',
    treatErrorsAsExceptions: true,
  }));
}

const logger = winston.createLogger(loggerConfig);

process.on('unhandledRejection', (reason, p) => {
  logger.error('Unhandled Rejection at:', p, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  try {
    logger.error(err.message);
  } catch (e) {
    console.error(`Failed to log fatal error to logger (${e.message})`);
    console.error(err.message);
  }

  process.exit(-99);
});

module.exports = logger;
