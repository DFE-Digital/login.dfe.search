const {availableTasks} = require('../scheduledTasks');

const getStarter = async (req, res) => {
  res.render('devTaskHelpers/views/starter', {availableTasks: Object.keys(availableTasks)});
};

const postStarter =  (req, res) => {
  const task = availableTasks[req.body.task];
  if (!task) {
    res.flash('info', `Invalid Task`);
    return res.render('devTaskHelpers/views/starter', {availableTasks: Object.keys(availableTasks)});
  }

  res.flash('info', `Task (${req.body.task}) Invoked`);


  task();

  return res.redirect('/');
};

module.exports =
  {
    getStarter,
    postStarter,
  };
