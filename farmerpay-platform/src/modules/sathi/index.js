/**
 * SATHI Module
 * Exports sathi, task, and choice routers for mounting in app.js.
 */

const sathiRoutes = require('./routes/sathiRoutes');
const taskRoutes = require('./routes/taskRoutes');
const choiceRoutes = require('./routes/choiceRoutes');

module.exports = { sathiRoutes, taskRoutes, choiceRoutes };
