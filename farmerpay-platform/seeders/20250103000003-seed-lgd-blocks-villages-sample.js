'use strict';

/**
 * Seeds sample blocks and villages for key districts.
 * In production, replace with full LGD dataset (~6000 blocks, ~600k villages).
 */
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    // Get district IDs
    const [districts] = await queryInterface.sequelize.query('SELECT id, district_code FROM lgd_districts');
    const districtMap = {};
    districts.forEach((d) => { districtMap[d.district_code] = d.id; });

    // Sample blocks for Lucknow (0902) and Pune (2701)
    const blocks = [
      // Lucknow blocks
      { block_code: '090201', district_code: '0902', block_name: 'Sarojini Nagar', latitude: 26.7922, longitude: 80.9462 },
      { block_code: '090202', district_code: '0902', block_name: 'Mohanlalganj', latitude: 26.7500, longitude: 80.9000 },
      { block_code: '090203', district_code: '0902', block_name: 'Malihabad', latitude: 26.9200, longitude: 80.7100 },
      { block_code: '090204', district_code: '0902', block_name: 'Bakshi Ka Talab', latitude: 26.9300, longitude: 80.9400 },
      // Pune blocks
      { block_code: '270101', district_code: '2701', block_name: 'Haveli', latitude: 18.5100, longitude: 73.8500 },
      { block_code: '270102', district_code: '2701', block_name: 'Mulshi', latitude: 18.5200, longitude: 73.5100 },
      { block_code: '270103', district_code: '2701', block_name: 'Baramati', latitude: 18.1500, longitude: 74.5800 },
      { block_code: '270104', district_code: '2701', block_name: 'Junnar', latitude: 19.2100, longitude: 73.8800 },
      // Mysuru blocks
      { block_code: '290201', district_code: '2902', block_name: 'Mysuru', latitude: 12.3051, longitude: 76.6551 },
      { block_code: '290202', district_code: '2902', block_name: 'Nanjangud', latitude: 12.1200, longitude: 76.6800 },
      { block_code: '290203', district_code: '2902', block_name: 'T. Narasipura', latitude: 12.2100, longitude: 76.9000 },
      // Thanjavur blocks
      { block_code: '330401', district_code: '3304', block_name: 'Thanjavur', latitude: 10.7900, longitude: 79.1400 },
      { block_code: '330402', district_code: '3304', block_name: 'Kumbakonam', latitude: 10.9600, longitude: 79.3900 },
      { block_code: '330403', district_code: '3304', block_name: 'Papanasam', latitude: 10.9300, longitude: 79.2700 },
    ];

    await queryInterface.bulkInsert('lgd_blocks',
      blocks.map((b) => ({
        block_code: b.block_code,
        district_id: districtMap[b.district_code],
        block_name: b.block_name,
        block_name_en: b.block_name,
        latitude: b.latitude,
        longitude: b.longitude,
        is_active: true,
        created_at: now,
        updated_at: now,
      }))
    );

    // Get block IDs for village seeding
    const [blocksDb] = await queryInterface.sequelize.query('SELECT id, block_code FROM lgd_blocks');
    const blockMap = {};
    blocksDb.forEach((b) => { blockMap[b.block_code] = b.id; });

    // Sample villages
    const villages = [
      // Sarojini Nagar block villages
      { village_code: '09020100001', block_code: '090201', village_name: 'Amausi', population: 15200, total_households: 3200, has_bank_branch: true, has_primary_school: true, has_secondary_school: true },
      { village_code: '09020100002', block_code: '090201', village_name: 'Banthra', population: 8500, total_households: 1800, has_bank_branch: false, has_primary_school: true, has_secondary_school: false },
      { village_code: '09020100003', block_code: '090201', village_name: 'Gudamba', population: 12000, total_households: 2500, has_bank_branch: true, has_primary_school: true, has_secondary_school: true },
      // Malihabad block villages
      { village_code: '09020300001', block_code: '090203', village_name: 'Malihabad', population: 22000, total_households: 4800, has_bank_branch: true, has_primary_school: true, has_secondary_school: true },
      { village_code: '09020300002', block_code: '090203', village_name: 'Kakori', population: 18000, total_households: 3900, has_bank_branch: true, has_primary_school: true, has_secondary_school: true },
      // Baramati block villages
      { village_code: '27010300001', block_code: '270103', village_name: 'Baramati', population: 56000, total_households: 12000, has_bank_branch: true, has_primary_school: true, has_secondary_school: true },
      { village_code: '27010300002', block_code: '270103', village_name: 'Supe', population: 8000, total_households: 1700, has_bank_branch: false, has_primary_school: true, has_secondary_school: false },
      { village_code: '27010300003', block_code: '270103', village_name: 'Morgaon', population: 14000, total_households: 3000, has_bank_branch: true, has_primary_school: true, has_secondary_school: true },
      // Nanjangud block villages
      { village_code: '29020200001', block_code: '290202', village_name: 'Nanjangud', population: 52000, total_households: 11000, has_bank_branch: true, has_primary_school: true, has_secondary_school: true },
      { village_code: '29020200002', block_code: '290202', village_name: 'Hullahalli', population: 6000, total_households: 1300, has_bank_branch: false, has_primary_school: true, has_secondary_school: false },
      // Kumbakonam block villages
      { village_code: '33040200001', block_code: '330402', village_name: 'Kumbakonam', population: 140000, total_households: 32000, has_bank_branch: true, has_primary_school: true, has_secondary_school: true },
      { village_code: '33040200002', block_code: '330402', village_name: 'Swamimalai', population: 18000, total_households: 4000, has_bank_branch: true, has_primary_school: true, has_secondary_school: true },
      { village_code: '33040200003', block_code: '330402', village_name: 'Thiruvidaimaruthur', population: 24000, total_households: 5200, has_bank_branch: true, has_primary_school: true, has_secondary_school: true },
    ];

    await queryInterface.bulkInsert('lgd_villages',
      villages.map((v) => ({
        village_code: v.village_code,
        block_id: blockMap[v.block_code],
        village_name: v.village_name,
        village_name_en: v.village_name,
        population: v.population,
        total_households: v.total_households,
        has_bank_branch: v.has_bank_branch,
        has_primary_school: v.has_primary_school,
        has_secondary_school: v.has_secondary_school,
        is_active: true,
        created_at: now,
        updated_at: now,
      }))
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('lgd_villages', null, {});
    await queryInterface.bulkDelete('lgd_blocks', null, {});
  },
};
