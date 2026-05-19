'use strict';

/**
 * Seeds all 28 states and 8 union territories of India with official LGD codes.
 */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const states = [
      // States
      { state_code: '01', state_name: 'Jammu and Kashmir', state_name_en: 'Jammu and Kashmir', state_abbreviation: 'JK', region: 'North', is_union_territory: true, gst_code: '01', latitude: 33.7782, longitude: 76.5762 },
      { state_code: '02', state_name: 'Himachal Pradesh', state_name_en: 'Himachal Pradesh', state_abbreviation: 'HP', region: 'North', is_union_territory: false, gst_code: '02', latitude: 31.1048, longitude: 77.1734 },
      { state_code: '03', state_name: 'Punjab', state_name_en: 'Punjab', state_abbreviation: 'PB', region: 'North', is_union_territory: false, gst_code: '03', latitude: 31.1471, longitude: 75.3412 },
      { state_code: '04', state_name: 'Chandigarh', state_name_en: 'Chandigarh', state_abbreviation: 'CH', region: 'North', is_union_territory: true, gst_code: '04', latitude: 30.7333, longitude: 76.7794 },
      { state_code: '05', state_name: 'Uttarakhand', state_name_en: 'Uttarakhand', state_abbreviation: 'UK', region: 'North', is_union_territory: false, gst_code: '05', latitude: 30.0668, longitude: 79.0193 },
      { state_code: '06', state_name: 'Haryana', state_name_en: 'Haryana', state_abbreviation: 'HR', region: 'North', is_union_territory: false, gst_code: '06', latitude: 29.0588, longitude: 76.0856 },
      { state_code: '07', state_name: 'Delhi', state_name_en: 'Delhi', state_abbreviation: 'DL', region: 'North', is_union_territory: true, gst_code: '07', latitude: 28.7041, longitude: 77.1025 },
      { state_code: '08', state_name: 'Rajasthan', state_name_en: 'Rajasthan', state_abbreviation: 'RJ', region: 'West', is_union_territory: false, gst_code: '08', latitude: 27.0238, longitude: 74.2179 },
      { state_code: '09', state_name: 'Uttar Pradesh', state_name_en: 'Uttar Pradesh', state_abbreviation: 'UP', region: 'North', is_union_territory: false, gst_code: '09', latitude: 26.8467, longitude: 80.9462 },
      { state_code: '10', state_name: 'Bihar', state_name_en: 'Bihar', state_abbreviation: 'BR', region: 'East', is_union_territory: false, gst_code: '10', latitude: 25.0961, longitude: 85.3131 },
      { state_code: '11', state_name: 'Sikkim', state_name_en: 'Sikkim', state_abbreviation: 'SK', region: 'Northeast', is_union_territory: false, gst_code: '11', latitude: 27.5330, longitude: 88.5122 },
      { state_code: '12', state_name: 'Arunachal Pradesh', state_name_en: 'Arunachal Pradesh', state_abbreviation: 'AR', region: 'Northeast', is_union_territory: false, gst_code: '12', latitude: 28.2180, longitude: 94.7278 },
      { state_code: '13', state_name: 'Nagaland', state_name_en: 'Nagaland', state_abbreviation: 'NL', region: 'Northeast', is_union_territory: false, gst_code: '13', latitude: 26.1584, longitude: 94.5624 },
      { state_code: '14', state_name: 'Manipur', state_name_en: 'Manipur', state_abbreviation: 'MN', region: 'Northeast', is_union_territory: false, gst_code: '14', latitude: 24.6637, longitude: 93.9063 },
      { state_code: '15', state_name: 'Mizoram', state_name_en: 'Mizoram', state_abbreviation: 'MZ', region: 'Northeast', is_union_territory: false, gst_code: '15', latitude: 23.1645, longitude: 92.9376 },
      { state_code: '16', state_name: 'Tripura', state_name_en: 'Tripura', state_abbreviation: 'TR', region: 'Northeast', is_union_territory: false, gst_code: '16', latitude: 23.9408, longitude: 91.9882 },
      { state_code: '17', state_name: 'Meghalaya', state_name_en: 'Meghalaya', state_abbreviation: 'ML', region: 'Northeast', is_union_territory: false, gst_code: '17', latitude: 25.4670, longitude: 91.3662 },
      { state_code: '18', state_name: 'Assam', state_name_en: 'Assam', state_abbreviation: 'AS', region: 'Northeast', is_union_territory: false, gst_code: '18', latitude: 26.2006, longitude: 92.9376 },
      { state_code: '19', state_name: 'West Bengal', state_name_en: 'West Bengal', state_abbreviation: 'WB', region: 'East', is_union_territory: false, gst_code: '19', latitude: 22.9868, longitude: 87.8550 },
      { state_code: '20', state_name: 'Jharkhand', state_name_en: 'Jharkhand', state_abbreviation: 'JH', region: 'East', is_union_territory: false, gst_code: '20', latitude: 23.6102, longitude: 85.2799 },
      { state_code: '21', state_name: 'Odisha', state_name_en: 'Odisha', state_abbreviation: 'OR', region: 'East', is_union_territory: false, gst_code: '21', latitude: 20.9517, longitude: 85.0985 },
      { state_code: '22', state_name: 'Chhattisgarh', state_name_en: 'Chhattisgarh', state_abbreviation: 'CG', region: 'Central', is_union_territory: false, gst_code: '22', latitude: 21.2787, longitude: 81.8661 },
      { state_code: '23', state_name: 'Madhya Pradesh', state_name_en: 'Madhya Pradesh', state_abbreviation: 'MP', region: 'Central', is_union_territory: false, gst_code: '23', latitude: 22.9734, longitude: 78.6569 },
      { state_code: '24', state_name: 'Gujarat', state_name_en: 'Gujarat', state_abbreviation: 'GJ', region: 'West', is_union_territory: false, gst_code: '24', latitude: 22.2587, longitude: 71.1924 },
      { state_code: '27', state_name: 'Maharashtra', state_name_en: 'Maharashtra', state_abbreviation: 'MH', region: 'West', is_union_territory: false, gst_code: '27', latitude: 19.7515, longitude: 75.7139 },
      { state_code: '29', state_name: 'Karnataka', state_name_en: 'Karnataka', state_abbreviation: 'KA', region: 'South', is_union_territory: false, gst_code: '29', latitude: 15.3173, longitude: 75.7139 },
      { state_code: '30', state_name: 'Goa', state_name_en: 'Goa', state_abbreviation: 'GA', region: 'West', is_union_territory: false, gst_code: '30', latitude: 15.2993, longitude: 74.1240 },
      { state_code: '32', state_name: 'Kerala', state_name_en: 'Kerala', state_abbreviation: 'KL', region: 'South', is_union_territory: false, gst_code: '32', latitude: 10.8505, longitude: 76.2711 },
      { state_code: '33', state_name: 'Tamil Nadu', state_name_en: 'Tamil Nadu', state_abbreviation: 'TN', region: 'South', is_union_territory: false, gst_code: '33', latitude: 11.1271, longitude: 78.6569 },
      { state_code: '34', state_name: 'Puducherry', state_name_en: 'Puducherry', state_abbreviation: 'PY', region: 'South', is_union_territory: true, gst_code: '34', latitude: 11.9416, longitude: 79.8083 },
      { state_code: '36', state_name: 'Telangana', state_name_en: 'Telangana', state_abbreviation: 'TS', region: 'South', is_union_territory: false, gst_code: '36', latitude: 18.1124, longitude: 79.0193 },
      { state_code: '37', state_name: 'Andhra Pradesh', state_name_en: 'Andhra Pradesh', state_abbreviation: 'AP', region: 'South', is_union_territory: false, gst_code: '37', latitude: 15.9129, longitude: 79.7400 },
      { state_code: '35', state_name: 'Andaman and Nicobar Islands', state_name_en: 'Andaman and Nicobar Islands', state_abbreviation: 'AN', region: 'South', is_union_territory: true, gst_code: '35', latitude: 11.7401, longitude: 92.6586 },
      { state_code: '25', state_name: 'Dadra and Nagar Haveli and Daman and Diu', state_name_en: 'Dadra and Nagar Haveli and Daman and Diu', state_abbreviation: 'DD', region: 'West', is_union_territory: true, gst_code: '26', latitude: 20.1809, longitude: 73.0169 },
      { state_code: '31', state_name: 'Lakshadweep', state_name_en: 'Lakshadweep', state_abbreviation: 'LD', region: 'South', is_union_territory: true, gst_code: '31', latitude: 10.5667, longitude: 72.6417 },
      { state_code: '38', state_name: 'Ladakh', state_name_en: 'Ladakh', state_abbreviation: 'LA', region: 'North', is_union_territory: true, gst_code: '38', latitude: 34.1526, longitude: 77.5771 },
    ];

    await queryInterface.bulkInsert('lgd_states',
      states.map((s) => ({ ...s, is_active: true, created_at: now, updated_at: now }))
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('lgd_states', null, {});
  },
};
