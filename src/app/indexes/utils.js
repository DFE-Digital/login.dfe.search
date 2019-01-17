const getSearchableString = (source) => {
  return source.toLowerCase()
    .replace(/\s/g, '')
    .replace(/@/g, '__at__')
    .replace(/\./g, '__dot__');
};

module.exports = {
  getSearchableString,
};
