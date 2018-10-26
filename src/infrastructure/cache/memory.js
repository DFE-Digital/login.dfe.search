const store = [];

const get = async (key) => {
  const instance = store.find(x => x.key === key);
  if (!instance) {
    return undefined;
  }
  if (instance.expires && instance.expires < Date.now()) {
    return undefined;
  }
  return Promise.resolve(JSON.parse(instance.value));
};

const set = async (key, value, secondsToLive = 0) => {
  let existing = store.find(x => x.key === key);
  if (!existing) {
    existing = { key };
    store.push(existing);
  }
  existing.value = JSON.stringify(value);
  existing.expires = secondsToLive > 0 ? Date.now()(secondsToLive * 1000) : undefined;
  return Promise.resolve();
};

module.exports = {
  get,
  set,
};
