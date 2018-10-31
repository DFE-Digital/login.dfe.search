const config = require('./../config');

let cache;
if(config.cache.type === 'redis') {
  cache = require('./redis');
} else {
  cache = require('./memory');
}
module.exports = cache;