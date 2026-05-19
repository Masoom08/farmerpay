/**
 * SathiTask — model structure tests.
 */

const Sequelize = require('sequelize');
const DataTypes = Sequelize.DataTypes;

const sequelize = new Sequelize({ dialect: 'mysql', host: 'localhost', database: 'test', username: 'test', password: 'test', logging: false });

const SathiTask = require('../../../src/modules/trust/models/SathiTask')(sequelize, DataTypes);

describe('SathiTask', () => {
  const attrs = SathiTask.getAttributes();

  test('table name is sathi_tasks', () => {
    expect(SathiTask.getTableName()).toBe('sathi_tasks');
  });

  test('has task_uuid (unique, required)', () => {
    expect(attrs.task_uuid).toBeDefined();
    expect(attrs.task_uuid.allowNull).toBe(false);
    expect(attrs.task_uuid.unique).toBe(true);
  });

  test('has farmer_id FK (required)', () => {
    expect(attrs.farmer_id).toBeDefined();
    expect(attrs.farmer_id.allowNull).toBe(false);
  });

  test('has sathi_id FK (nullable — unassigned tasks)', () => {
    expect(attrs.sathi_id).toBeDefined();
    expect(attrs.sathi_id.allowNull).toBe(true);
  });

  test('has task_type ENUM', () => {
    const type = attrs.task_type.type;
    const values = type.values || type.options?.values;
    expect(values).toEqual(expect.arrayContaining([
      'COLLECT_HOUSEHOLD', 'VERIFY_LAND', 'UPLOAD_INSURANCE', 'PHOTO_GEOTAG', 'FARMER_REQUESTED',
    ]));
  });

  test('has reason_code ENUM', () => {
    const type = attrs.reason_code.type;
    const values = type.values || type.options?.values;
    expect(values).toEqual(expect.arrayContaining([
      'HOUSEHOLD_REFRESH', 'LAND_EXPIRES', 'INSURANCE_MISSING', 'PHOTO_GEOTAG_NEEDED', 'FARMER_REQUESTED',
    ]));
  });

  test('has status ENUM with default OPEN', () => {
    expect(attrs.status).toBeDefined();
    expect(attrs.status.defaultValue).toBe('OPEN');
    const type = attrs.status.type;
    const values = type.values || type.options?.values;
    expect(values).toEqual(['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED']);
  });

  test('has due_by (nullable date)', () => {
    expect(attrs.due_by).toBeDefined();
    expect(attrs.due_by.allowNull).toBe(true);
  });

  test('has village and crop (nullable strings)', () => {
    expect(attrs.village).toBeDefined();
    expect(attrs.crop).toBeDefined();
  });

  test('has payload JSON (nullable)', () => {
    expect(attrs.payload).toBeDefined();
    expect(attrs.payload.allowNull).toBe(true);
  });

  test('has requested_by ENUM with default BANKER', () => {
    expect(attrs.requested_by).toBeDefined();
    expect(attrs.requested_by.defaultValue).toBe('BANKER');
    const type = attrs.requested_by.type;
    const values = type.values || type.options?.values;
    expect(values).toEqual(['BANKER', 'FARMER', 'SYSTEM']);
  });

  test('uses timestamps (created_at + updated_at)', () => {
    expect(SathiTask.options.timestamps).toBe(true);
    expect(SathiTask.options.underscored).toBe(true);
  });

  test('has sathi agent index', () => {
    const indexes = SathiTask.options.indexes;
    const agentIdx = indexes.find(i => i.name === 'idx_sathi_tasks_agent');
    expect(agentIdx).toBeDefined();
    expect(agentIdx.fields).toEqual(['sathi_id', 'status', 'due_by']);
  });

  test('has farmer status index', () => {
    const indexes = SathiTask.options.indexes;
    const farmerIdx = indexes.find(i => i.name === 'idx_sathi_tasks_farmer');
    expect(farmerIdx).toBeDefined();
    expect(farmerIdx.fields).toEqual(['farmer_id', 'status']);
  });
});
