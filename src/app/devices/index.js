const express = require('express');
const { asyncWrapper } = require('login.dfe.express-error-handling');

const search = require('./search');
const getBySerialNumber = require('./getBySerialNumber');
// const update = require('./update');

const router = express.Router({ mergeParams: true });

const area = () => {
  router.get('/', asyncWrapper(search));
  router.get('/:sn', asyncWrapper(getBySerialNumber));
  // router.patch('/:uid', asyncWrapper(update));

  return router;
};
module.exports = area;