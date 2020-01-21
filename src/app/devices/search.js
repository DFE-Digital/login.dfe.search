const DeviceIndex = require('./../indexes/DeviceIndex');

const removeWildCardAndEscapeSpecialChars = (criteria) => {
  const format = /[ !'@#$%&()_+=\[\]{};':"\\|,.<>\/?]/;
  return format.test(criteria)? criteria.slice(0, -1).replace(/[.'+?^${}()|[\]\\]/g, '\\$&'): criteria;
}

const search = async (req, res) => {
  const criteria = removeWildCardAndEscapeSpecialChars(req.query.criteria) || '*';
  const page = parseInt(req.query.page) || 1;
  const sortBy = req.query.sortBy || 'serialNumber';
  const sortAsc = !((req.query.sortDirection || 'asc') === 'desc');

  if (isNaN(page) || page < 1) {
    return res.status(400).json({
      reason: 'page query string must be a number 1 or greater'
    });
  }

  const index = await DeviceIndex.current();
  const pageOfDevices = await index.search(criteria, page, 25, sortBy, sortAsc, undefined);
  return res.json(pageOfDevices);
};
module.exports = search;
