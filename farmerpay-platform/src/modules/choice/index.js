/**
 * CHOICE module exports
 *   - choiceRoutes  → legacy CRP discovery / selection / rating (mounted at /choice)
 *   - sathiRoutes   → Sathi assist, commissions, incentives, issues, nudges,
 *                     dashboard (mounted at /sathi)
 */

const choiceRoutes = require('./routes/choiceRoutes');
const sathiRoutes = require('./routes/sathiRoutes');

module.exports = choiceRoutes;
module.exports.choiceRoutes = choiceRoutes;
module.exports.sathiRoutes = sathiRoutes;
