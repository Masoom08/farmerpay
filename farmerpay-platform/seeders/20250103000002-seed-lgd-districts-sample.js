'use strict';

/**
 * Seeds sample districts for key agricultural states.
 * In production, this would be replaced with the full LGD dataset (~770 districts).
 */
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    // Get state IDs
    const [states] = await queryInterface.sequelize.query('SELECT id, state_code FROM lgd_states');
    const stateMap = {};
    states.forEach((s) => { stateMap[s.state_code] = s.id; });

    const districts = [
      // Uttar Pradesh (09) — Top agriculture state
      { district_code: '0901', state_code: '09', district_name: 'Agra', latitude: 27.1767, longitude: 78.0081 },
      { district_code: '0902', state_code: '09', district_name: 'Lucknow', latitude: 26.8467, longitude: 80.9462 },
      { district_code: '0903', state_code: '09', district_name: 'Varanasi', latitude: 25.3176, longitude: 82.9739 },
      { district_code: '0904', state_code: '09', district_name: 'Prayagraj', latitude: 25.4358, longitude: 81.8463 },
      { district_code: '0905', state_code: '09', district_name: 'Kanpur Nagar', latitude: 26.4499, longitude: 80.3319 },

      // Maharashtra (27)
      { district_code: '2701', state_code: '27', district_name: 'Pune', latitude: 18.5204, longitude: 73.8567 },
      { district_code: '2702', state_code: '27', district_name: 'Nashik', latitude: 19.9975, longitude: 73.7898 },
      { district_code: '2703', state_code: '27', district_name: 'Nagpur', latitude: 21.1458, longitude: 79.0882 },
      { district_code: '2704', state_code: '27', district_name: 'Kolhapur', latitude: 16.7050, longitude: 74.2433 },

      // Karnataka (29)
      { district_code: '2901', state_code: '29', district_name: 'Bengaluru Urban', latitude: 12.9716, longitude: 77.5946 },
      { district_code: '2902', state_code: '29', district_name: 'Mysuru', latitude: 12.2958, longitude: 76.6394 },
      { district_code: '2903', state_code: '29', district_name: 'Belagavi', latitude: 15.8497, longitude: 74.4977 },
      { district_code: '2904', state_code: '29', district_name: 'Dharwad', latitude: 15.4589, longitude: 75.0078 },

      // Tamil Nadu (33)
      { district_code: '3301', state_code: '33', district_name: 'Chennai', latitude: 13.0827, longitude: 80.2707 },
      { district_code: '3302', state_code: '33', district_name: 'Coimbatore', latitude: 11.0168, longitude: 76.9558 },
      { district_code: '3303', state_code: '33', district_name: 'Madurai', latitude: 9.9252, longitude: 78.1198 },
      { district_code: '3304', state_code: '33', district_name: 'Thanjavur', latitude: 10.7870, longitude: 79.1378 },

      // Madhya Pradesh (23)
      { district_code: '2301', state_code: '23', district_name: 'Bhopal', latitude: 23.2599, longitude: 77.4126 },
      { district_code: '2302', state_code: '23', district_name: 'Indore', latitude: 22.7196, longitude: 75.8577 },
      { district_code: '2303', state_code: '23', district_name: 'Jabalpur', latitude: 23.1815, longitude: 79.9864 },

      // Punjab (03)
      { district_code: '0301', state_code: '03', district_name: 'Ludhiana', latitude: 30.9010, longitude: 75.8573 },
      { district_code: '0302', state_code: '03', district_name: 'Amritsar', latitude: 31.6340, longitude: 74.8723 },
      { district_code: '0303', state_code: '03', district_name: 'Patiala', latitude: 30.3398, longitude: 76.3869 },

      // Rajasthan (08)
      { district_code: '0801', state_code: '08', district_name: 'Jaipur', latitude: 26.9124, longitude: 75.7873 },
      { district_code: '0802', state_code: '08', district_name: 'Jodhpur', latitude: 26.2389, longitude: 73.0243 },

      // Bihar (10)
      { district_code: '1001', state_code: '10', district_name: 'Patna', latitude: 25.6093, longitude: 85.1376 },
      { district_code: '1002', state_code: '10', district_name: 'Muzaffarpur', latitude: 26.1209, longitude: 85.3647 },

      // Telangana (36)
      { district_code: '3601', state_code: '36', district_name: 'Hyderabad', latitude: 17.3850, longitude: 78.4867 },
      { district_code: '3602', state_code: '36', district_name: 'Warangal', latitude: 17.9784, longitude: 79.5941 },

      // Andhra Pradesh (37)
      { district_code: '3701', state_code: '37', district_name: 'Visakhapatnam', latitude: 17.6868, longitude: 83.2185 },
      { district_code: '3702', state_code: '37', district_name: 'Guntur', latitude: 16.3067, longitude: 80.4365 },

      // Gujarat (24)
      { district_code: '2401', state_code: '24', district_name: 'Ahmedabad', latitude: 23.0225, longitude: 72.5714 },
      { district_code: '2402', state_code: '24', district_name: 'Rajkot', latitude: 22.3039, longitude: 70.8022 },
    ];

    await queryInterface.bulkInsert('lgd_districts',
      districts.map((d) => ({
        district_code: d.district_code,
        state_id: stateMap[d.state_code],
        district_name: d.district_name,
        district_name_en: d.district_name,
        latitude: d.latitude,
        longitude: d.longitude,
        is_active: true,
        created_at: now,
        updated_at: now,
      }))
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('lgd_districts', null, {});
  },
};
