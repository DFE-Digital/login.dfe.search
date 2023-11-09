const { overwriteAuditLastLogins } = require('../../utils/userHelper');
const UserIndex = require('./../indexes/UserIndex');

const extractFilters = (req) => {
  const paramsSource = req.method === 'POST' ? req.body : req.query;
  const filterable = ['id', 'organisations', 'organisationCategories', 'services', 'statusId', 'lastLogin'];
  const filters = [];
  filterable.forEach((field) => {
    const param = paramsSource[`filter_${field}`];
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
  const format = /[ !'*@#$%&()_+\-=\[\]{};':"\\|,.<>\/?]/;
  return format.test(criteria)? criteria.slice(0, -1).replace(/[.'+?^${}()|[\]\\]/g, '\\$&'): criteria;
}

const search = async (req, res) => {
  const paramsSource = req.method === 'POST' ? req.body : req.query;
  const criteria = removeWildCardAndEscapeSpecialChars(paramsSource.criteria) || '*';
  const page = parseInt(paramsSource.page) || 1;
  const filters = extractFilters(req);
  const sortBy = paramsSource.sortBy || 'searchableName';
  const sortAsc = !((paramsSource.sortDirection || 'asc') === 'desc');
  const searchFields = paramsSource.searchFields || undefined;

  if (isNaN(page) || page < 1) {
    return res.status(400).json({
      reason: 'page query string must be a number 1 or greater',
    });
  }

  const index = await UserIndex.current();
  const pageOfUsers = await index.search(criteria, page, 25, sortBy, sortAsc, filters, searchFields);
  pageOfUsers.users = await overwriteAuditLastLogins(pageOfUsers.users);

  return res.json(pageOfUsers);
};
module.exports = search;
