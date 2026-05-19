/**
 * Trust Module
 * Exports trust routes, admin appeal routes, and sathi task routes.
 */
const express = require('express');
const trustRoutes = require('./routes/trustRoutes');
const sathiTaskRoutes = require('./routes/sathiTaskRoutes');
const trustController = require('./controllers/trustController');
const { authenticate } = require('../../middleware/auth');
const roleCheck = require('../../middleware/roleCheck');

// Admin routes for appeal management
const adminTrustRoutes = express.Router();
adminTrustRoutes.use(authenticate);
adminTrustRoutes.use(roleCheck('ADMIN', 'SYSTEM_OPERATOR'));
adminTrustRoutes.get('/appeals', trustController.getAppealsAdmin);

module.exports = { trustRoutes, adminTrustRoutes, sathiTaskRoutes };
