'use strict';

/**
 * Vendor / Krishi Bazaar demo seeder
 *
 * Creates:
 *   - 2 vendor users + vendor_profiles (seeds_distributor + multipurpose_dealer)
 *   - 2 vendor_shops with LGD location
 *   - Product catalog entries (6 items per vendor)
 *   - vendor_farmer_links linking to the 5 demo farmers from sathi seeder
 *   - 8 vendor_transactions (mix of cash_sale + credit_sale)
 *   - vendor_transaction_items for each
 *   - vendor_credit_ledger entries for credit sales
 *
 * Safe to re-run: all inserts are guarded by findOne() checks.
 */

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const VENDORS = [
  {
    mobile: '9888000001', first: 'Raju', last: 'Seeds', name: 'Raju Seeds & Fertilizers',
    shopName: 'Raju Agri Centre', type: 'seeds_distributor',
    address: 'Main Road, Kothapally, Rangareddy',
  },
  {
    mobile: '9888000002', first: 'Krishna', last: 'Agro', name: 'Krishna Multipurpose Agro',
    shopName: 'Krishna Agro Store', type: 'multipurpose_dealer',
    address: 'Market Yard, Ibrahimpatnam, Rangareddy',
  },
];

const FARMER_MOBILES = ['9876543210', '9876543211', '9876543212', '9876543213', '9876543214'];

