'use strict';

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert('languages', [
      { language_code: 'en', language_name: 'English', native_name: 'English', iso_639_1: 'en', is_supported: true, is_rtl: false, is_active: true, created_at: now, updated_at: now },
      { language_code: 'hi', language_name: 'Hindi', native_name: 'हिन्दी', iso_639_1: 'hi', is_supported: true, is_rtl: false, is_active: true, created_at: now, updated_at: now },
      { language_code: 'mr', language_name: 'Marathi', native_name: 'मराठी', iso_639_1: 'mr', is_supported: true, is_rtl: false, is_active: true, created_at: now, updated_at: now },
      { language_code: 'ta', language_name: 'Tamil', native_name: 'தமிழ்', iso_639_1: 'ta', is_supported: true, is_rtl: false, is_active: true, created_at: now, updated_at: now },
      { language_code: 'te', language_name: 'Telugu', native_name: 'తెలుగు', iso_639_1: 'te', is_supported: true, is_rtl: false, is_active: true, created_at: now, updated_at: now },
      { language_code: 'bn', language_name: 'Bengali', native_name: 'বাংলা', iso_639_1: 'bn', is_supported: true, is_rtl: false, is_active: true, created_at: now, updated_at: now },
      { language_code: 'gu', language_name: 'Gujarati', native_name: 'ગુજરાતી', iso_639_1: 'gu', is_supported: true, is_rtl: false, is_active: true, created_at: now, updated_at: now },
      { language_code: 'kn', language_name: 'Kannada', native_name: 'ಕನ್ನಡ', iso_639_1: 'kn', is_supported: true, is_rtl: false, is_active: true, created_at: now, updated_at: now },
      { language_code: 'pa', language_name: 'Punjabi', native_name: 'ਪੰਜਾਬੀ', iso_639_1: 'pa', is_supported: true, is_rtl: false, is_active: true, created_at: now, updated_at: now },
      { language_code: 'or', language_name: 'Odia', native_name: 'ଓଡ଼ିଆ', iso_639_1: 'or', is_supported: true, is_rtl: false, is_active: true, created_at: now, updated_at: now },
      { language_code: 'ml', language_name: 'Malayalam', native_name: 'മലയാളം', iso_639_1: 'ml', is_supported: true, is_rtl: false, is_active: true, created_at: now, updated_at: now },
    ]);
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete('languages', null, {});
  },
};
