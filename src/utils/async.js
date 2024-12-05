const forEachAsync = async (collection, iteratee) => {
  for (let i = 0; i < collection.length; i += 1) {
    await iteratee(collection[i], i);
  }
};
const mapAsync = async (collection, iteratee) => {
  const mapped = [];
  await forEachAsync(collection, async (item, index) => {
    mapped.push(await iteratee(item, index));
  });
  return mapped;
};

module.exports = {
  forEachAsync,
  mapAsync,
};
