const UserIndex = require('./../indexes/UserIndex');

const extractFilters = (req) => {
  const filterable = ['id', 'organisations', 'organisationCategories', 'services', 'statusId'];
  const filters = [];
  filterable.forEach((field) => {
    const param = req.query[`filter_${field}`];
    if (param) {
      filters.push({
        field,
        values: param instanceof Array ? param : [param],
      });
    }
  });
  return filters.length > 0 ? filters : undefined;
};

const removeWildCardAndEscapeSpecialChars = (criteria) => {
  const format = /[ !'@#$%&()_+\-=\[\]{};':"\\|,.<>\/?]/;
  return format.test(criteria)? criteria.slice(0, -1).replace(/[.'+?^${}()|[\]\\]/g, '\\$&'): criteria;
}

const search = async (req, res) => {
  const criteria = removeWildCardAndEscapeSpecialChars(req.query.criteria) || '*';
  const page = parseInt(req.query.page) || 1;
  const filters = extractFilters(req);
  const sortBy = req.query.sortBy || 'searchableName';
  const sortAsc = !((req.query.sortDirection || 'asc') === 'desc');
  const searchFields = req.query.searchFields || undefined;

  if (isNaN(page) || page < 1) {
    return res.status(400).json({
      reason: 'page query string must be a number 1 or greater'
    });
  }

  const index = await UserIndex.current();
  const pageOfUsers = await index.search(criteria, page, 25, sortBy, sortAsc, filters, searchFields);
  return res.json(pageOfUsers);
};
module.exports = search;
