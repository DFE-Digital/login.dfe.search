const reindexUsers = require('./../src/app/scheduledTasks/reindexUsers');
const uuid = require('uuid/v4');

const run = async () => {
  const correlationId = `Single-ReindexUsers-${uuid()}`;
  console.info(`starting re-index users ${correlationId}`);
  const start = Date.now();
  await reindexUsers(correlationId);
  return Date.now() - start;
};
run().then((durationInMilliseconds) => {
  console.info(`done in ${durationInMilliseconds / 1000}s`);
}).catch((e) => {
  console.error(e.stack);
}).then(()=>{
  process.exit();
});
