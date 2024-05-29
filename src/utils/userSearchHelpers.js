function createLastLoginFilterExpression(filter) {
  const dateFilterExpressions = filter.values.map((dateValue) => {
    if (dateValue === '0') {
      return `${filter.field} eq null`;
    } if (dateValue === '1') {
      return `${filter.field} ne null`;
    }
    return `${filter.field} ge ${new Date(Number.parseInt(dateValue, 10)).toISOString()}`;
  });

  return dateFilterExpressions.join(' or ');
}

module.exports = {
  createLastLoginFilterExpression,
};
