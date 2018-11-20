const express = require('express');
const { asyncWrapper } = require('login.dfe.express-error-handling');

const search = require('./search');
const getById = require('./getById');
const update = require('./update');

const router = express.Router({ mergeParams: true });

const area = () => {
  router.get('/', asyncWrapper(search));
  router.get('/:uid', asyncWrapper(getById));
  router.patch('/:uid', asyncWrapper(update));

  return router;
};
module.exports = area;