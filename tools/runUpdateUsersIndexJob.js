const updateUsersIndex = require('./../src/app/scheduledTasks/updateUsersIndex');
const uuid = require('uuid/v4');

const run = async () => {
  const correlationId = `Single-UpdateUsersIndex-${uuid()}`;
  console.info(`starting update users index ${correlationId}`);
  const start = Date.now();
  await updateUsersIndex(correlationId);
  return Date.now() - start;
};
run().then((durationInMilliseconds) => {
  console.info(`done in ${durationInMilliseconds / 1000}s`);
}).catch((e) => {
  console.error(e.stack);
}).then(()=>{
  process.exit();
});
