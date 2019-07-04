const express = require('express');
const { asyncWrapper } = require('login.dfe.express-error-handling');


const { getStarter, postStarter} = require('./starter');

const router = express.Router({ mergeParams: true });

const area = () => {
  router.get('/', asyncWrapper(getStarter));
  router.post('/', asyncWrapper(postStarter));
  return router;
};

module.exports = area;
