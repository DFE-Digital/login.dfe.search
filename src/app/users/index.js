const express = require('express');
const { asyncWrapper } = require('login.dfe.express-error-handling');

const search = require('./search');

const router = express.Router({ mergeParams: true });

const area = () => {
  router.get('/', asyncWrapper(search));

  return router;
};
module.exports = area;