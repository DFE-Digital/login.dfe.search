const winston = require("winston");
const appInsights = require("applicationinsights");
const AuditTransporter = require("login.dfe.audit.transporter");
const AppInsightsTransport = require("login.dfe.winston-appinsights");
const config = require("../config");

const logLevel =
  config && config.loggerSettings && config.loggerSettings.logLevel
    ? config.loggerSettings.logLevel
    : "info";

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
    info: "yellow",
    ok: "green",
    error: "red",
    audit: "magenta",
  },
};

// Formatter to hide audit records from other loggers.
const hideAudit = winston.format((info) =>
  info.level.toLowerCase() === "audit" ? false : info,
);

const loggerConfig = {
  levels: customLevels.levels,
  transports: [],
};

loggerConfig.transports.push(
  new winston.transports.Console({
    format: winston.format.combine(hideAudit(), winston.format.simple()),
    level: logLevel,
  }),
);

const opts = {
  application: config.loggerSettings.applicationName,
  level: "audit",
};
const auditTransport = AuditTransporter(opts);

if (auditTransport) {
  loggerConfig.transports.push(auditTransport);
}

if (config.hostingEnvironment.applicationInsights) {
  appInsights
    .setup(config.hostingEnvironment.applicationInsights)
    .setAutoCollectConsole(false, false)
    .start();
  loggerConfig.transports.push(
    new AppInsightsTransport({
      format: winston.format.combine(hideAudit(), winston.format.json()),
      client: appInsights.defaultClient,
      applicationName: config.loggerSettings.applicationName || "Search",
      type: "event",
      treatErrorsAsExceptions: true,
    }),
  );
}

const logger = winston.createLogger(loggerConfig);

process.on("unhandledRejection", (reason, p) => {
  logger.error("Unhandled Rejection at:", p, "reason:", reason);
});
process.on("uncaughtException", (err) => {
  try {
    logger.error(err.message);
  } catch (e) {
    console.error(`Failed to log fatal error to logger (${e.message})`);
    console.error(err.message);
  }

  process.exit(-99);
});

module.exports = logger;
