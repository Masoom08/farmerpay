/**
 * Vyapar Module
 * Exports vendor, transaction and ecosystem routers for mounting in app.js.
 */

const vendorRoutes = require('./routes/vendorRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const ecosystemRoutes = require('./routes/ecosystemRoutes');
const farmerVendorRoutes = require('./routes/farmerVendorRoutes');

module.exports = { vendorRoutes, transactionRoutes, ecosystemRoutes, farmerVendorRoutes };
