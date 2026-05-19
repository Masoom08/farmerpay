/**
 * Test Factories
 * Creates fixture data for integration tests.
 */

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

let db;
const getDb = () => {
  if (!db) db = require('../../src/shared/models');
  return db;
};

/**
 * Creates a test user and returns the user record + JWT token.
 */
const createTestUser = async (overrides = {}) => {
  const { User } = getDb();

  const userId = uuidv4();
  const hashedPassword = await bcrypt.hash('Test@12345', 10);

  const user = await User.create({
    user_id: userId,
    mobile: overrides.mobile || `9${Math.floor(100000000 + Math.random() * 900000000)}`,
    password_hash: hashedPassword,
    first_name: overrides.firstName || 'Test',
    last_name: overrides.lastName || 'Farmer',
    email: overrides.email || `test-${Date.now()}@farmerpay.test`,
    is_active: true,
    ...overrides,
  });

  const token = jwt.sign(
    { id: userId, role: overrides.role || 'FARMER' },
    process.env.JWT_SECRET || 'test-jwt-secret-key-farmerpay-2025',
    { expiresIn: '1h' }
  );

  const refreshToken = jwt.sign(
    { id: userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret-key-farmerpay-2025',
    { expiresIn: '7d' }
  );

  return { user, token, refreshToken, userId };
};

/**
 * Creates a test admin user.
 */
const createTestAdmin = async (overrides = {}) => {
  return createTestUser({ role: 'ADMIN', firstName: 'Admin', ...overrides });
};

/**
 * Creates a test bank user.
 */
const createTestBankUser = async (overrides = {}) => {
  return createTestUser({ role: 'BANK_USER', firstName: 'Bank', lastName: 'Officer', ...overrides });
};

/**
 * Creates a test field agent with profile.
 */
const createTestAgent = async (overrides = {}) => {
  const { FieldAgentProfile } = getDb();

  const { user, token, userId } = await createTestUser({
    role: 'FIELD_AGENT',
    firstName: 'Agent',
    ...overrides,
  });

  const agentProfile = await FieldAgentProfile.create({
    agent_user_id: user.id,
    agent_code: `AGT-${Date.now()}`,
    field_agent_name: `${user.first_name} ${user.last_name}`,
    is_active: true,
  });

  return { user, token, userId, agentProfile };
};

/**
 * Creates a farmer profile for an existing user.
 */
const createFarmerProfile = async (userId) => {
  const { FarmerProfile } = getDb();

  return FarmerProfile.create({
    profile_uuid: uuidv4(),
    farmer_id: userId,
    first_name: 'Test',
    last_name: 'Farmer',
    date_of_birth: '1990-01-01',
    gender: 'male',
    is_active: true,
  });
};

/**
 * Creates a test loan product.
 */
const createTestLoanProduct = async () => {
  const { LoanProvider, LoanProviderType, LoanCategory, LoanSubcategory, LoanProduct } = getDb();

  const providerType = await LoanProviderType.create({
    type_code: `TYPE-${Date.now()}`,
    type_name: 'Commercial Bank',
    is_active: true,
  });

  const provider = await LoanProvider.create({
    provider_code: `PROV-${Date.now()}`,
    provider_name: 'Test Bank',
    provider_type_id: providerType.id,
    is_active: true,
  });

  const category = await LoanCategory.create({
    category_code: `CAT-${Date.now()}`,
    category_name: 'Crop Loan',
    is_active: true,
  });

  const subcategory = await LoanSubcategory.create({
    subcategory_code: `SUB-${Date.now()}`,
    subcategory_name: 'Kharif Crop',
    category_id: category.id,
    is_active: true,
  });

  const product = await LoanProduct.create({
    product_code: `PROD-${Date.now()}`,
    product_name: 'Test Crop Loan',
    provider_id: provider.id,
    category_id: category.id,
    subcategory_id: subcategory.id,
    min_amount: 10000,
    max_amount: 500000,
    interest_rate: 7.0,
    tenure_months: 12,
    is_active: true,
  });

  return { provider, category, subcategory, product };
};

/**
 * Creates a test loan application.
 */
const createTestLoanApplication = async (farmerId, productId) => {
  const { LoanApplication } = getDb();

  return LoanApplication.create({
    application_uuid: uuidv4(),
    farmer_id: farmerId,
    loan_product_id: productId,
    requested_amount: 100000,
    purpose: 'Kharif crop cultivation',
    is_active: true,
  });
};

/**
 * Creates a test trust section with questions.
 */
const createTestTrustSection = async () => {
  const { TrustSection, TrustQuestion, TrustQuestionChoice } = getDb();

  const section = await TrustSection.create({
    section_code: `SEC-${Date.now()}`,
    section_name: 'Basic Information',
    section_order: 1,
    max_score: 100,
    is_active: true,
  });

  const question = await TrustQuestion.create({
    section_id: section.id,
    question_code: `Q-${Date.now()}`,
    question_text: 'Do you own land?',
    question_type: 'single_choice',
    max_score: 50,
    question_order: 1,
    is_active: true,
  });

  const choice1 = await TrustQuestionChoice.create({
    question_id: question.id,
    choice_text: 'Yes',
    choice_score: 50,
    choice_order: 1,
    is_active: true,
  });

  const choice2 = await TrustQuestionChoice.create({
    question_id: question.id,
    choice_text: 'No',
    choice_score: 10,
    choice_order: 2,
    is_active: true,
  });

  return { section, question, choices: [choice1, choice2] };
};

/**
 * Creates test pulse commodities and mandis.
 */
const createTestMarketData = async () => {
  const { PulseCommodity, PulseMandi } = getDb();

  const commodity = await PulseCommodity.create({
    commodity_id: uuidv4(),
    commodity_code: `COMM-${Date.now()}`,
    commodity_name: 'Wheat',
    commodity_type: 'food_grain',
    unit_of_measurement: 'quintal',
    is_active: true,
  });

  const mandi = await PulseMandi.create({
    mandi_code: `MANDI-${Date.now()}`,
    mandi_name: 'Azadpur Mandi',
    mandi_latitude: 28.7041,
    mandi_longitude: 77.1025,
    is_active: true,
  });

  return { commodity, mandi };
};

module.exports = {
  createTestUser,
  createTestAdmin,
  createTestBankUser,
  createTestAgent,
  createFarmerProfile,
  createTestLoanProduct,
  createTestLoanApplication,
  createTestTrustSection,
  createTestMarketData,
};
