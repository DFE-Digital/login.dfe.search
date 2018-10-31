const tidyIndexes = require('./../src/app/scheduledTasks/tidyIndexes');
const uuid = require('uuid/v4');

const run = async () => {
  const correlationId = `Single-TidyIndexes-${uuid()}`;
  console.info(`starting tidy indexed ${correlationId}`);
  await tidyIndexes(correlationId);
};
run().then(() => {
  console.info('done');
}).catch((e) => {
  console.error(e.stack);
}).then(()=>{
  process.exit();
});
