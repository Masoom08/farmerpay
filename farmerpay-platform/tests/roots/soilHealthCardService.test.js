/**
 * Unit Tests — Soil Health Card OCR Service
 *
 * Tests OCR parsing, validation, classification, save, and recommendations.
 */

const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };

jest.mock('../../src/shared/models', () => ({
  sequelize: { transaction: jest.fn().mockResolvedValue(mockTransaction) },
  Sequelize: { Op: require('sequelize').Op },
  SoilHealthRecord: { findOne: jest.fn(), create: jest.fn(), update: jest.fn(), findByPk: jest.fn() },
  Field: { findOne: jest.fn() },
  FarmRegister: {},
  User: { findOne: jest.fn() },
}));

jest.mock('../../src/shared/utils/logger', () => ({
  info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(),
}));

jest.mock('../../src/modules/roots/crop/services/varianceService', () => ({
  applySoilAdjustment: jest.fn((inputs) => inputs.map((i) => ({ ...i, _soil_adjusted: true, _soil_multiplier: 1.2 }))),
}));

const service = require('../../src/modules/roots/crop/services/soilHealthCardService');
const db = require('../../src/shared/models');

describe('soilHealthCardService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTransaction.commit.mockClear();
    mockTransaction.rollback.mockClear();
  });

  /* ════════════════════════════════════════════════════════════════
   * 1. processOcrResult
   * ════════════════════════════════════════════════════════════════ */

  describe('processOcrResult', () => {
    it('should extract all major parameters from OCR text', () => {
      const ocrText = `
        Soil Health Card
        Sample No: SHC/2026/12345
        Date of Testing: 15/03/2026
        Nitrogen (N) : 245 kg/ha
        Phosphorus (P) : 18 kg/ha
        Potassium (K) : 320 kg/ha
        pH : 6.8
        EC : 0.45 dS/m
        OC : 0.62 %
        Sulphur : 12 ppm
        Zinc : 0.8 ppm
        Iron : 4.5 ppm
        Manganese : 3.2 ppm
        Copper : 1.1 ppm
        Boron : 0.5 ppm
        Soil Type : Clay Loam
      `;

      const { extractedValues, confidenceScores } = service.processOcrResult(42, 10, ocrText, 'http://img.url');

      expect(extractedValues.nitrogen).toBe(245);
      expect(extractedValues.phosphorus).toBe(18);
      expect(extractedValues.potassium).toBe(320);
      expect(extractedValues.ph).toBe(6.8);
      expect(extractedValues.ec).toBe(0.45);
      expect(extractedValues.oc).toBe(0.62);
      expect(extractedValues.sulphur).toBe(12);
      expect(extractedValues.zinc).toBe(0.8);
      expect(extractedValues.iron).toBe(4.5);
      expect(extractedValues.manganese).toBe(3.2);
      expect(extractedValues.copper).toBe(1.1);
      expect(extractedValues.boron).toBe(0.5);
      expect(extractedValues.soilType).toContain('Clay');
      expect(extractedValues.cardId).toBe('SHC/2026/12345');
      expect(extractedValues.testDate).toBe('2026-03-15');

      // All in-range values should have high confidence
      expect(confidenceScores.nitrogen).toBe(0.9);
      expect(confidenceScores.ph).toBe(0.9);
    });

    it('should handle alternate label formats', () => {
      const ocrText = 'N: 200 kg/ha\nP2O5: 15\nK2O: 250\npH = 7.1\nOrganic Carbon: 0.5%';
      const { extractedValues } = service.processOcrResult(1, 1, ocrText, null);

      expect(extractedValues.nitrogen).toBe(200);
      expect(extractedValues.phosphorus).toBe(15);
      expect(extractedValues.potassium).toBe(250);
      expect(extractedValues.ph).toBe(7.1);
      expect(extractedValues.oc).toBe(0.5);
    });

    it('should return lower confidence for out-of-range values', () => {
      const ocrText = 'Nitrogen: 900 kg/ha'; // max plausible is 600
      const { confidenceScores } = service.processOcrResult(1, 1, ocrText, null);

      expect(confidenceScores.nitrogen).toBe(0.4);
    });

    it('should return empty for null/empty OCR text', () => {
      expect(service.processOcrResult(1, 1, null, null).extractedValues).toEqual({});
      expect(service.processOcrResult(1, 1, '', null).extractedValues).toEqual({});
    });

    it('should parse DD/MM/YYYY test date', () => {
      const ocrText = 'Date of Testing: 25/12/2025';
      const { extractedValues } = service.processOcrResult(1, 1, ocrText, null);
      expect(extractedValues.testDate).toBe('2025-12-25');
    });

    it('should parse YYYY-MM-DD test date', () => {
      const ocrText = 'Test Date: 2025-06-15';
      const { extractedValues } = service.processOcrResult(1, 1, ocrText, null);
      expect(extractedValues.testDate).toBe('2025-06-15');
    });
  });

  /* ════════════════════════════════════════════════════════════════
   * 2. validateExtractedValues
   * ════════════════════════════════════════════════════════════════ */

  describe('validateExtractedValues', () => {
    it('should pass valid values', () => {
      const result = service.validateExtractedValues({
        nitrogen: 250, phosphorus: 15, potassium: 200, ph: 6.8, oc: 0.6, ec: 0.5,
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should flag out-of-range nitrogen', () => {
      const result = service.validateExtractedValues({ nitrogen: 700 }); // max 600
      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('nitrogen');
    });

    it('should flag out-of-range pH', () => {
      const result = service.validateExtractedValues({ ph: 12 }); // max 10.5
      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('ph');
    });

    it('should warn on cross-field inconsistency: acidic pH + high K', () => {
      const result = service.validateExtractedValues({ ph: 4.0, potassium: 700 });
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should warn on low OC + high N inconsistency', () => {
      const result = service.validateExtractedValues({ oc: 0.1, nitrogen: 500 });
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should handle null input', () => {
      const result = service.validateExtractedValues(null);
      expect(result.isValid).toBe(false);
    });

    it('should skip missing fields (only validate present values)', () => {
      const result = service.validateExtractedValues({ nitrogen: 250 });
      expect(result.isValid).toBe(true);
    });
  });

  /* ════════════════════════════════════════════════════════════════
   * 3. classifyParameters
   * ════════════════════════════════════════════════════════════════ */

  describe('classifyParameters', () => {
    it('should classify all NPK and pH values', () => {
      const { classifications } = service.classifyParameters({
        nitrogen: 200, phosphorus: 8, potassium: 300, ph: 5.5, oc: 0.3,
      });

      expect(classifications.n_status).toBe('LOW');
      expect(classifications.p_status).toBe('LOW');
      expect(classifications.k_status).toBe('HIGH');
      expect(classifications.ph_status).toBe('ACIDIC');
      expect(classifications.oc_status).toBe('LOW');
    });

    it('should classify medium values', () => {
      const { classifications } = service.classifyParameters({
        nitrogen: 350, phosphorus: 18, potassium: 200, ph: 7.0, oc: 0.6,
      });

      expect(classifications.n_status).toBe('MEDIUM');
      expect(classifications.p_status).toBe('MEDIUM');
      expect(classifications.k_status).toBe('MEDIUM');
      expect(classifications.ph_status).toBe('NEUTRAL');
      expect(classifications.oc_status).toBe('MEDIUM');
    });

    it('should classify high values', () => {
      const { classifications } = service.classifyParameters({
        nitrogen: 550, phosphorus: 30, potassium: 300, ph: 8.0, oc: 1.0,
      });

      expect(classifications.n_status).toBe('HIGH');
      expect(classifications.p_status).toBe('HIGH');
      expect(classifications.k_status).toBe('HIGH');
      expect(classifications.ph_status).toBe('ALKALINE');
      expect(classifications.oc_status).toBe('HIGH');
    });

    it('should handle null input', () => {
      expect(service.classifyParameters(null).classifications).toEqual({});
    });

    it('should only classify provided parameters', () => {
      const { classifications } = service.classifyParameters({ nitrogen: 250 });
      expect(classifications.n_status).toBe('MEDIUM');
      expect(classifications.p_status).toBeUndefined();
    });
  });

  /* ════════════════════════════════════════════════════════════════
   * 4. saveSoilHealthRecord
   * ════════════════════════════════════════════════════════════════ */

  describe('saveSoilHealthRecord', () => {
    beforeEach(() => {
      db.Field.findOne.mockResolvedValue({ id: 10, farm_register_id: 1 });
      db.SoilHealthRecord.update.mockResolvedValue([1]);
      db.SoilHealthRecord.create.mockResolvedValue({
        id: 1, field_id: 10, test_date: '2026-03-15', valid_until: '2029-03-15',
        card_id: 'SHC-001', image_url: 'http://img.url', source: 'photo_ocr',
        nitrogen_kg_per_hectare: 245, phosphorus_kg_per_hectare: 18,
        potassium_kg_per_hectare: 320, ph: 6.8, ec_ds_per_m: 0.45,
        organic_carbon_percent: 0.62, sulphur_ppm: 12, zinc_ppm: 0.8,
        iron_ppm: 5, manganese_ppm: 3.2, copper_ppm: 1.1, boron_ppm: 1,
        soil_type: 'Clay Loam', confidence_scores: {}, test_lab_name: null,
        created_at: new Date(),
      });
    });

    it('should deactivate previous records and create new one', async () => {
      const extracted = { nitrogen: 245, phosphorus: 18, potassium: 320, ph: 6.8, testDate: '2026-03-15' };
      const result = await service.saveSoilHealthRecord(42, 10, extracted, {}, 'http://img.url', {});

      expect(db.SoilHealthRecord.update).toHaveBeenCalledWith(
        { is_active: false },
        expect.objectContaining({ where: { field_id: 10, is_active: true } })
      );
      expect(db.SoilHealthRecord.create).toHaveBeenCalledTimes(1);
      expect(result.recordId).toBe(1);
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should compute valid_until as test_date + 3 years', async () => {
      const extracted = { testDate: '2026-01-15' };
      await service.saveSoilHealthRecord(42, 10, extracted, {}, null, {});

      const createCall = db.SoilHealthRecord.create.mock.calls[0][0];
      expect(createCall.valid_until).toBe('2029-01-15');
    });

    it('should set source to photo_ocr when imageUrl provided', async () => {
      await service.saveSoilHealthRecord(42, 10, {}, {}, 'http://img.url', {});

      const createCall = db.SoilHealthRecord.create.mock.calls[0][0];
      expect(createCall.source).toBe('photo_ocr');
    });

    it('should set source to manual_entry when no imageUrl', async () => {
      await service.saveSoilHealthRecord(42, 10, {}, {}, null, {});

      const createCall = db.SoilHealthRecord.create.mock.calls[0][0];
      expect(createCall.source).toBe('manual_entry');
    });

    it('should throw 404 when field not found', async () => {
      db.Field.findOne.mockResolvedValue(null);

      await expect(
        service.saveSoilHealthRecord(42, 999, {}, {}, null, {})
      ).rejects.toThrow('Field not found');
    });

    it('should rollback on error', async () => {
      db.SoilHealthRecord.create.mockRejectedValue(new Error('DB error'));

      await expect(
        service.saveSoilHealthRecord(42, 10, {}, {}, null, {})
      ).rejects.toThrow('DB error');
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  /* ════════════════════════════════════════════════════════════════
   * 5. getSoilAdjustedRecommendations
   * ════════════════════════════════════════════════════════════════ */

  describe('getSoilAdjustedRecommendations', () => {
    it('should return adjustments when soil record exists', async () => {
      db.SoilHealthRecord.findOne.mockResolvedValue({
        nitrogen_kg_per_hectare: 200, ph: 6.5,
      });

      const inputs = [{ input_item_id: 'urea-001', input_quantity: 100, inputItem: { item_name: 'Urea' } }];
      const result = await service.getSoilAdjustedRecommendations(10, inputs);

      expect(result.adjusted).toBe(true);
      expect(result.adjustments.length).toBeGreaterThan(0);
    });

    it('should return unadjusted when no soil record', async () => {
      db.SoilHealthRecord.findOne.mockResolvedValue(null);

      const inputs = [{ input_item_id: 'urea-001', input_quantity: 100 }];
      const result = await service.getSoilAdjustedRecommendations(10, inputs);

      expect(result.adjusted).toBe(false);
      expect(result.adjustedInputs).toEqual(inputs);
    });
  });

  /* ════════════════════════════════════════════════════════════════
   * 6. getSoilHealthForField
   * ════════════════════════════════════════════════════════════════ */

  describe('getSoilHealthForField', () => {
    it('should return record with classifications', async () => {
      db.Field.findOne.mockResolvedValue({ id: 10 });
      db.SoilHealthRecord.findOne.mockResolvedValue({
        id: 1, field_id: 10, test_date: '2026-03-15', valid_until: '2029-03-15',
        nitrogen_kg_per_hectare: 200, phosphorus_kg_per_hectare: 8, potassium_kg_per_hectare: 150,
        ph: '6.2', organic_carbon_percent: '0.4', ec_ds_per_m: '0.3',
        sulphur_ppm: 10, boron_ppm: 1, iron_ppm: 5, zinc_ppm: '0.5',
        manganese_ppm: '2.0', copper_ppm: '1.0', card_id: null,
        image_url: null, source: 'manual_entry', soil_type: null,
        test_lab_name: null, confidence_scores: null, created_at: new Date(),
      });

      const result = await service.getSoilHealthForField(42, 10);

      expect(result.recordId).toBe(1);
      expect(result.classifications.n_status).toBe('LOW');
      expect(result.classifications.ph_status).toBe('ACIDIC');
    });

    it('should return null when no record exists', async () => {
      db.Field.findOne.mockResolvedValue({ id: 10 });
      db.SoilHealthRecord.findOne.mockResolvedValue(null);

      const result = await service.getSoilHealthForField(42, 10);
      expect(result).toBeNull();
    });

    it('should throw 404 when field not found', async () => {
      db.Field.findOne.mockResolvedValue(null);

      await expect(service.getSoilHealthForField(42, 999)).rejects.toThrow('Field not found');
    });
  });

  /* ════════════════════════════════════════════════════════════════
   * 7. verifyAndUpdate
   * ════════════════════════════════════════════════════════════════ */

  describe('verifyAndUpdate', () => {
    it('should update corrected fields', async () => {
      const mockRecord = {
        id: 1, is_active: true, source: 'photo_ocr',
        nitrogen_kg_per_hectare: 245, phosphorus_kg_per_hectare: 18,
        potassium_kg_per_hectare: 320, ph: '6.8', organic_carbon_percent: '0.62',
        field_id: 10, test_date: '2026-03-15', valid_until: '2029-03-15',
        ec_ds_per_m: null, sulphur_ppm: null, zinc_ppm: null, iron_ppm: null,
        manganese_ppm: null, copper_ppm: null, boron_ppm: null, card_id: null,
        image_url: null, soil_type: null, test_lab_name: null, confidence_scores: null,
        created_at: new Date(),
        update: jest.fn().mockResolvedValue(true),
      };
      db.SoilHealthRecord.findByPk.mockResolvedValue(mockRecord);

      const result = await service.verifyAndUpdate(42, 1, { nitrogen: 260, ph: 7.0 });

      expect(mockRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          nitrogen_kg_per_hectare: 260,
          ph: 7.0,
          source: 'photo_plus_manual',
        })
      );
      expect(result.recordId).toBe(1);
    });

    it('should throw 404 for missing record', async () => {
      db.SoilHealthRecord.findByPk.mockResolvedValue(null);

      await expect(service.verifyAndUpdate(42, 999, {})).rejects.toThrow('Record not found');
    });
  });
});
