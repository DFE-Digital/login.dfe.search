const DeviceIndex = require('./../indexes/DeviceIndex');

const search = async (req, res) => {
  const criteria = req.query.criteria || '*';
  const page = parseInt(req.query.page) || 1;

  if (isNaN(page) || page < 1) {
    return res.status(400).json({
      reason: 'page query string must be a number 1 or greater'
    });
  }

  const index = await DeviceIndex.current();
  const pageOfDevices = await index.search(criteria, page, 25, 'serialNumber', true, undefined);
  return res.json(pageOfDevices);
};
module.exports = search;
