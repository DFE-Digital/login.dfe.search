const express = require('express');
const { asyncWrapper } = require('login.dfe.express-error-handling');

const search = require('./search');
const getById = require('./getById');
const update = require('./update');
const create = require('./create');
const deleteUser = require('./delete');

const router = express.Router({ mergeParams: true });

const area = () => {
  router.get('/', asyncWrapper(search));
  router.post('/', asyncWrapper(search));
  router.post('/update-index', asyncWrapper(create));
  router.get('/:uid', asyncWrapper(getById));
  router.patch('/:uid', asyncWrapper(update));
  router.delete('/:uid', asyncWrapper(deleteUser));

  return router;
};
module.exports = area;
