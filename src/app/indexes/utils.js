const getSearchableString = (source) => {
  return source.toLowerCase()
    .replace(/\s/g, '');
};

module.exports = {
  getSearchableString
};
