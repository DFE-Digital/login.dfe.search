const Redis = require('ioredis');
const config = require('./../config');

const redis = new Redis(config.cache.params.connectionString);

const get = async (key) => {
  const value = await redis.get(key);
  return value ? JSON.parse(value) : undefined;
};

const set = async (key, value, secondsToLive = 0) => {
  if(secondsToLive>0){
    await redis.multi().set(key, JSON.stringify(value)).expire(secondsToLive).exec();
  } else {
    await redis.set(key, JSON.stringify(value));
  }
};

module.exports = {
  get,
  set,
};
