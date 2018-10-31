const configSchema = require('./infrastructure/config/schema');
const logger = require('./infrastructure/logger');
const config = require('./infrastructure/config');
const express = require('express');
const healthCheck = require('login.dfe.healthcheck');
const scheduledTasks = require('./app/scheduledTasks');

configSchema.validate();

scheduledTasks.start();

// Health check
const port = process.env.PORT || 3000;
const app = express();
app.use('/healthcheck', healthCheck({ config }));
app.listen(port, () => {
  logger.info(`Server listening on http://localhost:${port}`);
});