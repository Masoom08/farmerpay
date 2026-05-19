/**
 * Insurance Phase 2 POS — Product catalog controller.
 *
 * All three handlers are public (no auth) so the farmer app can render
 * the catalog even before the farmer logs in. The server never exposes
 * anything sensitive here.
 */

const productCatalogService = require('../services/productCatalogService');
const { success } = require('../../../shared/utils/responseHelper');

const listProducts = async (req, res, next) => {
  try {
    const data = await productCatalogService.listProducts({
      subsidyType: req.query.subsidyType || null,
      category: req.query.category || null,
    });
    return success(res, { message: 'Insurance products retrieved', data });
  } catch (e) {
    next(e);
  }
};

const getGroupedProducts = async (req, res, next) => {
  try {
    const data = await productCatalogService.groupedByScheme({
      subsidyType: req.query.subsidyType || null,
    });
    return success(res, { message: 'Grouped products retrieved', data });
  } catch (e) {
    next(e);
  }
};

const getProduct = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = await productCatalogService.getProductById(id);
    return success(res, { message: 'Product retrieved', data });
  } catch (e) {
    next(e);
  }
};

module.exports = {
  listProducts,
  getGroupedProducts,
  getProduct,
};