const CATALOG_ITEMS = [
  { itemId: 'IR-64-PADDY-SEED', packId: '5KG', mrp: 450, sell: 420, stock: 100 },
  { itemId: 'HD-2967-WHEAT-SEED', packId: '10KG', mrp: 600, sell: 550, stock: 80 },
  { itemId: 'DAP-FERTILIZER', packId: '50KG', mrp: 1350, sell: 1300, stock: 200 },
  { itemId: 'UREA-46N', packId: '45KG', mrp: 270, sell: 267, stock: 300 },
  { itemId: 'CHLORPYRIPHOS-20EC', packId: '1L', mrp: 320, sell: 295, stock: 50 },
  { itemId: 'NEEM-OIL-BIO', packId: '500ML', mrp: 180, sell: 160, stock: 40 },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const Q = queryInterface.sequelize.query.bind(queryInterface.sequelize);

    const findOrCreateUser = async (mobile, firstName, lastName) => {
      const formatted = mobile.startsWith('+91') ? mobile : `+91${mobile}`;
      const [[existing]] = await Q(`SELECT id FROM users WHERE mobile = ? LIMIT 1`, { replacements: [formatted] });
      if (existing) return existing.id;
      const hash = await bcrypt.hash('9001', 10);
      await Q(
        `INSERT INTO users (user_id, mobile, first_name, last_name, mpin_hash, is_mobile_verified, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, 1, ?, ?)`,
        { replacements: [uuidv4(), formatted, firstName, lastName, hash, now, now] }
      );
      const [[row]] = await Q(`SELECT id FROM users WHERE mobile = ? LIMIT 1`, { replacements: [formatted] });
      return row.id;
    };

    // Get farmer IDs
    const farmerIds = [];
    for (const m of FARMER_MOBILES) {
      const [[f]] = await Q(`SELECT id FROM users WHERE mobile IN (?, ?) LIMIT 1`, { replacements: [m, `+91${m}`] });
      if (f) farmerIds.push(f.id);
    }
    if (!farmerIds.length) {
      console.log('[vendor-seed] No farmers found — skipping');
      return;
    }

    // Get LGD block
    const [[lgd]] = await Q(`SELECT b.id as block_id, b.district_id, d.state_id FROM lgd_blocks b JOIN lgd_districts d ON b.district_id = d.id LIMIT 1`).catch(() => [[null]]);

    for (const v of VENDORS) {
      // Check if vendor already exists
      const [[existingV]] = await Q(`SELECT id FROM vendor_profiles WHERE shop_name = ? LIMIT 1`, { replacements: [v.shopName] });
      if (existingV) {
        console.log(`[vendor-seed] Vendor "${v.shopName}" already exists (id=${existingV.id}), skipping`);
        continue;
      }

      // Create vendor user
      const userId = await findOrCreateUser(v.mobile, v.first, v.last);

      // Create vendor profile
      await Q(
        `INSERT INTO vendor_profiles
           (vendor_user_id, vendor_uuid, vendor_code, vendor_type, vendor_name,
            shop_name, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        { replacements: [userId, uuidv4(), `VND-${v.mobile.slice(-4)}`, v.type, v.name, v.shopName, now, now] }
      );
      const [[vp]] = await Q(`SELECT id FROM vendor_profiles WHERE vendor_user_id = ? LIMIT 1`, { replacements: [userId] });
      const vendorId = vp.id;

      // Create shop
      await Q(
        `INSERT INTO vendor_shops
           (vendor_id, shop_uuid, shop_name, shop_address,
            lgd_state_id, lgd_district_id, lgd_block_id,
            is_physical_shop, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)`,
        { replacements: [vendorId, uuidv4(), v.shopName, v.address, lgd?.state_id || null, lgd?.district_id || null, lgd?.block_id || null, now, now] }
      );

      // Create KYC
      await Q(
        `INSERT INTO vendor_kyc (vendor_id, kyc_status, is_active, created_at, updated_at)
         VALUES (?, 'verified', 1, ?, ?)`,
        { replacements: [vendorId, now, now] }
      );

      // Create catalog items
      for (const item of CATALOG_ITEMS) {
        await Q(
          `INSERT INTO vendor_product_catalogs
             (vendor_id, input_item_id, input_pack_id, mrp_rupees,
              vendor_selling_price, stock_quantity, availability_status,
              is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 'in_stock', 1, ?, ?)`,
          { replacements: [vendorId, item.itemId, item.packId, item.mrp, item.sell, item.stock, now, now] }
        );
      }

      // Create transactions + items + farmer links
      const txData = [
        { farmerIdx: 0, type: 'cash_sale', itemIdx: 0, qty: 2, season: 'kharif', daysAgo: 5 },
        { farmerIdx: 1, type: 'credit_sale', itemIdx: 2, qty: 1, season: 'kharif', daysAgo: 10 },
        { farmerIdx: 2, type: 'cash_sale', itemIdx: 4, qty: 3, season: 'kharif', daysAgo: 3 },
        { farmerIdx: 0, type: 'cash_sale', itemIdx: 3, qty: 2, season: 'rabi', daysAgo: 15 },
      ];

      for (const tx of txData) {
        if (!farmerIds[tx.farmerIdx]) continue;
        const farmerId = farmerIds[tx.farmerIdx];
        const item = CATALOG_ITEMS[tx.itemIdx];
        const amount = item.sell * tx.qty;
        const txDate = new Date(now.getTime() - tx.daysAgo * 86400000).toISOString().slice(0, 10);

        // Transaction
        const txUuid = uuidv4();
        await Q(
          `INSERT INTO vendor_transactions
             (transaction_uuid, vendor_id, farmer_id, transaction_type,
              transaction_date, transaction_amount, transaction_status,
              payment_status, season, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 'completed', ?, ?, 1, ?, ?)`,
          {
            replacements: [
              txUuid, vendorId, farmerId, tx.type, txDate, amount,
              tx.type === 'credit_sale' ? 'credit_given' : 'paid',
              tx.season, now, now,
            ],
          }
        );
        const [[txRow]] = await Q(`SELECT id FROM vendor_transactions WHERE transaction_uuid = ? LIMIT 1`, { replacements: [txUuid] });

        // Transaction item
        await Q(
          `INSERT INTO vendor_transaction_items
             (transaction_id, input_item_id, input_pack_id, quantity,
              unit_price, line_total, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
          { replacements: [txRow.id, item.itemId, item.packId, tx.qty, item.sell, amount, now, now] }
        );

        // Farmer link (upsert)
        const [[existingLink]] = await Q(
          `SELECT id, transaction_count, total_value FROM vendor_farmer_links WHERE vendor_id = ? AND farmer_id = ? LIMIT 1`,
          { replacements: [vendorId, farmerId] }
        );
        if (existingLink) {
          await Q(
            `UPDATE vendor_farmer_links SET transaction_count = transaction_count + 1,
              total_value = total_value + ?, last_transaction_date = ?, updated_at = ?
             WHERE id = ?`,
            { replacements: [amount, txDate, now, existingLink.id] }
          );
        } else {
          await Q(
            `INSERT INTO vendor_farmer_links
               (vendor_id, farmer_id, link_type, last_transaction_date,
                transaction_count, total_value, is_active, created_at, updated_at)
             VALUES (?, ?, ?, ?, 1, ?, 1, ?, ?)`,
            { replacements: [vendorId, farmerId, tx.type === 'credit_sale' ? 'credit_customer' : 'regular_customer', txDate, amount, now, now] }
          );
        }

        // Credit ledger for credit sales
        if (tx.type === 'credit_sale') {
          const [[existingCredit]] = await Q(
            `SELECT id FROM vendor_credit_ledgers WHERE vendor_id = ? AND farmer_id = ? LIMIT 1`,
            { replacements: [vendorId, farmerId] }
          );
          if (existingCredit) {
            await Q(
              `UPDATE vendor_credit_ledgers SET current_balance = current_balance + ?,
                total_credit_given = total_credit_given + ?, updated_at = ?
               WHERE id = ?`,
              { replacements: [amount, amount, now, existingCredit.id] }
            );
          } else {
            await Q(
              `INSERT INTO vendor_credit_ledgers
                 (vendor_id, farmer_id, current_balance, credit_limit,
                  total_credit_given, total_payments_received,
                  is_active, created_at, updated_at)
               VALUES (?, ?, ?, 5000, ?, 0, 1, ?, ?)`,
              { replacements: [vendorId, farmerId, amount, amount, now, now] }
            );
          }
        }
      }

      console.log(`[vendor-seed] Vendor "${v.name}" (id=${vendorId}): 6 catalog items, ${txData.length} transactions`);
    }

    console.log(`[vendor-seed] Done. ${VENDORS.length} vendors seeded with catalog, transactions, and farmer links.`);
  },

  async down(queryInterface) {
    const Q = queryInterface.sequelize.query.bind(queryInterface.sequelize);
    for (const v of VENDORS) {
      const [[vp]] = await Q(`SELECT id FROM vendor_profiles WHERE shop_name = ? LIMIT 1`, { replacements: [v.shopName] }).catch(() => [[null]]);
      if (!vp) continue;
      await Q(`DELETE FROM vendor_transaction_items WHERE transaction_id IN (SELECT id FROM vendor_transactions WHERE vendor_id = ?)`, { replacements: [vp.id] }).catch(() => {});
      await Q(`DELETE FROM vendor_transactions WHERE vendor_id = ?`, { replacements: [vp.id] }).catch(() => {});
      await Q(`DELETE FROM vendor_credit_ledgers WHERE vendor_id = ?`, { replacements: [vp.id] }).catch(() => {});
      await Q(`DELETE FROM vendor_farmer_links WHERE vendor_id = ?`, { replacements: [vp.id] }).catch(() => {});
      await Q(`DELETE FROM vendor_product_catalogs WHERE vendor_id = ?`, { replacements: [vp.id] }).catch(() => {});
      await Q(`DELETE FROM vendor_kyc WHERE vendor_id = ?`, { replacements: [vp.id] }).catch(() => {});
      await Q(`DELETE FROM vendor_shops WHERE vendor_id = ?`, { replacements: [vp.id] }).catch(() => {});
      await Q(`DELETE FROM vendor_profiles WHERE id = ?`, { replacements: [vp.id] }).catch(() => {});
      await Q(`DELETE FROM users WHERE mobile = ?`, { replacements: [v.mobile] }).catch(() => {});
    }
  },
};
