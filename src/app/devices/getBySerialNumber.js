const DeviceIndex = require('./../indexes/DeviceIndex');

const getBySerialNumber = async (req, res) => {
  const index = await DeviceIndex.current();
  const pageOfDevices = await index.search('*', 1, 1, 'serialNumber', true, [
    {
      field: 'serialNumber',
      values: [req.params.sn],
    }
  ]);
  if(pageOfDevices.devices.length === 0){
    return res.status(404).send();
  }
  return res.json(pageOfDevices.devices[0]);
};
module.exports = getBySerialNumber;
