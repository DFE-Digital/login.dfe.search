function createLastLoginFilterExpression(filter) {
  const dateFilterExpressions = filter.values.map((dateValue) => {
    if (dateValue === '0') {
      return `${filter.field} eq ${dateValue}`;
    } if (dateValue === '1') {
      return `${filter.field} ne 0`;
    }
    return `${filter.field} ge ${dateValue}`;
  });

  return dateFilterExpressions.join(' or ');
}

module.exports = {
  createLastLoginFilterExpression,
};
