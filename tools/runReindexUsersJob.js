const reindexUsers = require('./../src/app/scheduledTasks/reindexUsers');
const uuid = require('uuid/v4');

const run = async () => {
  const correlationId = `Single-ReindexUsers-${uuid()}`;
  console.info(`starting re-index users ${correlationId}`);
  await reindexUsers(correlationId);
};
run().then(() => {
  console.info('done');
}).catch((e) => {
  console.error(e.stack);
}).then(()=>{
  process.exit();
});
