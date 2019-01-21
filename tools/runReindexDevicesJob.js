const reindexDevices = require('./../src/app/scheduledTasks/reindexDevices');
const uuid = require('uuid/v4');

const run = async () => {
  const correlationId = `Single-ReindexDevices-${uuid()}`;
  console.info(`starting re-index devices ${correlationId}`);
  const start = Date.now();
  await reindexDevices(correlationId);
  return Date.now() - start;
};
run().then((durationInMilliseconds) => {
  console.info(`done in ${durationInMilliseconds / 1000}s`);
}).catch((e) => {
  console.error(e.stack);
}).then(()=>{
  process.exit();
});
