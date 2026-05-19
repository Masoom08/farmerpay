/**
 * Sequelize Instance & Model Loader
 * Creates the Sequelize connection and registers all shared models.
 */

const { Sequelize } = require('sequelize');
const config = require('../../config');
const logger = require('../utils/logger');

const env = config.env || 'development';
const dbConfig = require('../../config/database')[env];

// Create Sequelize instance
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging || false,
    pool: dbConfig.pool,
    define: dbConfig.define,
    dialectOptions: dbConfig.dialectOptions,
    timezone: dbConfig.timezone,
  }
);

// Import shared models (original Phase 1)
const AuditLog = require('./audit.model')(sequelize, Sequelize.DataTypes);
const Notification = require('./notification.model')(sequelize, Sequelize.DataTypes);
const Media = require('./media.model')(sequelize, Sequelize.DataTypes);
const Document = require('./document.model')(sequelize, Sequelize.DataTypes);

// Import shared platform models (Phase 1 complete)
const Language = require('./Language')(sequelize, Sequelize.DataTypes);
const LanguageTranslation = require('./LanguageTranslation')(sequelize, Sequelize.DataTypes);
const DocumentV2 = require('./DocumentV2')(sequelize, Sequelize.DataTypes);
const DocumentTranslation = require('./DocumentTranslation')(sequelize, Sequelize.DataTypes);
const DocumentAccessLog = require('./DocumentAccessLog')(sequelize, Sequelize.DataTypes);
const DocumentApproval = require('./DocumentApproval')(sequelize, Sequelize.DataTypes);
const DocumentVersion = require('./DocumentVersion')(sequelize, Sequelize.DataTypes);
const MediaAsset = require('./MediaAsset')(sequelize, Sequelize.DataTypes);
const MediaTag = require('./MediaTag')(sequelize, Sequelize.DataTypes);
const MediaAccessLog = require('./MediaAccessLog')(sequelize, Sequelize.DataTypes);
const MediaProcessingJob = require('./MediaProcessingJob')(sequelize, Sequelize.DataTypes);
const MediaTranslation = require('./MediaTranslation')(sequelize, Sequelize.DataTypes);
const MediaRendition = require('./MediaRendition')(sequelize, Sequelize.DataTypes);
const AuditLogV2 = require('./AuditLogV2')(sequelize, Sequelize.DataTypes);
const AuditTrail = require('./AuditTrail')(sequelize, Sequelize.DataTypes);
const AuditExportLog = require('./AuditExportLog')(sequelize, Sequelize.DataTypes);
const NotificationTemplate = require('./NotificationTemplate')(sequelize, Sequelize.DataTypes);
const NotificationTemplateTranslation = require('./NotificationTemplateTranslation')(sequelize, Sequelize.DataTypes);
const NotificationV2 = require('./NotificationV2')(sequelize, Sequelize.DataTypes);

// Import auth module models
const User = require('../../modules/auth/models/User')(sequelize, Sequelize.DataTypes);
const Role = require('../../modules/auth/models/Role')(sequelize, Sequelize.DataTypes);
const Permission = require('../../modules/auth/models/Permission')(sequelize, Sequelize.DataTypes);
const UserRole = require('../../modules/auth/models/UserRole')(sequelize, Sequelize.DataTypes);
const UserPermission = require('../../modules/auth/models/UserPermission')(sequelize, Sequelize.DataTypes);
const RolePermission = require('../../modules/auth/models/RolePermission')(sequelize, Sequelize.DataTypes);
const UserSession = require('../../modules/auth/models/UserSession')(sequelize, Sequelize.DataTypes);
const OtpRequest = require('../../modules/auth/models/OtpRequest')(sequelize, Sequelize.DataTypes);
const AadhaarVerification = require('../../modules/auth/models/AadhaarVerification')(sequelize, Sequelize.DataTypes);

// Import location module models
const LgdState = require('../../modules/location/models/LgdState')(sequelize, Sequelize.DataTypes);
const LgdStateTranslation = require('../../modules/location/models/LgdStateTranslation')(sequelize, Sequelize.DataTypes);
const LgdDistrict = require('../../modules/location/models/LgdDistrict')(sequelize, Sequelize.DataTypes);
const LgdDistrictTranslation = require('../../modules/location/models/LgdDistrictTranslation')(sequelize, Sequelize.DataTypes);
const LgdBlock = require('../../modules/location/models/LgdBlock')(sequelize, Sequelize.DataTypes);
const LgdBlockTranslation = require('../../modules/location/models/LgdBlockTranslation')(sequelize, Sequelize.DataTypes);
const LgdVillage = require('../../modules/location/models/LgdVillage')(sequelize, Sequelize.DataTypes);
const LgdVillageTranslation = require('../../modules/location/models/LgdVillageTranslation')(sequelize, Sequelize.DataTypes);
const LgdPanchayat = require('../../modules/location/models/LgdPanchayat')(sequelize, Sequelize.DataTypes);
const LgdPanchayatTranslation = require('../../modules/location/models/LgdPanchayatTranslation')(sequelize, Sequelize.DataTypes);
const LgdVillagePanchayatMap = require('../../modules/location/models/LgdVillagePanchayatMap')(sequelize, Sequelize.DataTypes);
const PacsRegistry = require('../../modules/location/models/PacsRegistry')(sequelize, Sequelize.DataTypes);

// Import trust module models
const TrustSection = require('../../modules/trust/models/TrustSection')(sequelize, Sequelize.DataTypes);
const TrustQuestion = require('../../modules/trust/models/TrustQuestion')(sequelize, Sequelize.DataTypes);
const TrustQuestionChoice = require('../../modules/trust/models/TrustQuestionChoice')(sequelize, Sequelize.DataTypes);
const TrustQuestionCondition = require('../../modules/trust/models/TrustQuestionCondition')(sequelize, Sequelize.DataTypes);
const TrustTextInputScoringRange = require('../../modules/trust/models/TrustTextInputScoringRange')(sequelize, Sequelize.DataTypes);
const TrustResponse = require('../../modules/trust/models/TrustResponse')(sequelize, Sequelize.DataTypes);
const TrustResponseChoice = require('../../modules/trust/models/TrustResponseChoice')(sequelize, Sequelize.DataTypes);
const TrustResponseNumeric = require('../../modules/trust/models/TrustResponseNumeric')(sequelize, Sequelize.DataTypes);
const TrustSectionProgress = require('../../modules/trust/models/TrustSectionProgress')(sequelize, Sequelize.DataTypes);
const TrustScoreCalculation = require('../../modules/trust/models/TrustScoreCalculation')(sequelize, Sequelize.DataTypes);
const TrustScoreHistory = require('../../modules/trust/models/TrustScoreHistory')(sequelize, Sequelize.DataTypes);
const TrustQuestionVersionHistory = require('../../modules/trust/models/TrustQuestionVersionHistory')(sequelize, Sequelize.DataTypes);
const TrustScoreAppeal = require('../../modules/trust/models/TrustScoreAppeal')(sequelize, Sequelize.DataTypes);
// TRUST v2 models
const TrustEvidence = require('../../modules/trust/models/TrustEvidence')(sequelize, Sequelize.DataTypes);
const TrustAuditEvent = require('../../modules/trust/models/TrustAuditEvent')(sequelize, Sequelize.DataTypes);
const TrustDecision = require('../../modules/trust/models/TrustDecision')(sequelize, Sequelize.DataTypes);
const SathiTask = require('../../modules/trust/models/SathiTask')(sequelize, Sequelize.DataTypes);

// Import DICE module models
const LoanProviderType = require('../../modules/dice/models/LoanProviderType')(sequelize, Sequelize.DataTypes);
const LoanProvider = require('../../modules/dice/models/LoanProvider')(sequelize, Sequelize.DataTypes);
const LoanCategory = require('../../modules/dice/models/LoanCategory')(sequelize, Sequelize.DataTypes);
const LoanSubcategory = require('../../modules/dice/models/LoanSubcategory')(sequelize, Sequelize.DataTypes);
const LoanProduct = require('../../modules/dice/models/LoanProduct')(sequelize, Sequelize.DataTypes);
const ScaleOfFinance = require('../../modules/dice/models/ScaleOfFinance')(sequelize, Sequelize.DataTypes);
const UnitEconomics = require('../../modules/dice/models/UnitEconomics')(sequelize, Sequelize.DataTypes);
const LoanProductEligibilityRule = require('../../modules/dice/models/LoanProductEligibilityRule')(sequelize, Sequelize.DataTypes);
const LoanApplication = require('../../modules/dice/models/LoanApplication')(sequelize, Sequelize.DataTypes);
const LoanApplicationStatus = require('../../modules/dice/models/LoanApplicationStatus')(sequelize, Sequelize.DataTypes);
const LoanApplicationStatusHistory = require('../../modules/dice/models/LoanApplicationStatusHistory')(sequelize, Sequelize.DataTypes);
const LoanApplicationDocument = require('../../modules/dice/models/LoanApplicationDocument')(sequelize, Sequelize.DataTypes);
const LoanApplicationBankNote = require('../../modules/dice/models/LoanApplicationBankNote')(sequelize, Sequelize.DataTypes);
const LoanDisbursement = require('../../modules/dice/models/LoanDisbursement')(sequelize, Sequelize.DataTypes);
const LoanRepaymentSchedule = require('../../modules/dice/models/LoanRepaymentSchedule')(sequelize, Sequelize.DataTypes);
const LoanRepayment = require('../../modules/dice/models/LoanRepayment')(sequelize, Sequelize.DataTypes);
const FarmerLoanBookmark = require('../../modules/dice/models/FarmerLoanBookmark')(sequelize, Sequelize.DataTypes);
const LoanIntegrationLog = require('../../modules/dice/models/LoanIntegrationLog')(sequelize, Sequelize.DataTypes);
const LoanInsuranceBundled = require('../../modules/dice/models/LoanInsuranceBundled')(sequelize, Sequelize.DataTypes);

// Import DICE post-harvest extension models (PULSE x DICE integration)
const DiceWarehouseRegistry = require('../../modules/dice/models/DiceWarehouseRegistry')(sequelize, Sequelize.DataTypes);
const DicePostharvestTopupLoan = require('../../modules/dice/models/DicePostharvestTopupLoan')(sequelize, Sequelize.DataTypes);
const DiceProduceHypothecationLog = require('../../modules/dice/models/DiceProduceHypothecationLog')(sequelize, Sequelize.DataTypes);
const DicePriceRealisationSnapshot = require('../../modules/dice/models/DicePriceRealisationSnapshot')(sequelize, Sequelize.DataTypes);

// Import ROOTS crop module models
const Organization = require('../../modules/roots/crop/models/Organization')(sequelize, Sequelize.DataTypes);
const Trait = require('../../modules/roots/crop/models/Trait')(sequelize, Sequelize.DataTypes);
const SoilType = require('../../modules/roots/crop/models/SoilType')(sequelize, Sequelize.DataTypes);
const SoilTypeTranslation = require('../../modules/roots/crop/models/SoilTypeTranslation')(sequelize, Sequelize.DataTypes);
const ClimateZone = require('../../modules/roots/crop/models/ClimateZone')(sequelize, Sequelize.DataTypes);
const AgroClimaticZoneMapping = require('../../modules/roots/crop/models/AgroClimaticZoneMapping')(sequelize, Sequelize.DataTypes);
const CropMaster = require('../../modules/roots/crop/models/CropMaster')(sequelize, Sequelize.DataTypes);
const CropTranslation = require('../../modules/roots/crop/models/CropTranslation')(sequelize, Sequelize.DataTypes);
const CropSeason = require('../../modules/roots/crop/models/CropSeason')(sequelize, Sequelize.DataTypes);
const CropEstablishmentMethod = require('../../modules/roots/crop/models/CropEstablishmentMethod')(sequelize, Sequelize.DataTypes);
const VarietyMaster = require('../../modules/roots/crop/models/VarietyMaster')(sequelize, Sequelize.DataTypes);
const VarietyTraitAssignment = require('../../modules/roots/crop/models/VarietyTraitAssignment')(sequelize, Sequelize.DataTypes);
const VarietySoilCompatibility = require('../../modules/roots/crop/models/VarietySoilCompatibility')(sequelize, Sequelize.DataTypes);
const VarietyRegionalSuitability = require('../../modules/roots/crop/models/VarietyRegionalSuitability')(sequelize, Sequelize.DataTypes);
const InputUnit = require('../../modules/roots/crop/models/InputUnit')(sequelize, Sequelize.DataTypes);
const InputCategory = require('../../modules/roots/crop/models/InputCategory')(sequelize, Sequelize.DataTypes);
const InputItem = require('../../modules/roots/crop/models/InputItem')(sequelize, Sequelize.DataTypes);
const InputTranslation = require('../../modules/roots/crop/models/InputTranslation')(sequelize, Sequelize.DataTypes);
const InputPack = require('../../modules/roots/crop/models/InputPack')(sequelize, Sequelize.DataTypes);
const InputPackPrice = require('../../modules/roots/crop/models/InputPackPrice')(sequelize, Sequelize.DataTypes);
const PackageOfPractice = require('../../modules/roots/crop/models/PackageOfPractice')(sequelize, Sequelize.DataTypes);
const PopWorkband = require('../../modules/roots/crop/models/PopWorkband')(sequelize, Sequelize.DataTypes);
const PopTask = require('../../modules/roots/crop/models/PopTask')(sequelize, Sequelize.DataTypes);
const PopTaskInput = require('../../modules/roots/crop/models/PopTaskInput')(sequelize, Sequelize.DataTypes);
const PopCostBenchmark = require('../../modules/roots/crop/models/PopCostBenchmark')(sequelize, Sequelize.DataTypes);
const PopWorkbandTrigger = require('../../modules/roots/crop/models/PopWorkbandTrigger')(sequelize, Sequelize.DataTypes);
const PopWorkbandPestSusceptibility = require('../../modules/roots/crop/models/PopWorkbandPestSusceptibility')(sequelize, Sequelize.DataTypes);

// Import ROOTS crop execution models
const FarmRegister = require('../../modules/roots/crop/models/execution/FarmRegister')(sequelize, Sequelize.DataTypes);
const Field = require('../../modules/roots/crop/models/execution/Field')(sequelize, Sequelize.DataTypes);
const FieldSoilDetail = require('../../modules/roots/crop/models/execution/FieldSoilDetail')(sequelize, Sequelize.DataTypes);
const FieldOwnershipStatus = require('../../modules/roots/crop/models/execution/FieldOwnershipStatus')(sequelize, Sequelize.DataTypes);
const FieldLandDocumentAssociation = require('../../modules/roots/crop/models/execution/FieldLandDocumentAssociation')(sequelize, Sequelize.DataTypes);
const CultivationCycle = require('../../modules/roots/crop/models/execution/CultivationCycle')(sequelize, Sequelize.DataTypes);
const CultivationCycleLoanLinkage = require('../../modules/roots/crop/models/execution/CultivationCycleLoanLinkage')(sequelize, Sequelize.DataTypes);
const CultivationCyclePlanning = require('../../modules/roots/crop/models/execution/CultivationCyclePlanning')(sequelize, Sequelize.DataTypes);
const WorkbandExecution = require('../../modules/roots/crop/models/execution/WorkbandExecution')(sequelize, Sequelize.DataTypes);
const TaskExecution = require('../../modules/roots/crop/models/execution/TaskExecution')(sequelize, Sequelize.DataTypes);
const TaskExecutionWeatherNote = require('../../modules/roots/crop/models/execution/TaskExecutionWeatherNote')(sequelize, Sequelize.DataTypes);
const TaskExecutionInputLog = require('../../modules/roots/crop/models/execution/TaskExecutionInputLog')(sequelize, Sequelize.DataTypes);
const TaskExecutionLaborLog = require('../../modules/roots/crop/models/execution/TaskExecutionLaborLog')(sequelize, Sequelize.DataTypes);
const TaskExecutionMachineryLog = require('../../modules/roots/crop/models/execution/TaskExecutionMachineryLog')(sequelize, Sequelize.DataTypes);
const TaskExecutionPhoto = require('../../modules/roots/crop/models/execution/TaskExecutionPhoto')(sequelize, Sequelize.DataTypes);
const TaskExecutionExpense = require('../../modules/roots/crop/models/execution/TaskExecutionExpense')(sequelize, Sequelize.DataTypes);
const CultivationCycleExpenseSummary = require('../../modules/roots/crop/models/execution/CultivationCycleExpenseSummary')(sequelize, Sequelize.DataTypes);
const HarvestRecord = require('../../modules/roots/crop/models/execution/HarvestRecord')(sequelize, Sequelize.DataTypes);
const HarvestSaleRecord = require('../../modules/roots/crop/models/execution/HarvestSaleRecord')(sequelize, Sequelize.DataTypes);
const CultivationCycleIncomeSummary = require('../../modules/roots/crop/models/execution/CultivationCycleIncomeSummary')(sequelize, Sequelize.DataTypes);
const CultivationCycleProfitability = require('../../modules/roots/crop/models/execution/CultivationCycleProfitability')(sequelize, Sequelize.DataTypes);
const CultivationCycleHistory = require('../../modules/roots/crop/models/execution/CultivationCycleHistory')(sequelize, Sequelize.DataTypes);
const CultivationCycleInsuranceLinkage = require('../../modules/roots/crop/models/execution/CultivationCycleInsuranceLinkage')(sequelize, Sequelize.DataTypes);
const CultivationCycleHealthMonitoring = require('../../modules/roots/crop/models/execution/CultivationCycleHealthMonitoring')(sequelize, Sequelize.DataTypes);
const SoilHealthRecord = require('../../modules/roots/crop/models/execution/SoilHealthRecord')(sequelize, Sequelize.DataTypes);
const WaterManagementRecord = require('../../modules/roots/crop/models/execution/WaterManagementRecord')(sequelize, Sequelize.DataTypes);
const IntercropRecord = require('../../modules/roots/crop/models/execution/IntercropRecord')(sequelize, Sequelize.DataTypes);
const LivestockIntegrationRecord = require('../../modules/roots/crop/models/execution/LivestockIntegrationRecord')(sequelize, Sequelize.DataTypes);
const FarmerInterventionLog = require('../../modules/roots/crop/models/execution/FarmerInterventionLog')(sequelize, Sequelize.DataTypes);
const CultivationCycleBenchmarking = require('../../modules/roots/crop/models/execution/CultivationCycleBenchmarking')(sequelize, Sequelize.DataTypes);
const PopComplianceSnapshot = require('../../modules/roots/crop/models/execution/PopComplianceSnapshot')(sequelize, Sequelize.DataTypes);
const RootsComplianceSnapshot = require('../../modules/roots/crop/models/RootsComplianceSnapshot')(sequelize, Sequelize.DataTypes);
const RootsRedFlag = require('../../modules/roots/crop/models/RootsRedFlag')(sequelize, Sequelize.DataTypes);
const RootsLoanUtilizationTracking = require('../../modules/roots/crop/models/RootsLoanUtilizationTracking')(sequelize, Sequelize.DataTypes);

// Import SAGE module models
const SageAdvisoryType = require('../../modules/sage/models/SageAdvisoryType')(sequelize, Sequelize.DataTypes);
const SageAdvisory = require('../../modules/sage/models/SageAdvisory')(sequelize, Sequelize.DataTypes);
const SageWeatherEvent = require('../../modules/sage/models/SageWeatherEvent')(sequelize, Sequelize.DataTypes);
const SageCropHealthObservation = require('../../modules/sage/models/SageCropHealthObservation')(sequelize, Sequelize.DataTypes);
const SageFarmerInteraction = require('../../modules/sage/models/SageFarmerInteraction')(sequelize, Sequelize.DataTypes);
const SageFeedback = require('../../modules/sage/models/SageFeedback')(sequelize, Sequelize.DataTypes);
const SageAlert = require('../../modules/sage/models/SageAlert')(sequelize, Sequelize.DataTypes);
const WeatherObservation = require('../../modules/sage/models/WeatherObservation')(sequelize, Sequelize.DataTypes);
const RegionalPestAlert = require('../../modules/sage/models/RegionalPestAlert')(sequelize, Sequelize.DataTypes);
const GoogleFieldObservation = require('../../modules/sage/models/GoogleFieldObservation')(sequelize, Sequelize.DataTypes);

// Import PULSE module models
const PulseMandi = require('../../modules/pulse/models/PulseMandi')(sequelize, Sequelize.DataTypes);
const PulseCommodity = require('../../modules/pulse/models/PulseCommodity')(sequelize, Sequelize.DataTypes);
const PulseCommodityTranslation = require('../../modules/pulse/models/PulseCommodityTranslation')(sequelize, Sequelize.DataTypes);
const PulsePriceRecord = require('../../modules/pulse/models/PulsePriceRecord')(sequelize, Sequelize.DataTypes);
const PulsePriceForecast = require('../../modules/pulse/models/PulsePriceForecast')(sequelize, Sequelize.DataTypes);
const PulseMsp = require('../../modules/pulse/models/PulseMsp')(sequelize, Sequelize.DataTypes);
const PulseMarketAlert = require('../../modules/pulse/models/PulseMarketAlert')(sequelize, Sequelize.DataTypes);
const PulseFarmerPriceAlert = require('../../modules/pulse/models/PulseFarmerPriceAlert')(sequelize, Sequelize.DataTypes);
const PulseSellRecommendation = require('../../modules/pulse/models/PulseSellRecommendation')(sequelize, Sequelize.DataTypes);

// Import Insurance Enrollment model (standalone insurance — PMFBY, livestock, aquaculture, etc.)
const InsuranceEnrollment = require('../../modules/dice/models/InsuranceEnrollment')(sequelize, Sequelize.DataTypes);

// Import Insurance Phase 2 POS models (catalog + referral funnel)
const InsuranceProduct = require('../../modules/insurance/models/InsuranceProduct')(sequelize, Sequelize.DataTypes);
const InsurancePosReferral = require('../../modules/insurance/models/InsurancePosReferral')(sequelize, Sequelize.DataTypes);

// Import ROOTS Dairy module models
const DairyHerdRegister = require('../../modules/roots/dairy/models/DairyHerdRegister')(sequelize, Sequelize.DataTypes);
const DairyAnimal = require('../../modules/roots/dairy/models/DairyAnimal')(sequelize, Sequelize.DataTypes);
const DairyAnimalHealthRecord = require('../../modules/roots/dairy/models/DairyAnimalHealthRecord')(sequelize, Sequelize.DataTypes);
const DairyBreedingRecord = require('../../modules/roots/dairy/models/DairyBreedingRecord')(sequelize, Sequelize.DataTypes);
const DairyMilkProductionLog = require('../../modules/roots/dairy/models/DairyMilkProductionLog')(sequelize, Sequelize.DataTypes);
const DairyFeedUsageLog = require('../../modules/roots/dairy/models/DairyFeedUsageLog')(sequelize, Sequelize.DataTypes);
const DairyExpenseSummary = require('../../modules/roots/dairy/models/DairyExpenseSummary')(sequelize, Sequelize.DataTypes);
const DairyIncomeSummary = require('../../modules/roots/dairy/models/DairyIncomeSummary')(sequelize, Sequelize.DataTypes);
const DairyProfitabilitySummary = require('../../modules/roots/dairy/models/DairyProfitabilitySummary')(sequelize, Sequelize.DataTypes);
const DairyQualityMetric = require('../../modules/roots/dairy/models/DairyQualityMetric')(sequelize, Sequelize.DataTypes);
const DairyMarketLinkage = require('../../modules/roots/dairy/models/DairyMarketLinkage')(sequelize, Sequelize.DataTypes);
const DairyInsuranceLinkage = require('../../modules/roots/dairy/models/DairyInsuranceLinkage')(sequelize, Sequelize.DataTypes);
const DairyLinkedLoanUtilization = require('../../modules/roots/dairy/models/DairyLinkedLoanUtilization')(sequelize, Sequelize.DataTypes);

// Import ROOTS Dairy v2 — financial logbook models (hybrid allocation, tiered UX, no-AI manual entry)
const FarmerDairyProfile = require('../../modules/roots/dairy/models/FarmerDairyProfile')(sequelize, Sequelize.DataTypes);
const DairyCostEvent = require('../../modules/roots/dairy/models/DairyCostEvent')(sequelize, Sequelize.DataTypes);
const DairyRevenueEvent = require('../../modules/roots/dairy/models/DairyRevenueEvent')(sequelize, Sequelize.DataTypes);
const DairyBreedingEvent = require('../../modules/roots/dairy/models/DairyBreedingEvent')(sequelize, Sequelize.DataTypes);
const DairyTreatmentEvent = require('../../modules/roots/dairy/models/DairyTreatmentEvent')(sequelize, Sequelize.DataTypes);
const DairyRecurringTemplate = require('../../modules/roots/dairy/models/DairyRecurringTemplate')(sequelize, Sequelize.DataTypes);
const DairyAnimalPhoto = require('../../modules/roots/dairy/models/DairyAnimalPhoto')(sequelize, Sequelize.DataTypes);
const DairyWeeklySummary = require('../../modules/roots/dairy/models/DairyWeeklySummary')(sequelize, Sequelize.DataTypes);
const DairyPopTemplate = require('../../modules/roots/dairy/models/DairyPopTemplate')(sequelize, Sequelize.DataTypes);
// ROOTS Poultry models
const PoultryFlock = require('../../modules/roots/poultry/models/PoultryFlock')(sequelize, Sequelize.DataTypes);
const PoultryDailyLog = require('../../modules/roots/poultry/models/PoultryDailyLog')(sequelize, Sequelize.DataTypes);
const PoultryHealthEvent = require('../../modules/roots/poultry/models/PoultryHealthEvent')(sequelize, Sequelize.DataTypes);
const PoultryCostEvent = require('../../modules/roots/poultry/models/PoultryCostEvent')(sequelize, Sequelize.DataTypes);
const PoultryRevenueEvent = require('../../modules/roots/poultry/models/PoultryRevenueEvent')(sequelize, Sequelize.DataTypes);
const PoultryBatchSummary = require('../../modules/roots/poultry/models/PoultryBatchSummary')(sequelize, Sequelize.DataTypes);
const PoultryPopTemplate = require('../../modules/roots/poultry/models/PoultryPopTemplate')(sequelize, Sequelize.DataTypes);
// ROOTS Goatery models
const GoatHerd = require('../../modules/roots/goatery/models/GoatHerd')(sequelize, Sequelize.DataTypes);
const GoatAnimal = require('../../modules/roots/goatery/models/GoatAnimal')(sequelize, Sequelize.DataTypes);
const GoatGrowthLog = require('../../modules/roots/goatery/models/GoatGrowthLog')(sequelize, Sequelize.DataTypes);
const GoatHealthEvent = require('../../modules/roots/goatery/models/GoatHealthEvent')(sequelize, Sequelize.DataTypes);
const GoatBreedingEvent = require('../../modules/roots/goatery/models/GoatBreedingEvent')(sequelize, Sequelize.DataTypes);
const GoatFeedLog = require('../../modules/roots/goatery/models/GoatFeedLog')(sequelize, Sequelize.DataTypes);
const GoatCostEvent = require('../../modules/roots/goatery/models/GoatCostEvent')(sequelize, Sequelize.DataTypes);
const GoatRevenueEvent = require('../../modules/roots/goatery/models/GoatRevenueEvent')(sequelize, Sequelize.DataTypes);
const GoatPopTemplate = require('../../modules/roots/goatery/models/GoatPopTemplate')(sequelize, Sequelize.DataTypes);

// Import ROOTS Fishery module models
const FisheryPondRegister = require('../../modules/roots/fishery/models/FisheryPondRegister')(sequelize, Sequelize.DataTypes);
const FisheryPond = require('../../modules/roots/fishery/models/FisheryPond')(sequelize, Sequelize.DataTypes);
const FisherySpeciesStocked = require('../../modules/roots/fishery/models/FisherySpeciesStocked')(sequelize, Sequelize.DataTypes);
const FisheryFeedingLog = require('../../modules/roots/fishery/models/FisheryFeedingLog')(sequelize, Sequelize.DataTypes);
const FisheryWaterQualityLog = require('../../modules/roots/fishery/models/FisheryWaterQualityLog')(sequelize, Sequelize.DataTypes);
const FisheryHealthMonitoring = require('../../modules/roots/fishery/models/FisheryHealthMonitoring')(sequelize, Sequelize.DataTypes);
const FisheryHarvestRecord = require('../../modules/roots/fishery/models/FisheryHarvestRecord')(sequelize, Sequelize.DataTypes);
const FisherySaleRecord = require('../../modules/roots/fishery/models/FisherySaleRecord')(sequelize, Sequelize.DataTypes);
const FisheryExpenseSummary = require('../../modules/roots/fishery/models/FisheryExpenseSummary')(sequelize, Sequelize.DataTypes);
const FisheryIncomeSummary = require('../../modules/roots/fishery/models/FisheryIncomeSummary')(sequelize, Sequelize.DataTypes);

// ROOTS Fishery v2 models (logbook / event-sourcing)
const FarmerFisheryProfile = require('../../modules/roots/fishery/models/FarmerFisheryProfile')(sequelize, Sequelize.DataTypes);
const FisheryVessel = require('../../modules/roots/fishery/models/FisheryVessel')(sequelize, Sequelize.DataTypes);
const FisheryCostEvent = require('../../modules/roots/fishery/models/FisheryCostEvent')(sequelize, Sequelize.DataTypes);
const FisheryRevenueEvent = require('../../modules/roots/fishery/models/FisheryRevenueEvent')(sequelize, Sequelize.DataTypes);
const FisheryStockingEventV2 = require('../../modules/roots/fishery/models/FisheryStockingEventV2')(sequelize, Sequelize.DataTypes);
const FisheryHarvestEventV2 = require('../../modules/roots/fishery/models/FisheryHarvestEventV2')(sequelize, Sequelize.DataTypes);
const FisheryTripEvent = require('../../modules/roots/fishery/models/FisheryTripEvent')(sequelize, Sequelize.DataTypes);
const FisheryTreatmentEventV2 = require('../../modules/roots/fishery/models/FisheryTreatmentEventV2')(sequelize, Sequelize.DataTypes);
const FisheryRecurringTemplate = require('../../modules/roots/fishery/models/FisheryRecurringTemplate')(sequelize, Sequelize.DataTypes);
const FisheryWeeklySummary = require('../../modules/roots/fishery/models/FisheryWeeklySummary')(sequelize, Sequelize.DataTypes);

// Import ROOTS Horticulture module models
const HorticultureOrchard = require('../../modules/roots/horticulture/models/HorticultureOrchard')(sequelize, Sequelize.DataTypes);
const HorticulturePlanting = require('../../modules/roots/horticulture/models/HorticulturePlanting')(sequelize, Sequelize.DataTypes);
const HorticultureHarvest = require('../../modules/roots/horticulture/models/HorticultureHarvest')(sequelize, Sequelize.DataTypes);
const HorticultureHealthRecord = require('../../modules/roots/horticulture/models/HorticultureHealthRecord')(sequelize, Sequelize.DataTypes);
const HorticultureInputLog = require('../../modules/roots/horticulture/models/HorticultureInputLog')(sequelize, Sequelize.DataTypes);
const HorticultureIrrigationLog = require('../../modules/roots/horticulture/models/HorticultureIrrigationLog')(sequelize, Sequelize.DataTypes);
const HorticultureExpenseSummary = require('../../modules/roots/horticulture/models/HorticultureExpenseSummary')(sequelize, Sequelize.DataTypes);
const HorticultureIncomeSummary = require('../../modules/roots/horticulture/models/HorticultureIncomeSummary')(sequelize, Sequelize.DataTypes);

// Import SENTINEL module models
const LoanHealthSnapshot = require('../../modules/sentinel/models/LoanHealthSnapshot')(sequelize, Sequelize.DataTypes);
const SmaClassificationLog = require('../../modules/sentinel/models/SmaClassificationLog')(sequelize, Sequelize.DataTypes);
const BulletMaturityTracker = require('../../modules/sentinel/models/BulletMaturityTracker')(sequelize, Sequelize.DataTypes);
const RepaymentBehaviorIndex = require('../../modules/sentinel/models/RepaymentBehaviorIndex')(sequelize, Sequelize.DataTypes);
const VendorRegistry = require('../../modules/sentinel/models/VendorRegistry')(sequelize, Sequelize.DataTypes);
const ExpenseClassification = require('../../modules/sentinel/models/ExpenseClassification')(sequelize, Sequelize.DataTypes);
const EndUseScoreLog = require('../../modules/sentinel/models/EndUseScoreLog')(sequelize, Sequelize.DataTypes);
const DiversionRiskAssessment = require('../../modules/sentinel/models/DiversionRiskAssessment')(sequelize, Sequelize.DataTypes);
const RedFlagEvent = require('../../modules/sentinel/models/RedFlagEvent')(sequelize, Sequelize.DataTypes);
const FarmerIncomeStream = require('../../modules/sentinel/models/FarmerIncomeStream')(sequelize, Sequelize.DataTypes);
const CashFlowProjection = require('../../modules/sentinel/models/CashFlowProjection')(sequelize, Sequelize.DataTypes);
const RssScoreHistory = require('../../modules/sentinel/models/RssScoreHistory')(sequelize, Sequelize.DataTypes);
const EwsSignal = require('../../modules/sentinel/models/EwsSignal')(sequelize, Sequelize.DataTypes);
const EwsAlert = require('../../modules/sentinel/models/EwsAlert')(sequelize, Sequelize.DataTypes);
const BranchActionQueue = require('../../modules/sentinel/models/BranchActionQueue')(sequelize, Sequelize.DataTypes);
const ActionSuggestion = require('../../modules/sentinel/models/ActionSuggestion')(sequelize, Sequelize.DataTypes);
const PortfolioSnapshot = require('../../modules/sentinel/models/PortfolioSnapshot')(sequelize, Sequelize.DataTypes);
const RecoveryCase = require('../../modules/sentinel/models/RecoveryCase')(sequelize, Sequelize.DataTypes);
const RecoveryActionLog = require('../../modules/sentinel/models/RecoveryActionLog')(sequelize, Sequelize.DataTypes);
// Fraud detection models
const DuplicateDetectionResult = require('../../modules/sentinel/models/DuplicateDetectionResult')(sequelize, Sequelize.DataTypes);
const GhostDetectionFlag = require('../../modules/sentinel/models/GhostDetectionFlag')(sequelize, Sequelize.DataTypes);

// Import COMPLIANCE module models
const ConsentRecord = require('../../modules/compliance/models/ConsentRecord')(sequelize, Sequelize.DataTypes);
const GrievanceRecord = require('../../modules/compliance/models/GrievanceRecord')(sequelize, Sequelize.DataTypes);

// Import CHOICE module models
const Intermediary = require('../../modules/choice/models/Intermediary')(sequelize, Sequelize.DataTypes);
const IntermediaryAssignment = require('../../modules/choice/models/IntermediaryAssignment')(sequelize, Sequelize.DataTypes);
const FieldVisitLog = require('../../modules/choice/models/FieldVisitLog')(sequelize, Sequelize.DataTypes);
// CHOICE — Sathi extension (beneficiary tracking, commissions, incentives, issues, nudges)
const SathiBeneficiary = require('../../modules/choice/models/SathiBeneficiary')(sequelize, Sequelize.DataTypes);
const SathiCommissionLedger = require('../../modules/choice/models/SathiCommissionLedger')(sequelize, Sequelize.DataTypes);
const SathiIncentiveLedger = require('../../modules/choice/models/SathiIncentiveLedger')(sequelize, Sequelize.DataTypes);
const SathiIssueFlag = require('../../modules/choice/models/SathiIssueFlag')(sequelize, Sequelize.DataTypes);
const SathiNudge = require('../../modules/choice/models/SathiNudge')(sequelize, Sequelize.DataTypes);

// Import farmer module models
const FarmerProfile = require('../../modules/farmer/models/FarmerProfile')(sequelize, Sequelize.DataTypes);
const FarmerProfileDetail = require('../../modules/farmer/models/FarmerProfileDetail')(sequelize, Sequelize.DataTypes);
const FarmerAddress = require('../../modules/farmer/models/FarmerAddress')(sequelize, Sequelize.DataTypes);
const FarmerGpsLocation = require('../../modules/farmer/models/FarmerGpsLocation')(sequelize, Sequelize.DataTypes);
const FarmerActivityPreference = require('../../modules/farmer/models/FarmerActivityPreference')(sequelize, Sequelize.DataTypes);
const FarmerActivitySubscription = require('../../modules/farmer/models/FarmerActivitySubscription')(sequelize, Sequelize.DataTypes);
const FarmerActivitySubtype = require('../../modules/farmer/models/FarmerActivitySubtype')(sequelize, Sequelize.DataTypes);
const FarmerSoilHealthCard = require('../../modules/farmer/models/FarmerSoilHealthCard')(sequelize, Sequelize.DataTypes);
// Package of Practices (PoP) — templates + per-farmer progress
const ActivityPopStage = require('../../modules/pop/models/ActivityPopStage')(sequelize, Sequelize.DataTypes);
const ActivityPopTouchpoint = require('../../modules/pop/models/ActivityPopTouchpoint')(sequelize, Sequelize.DataTypes);
const FarmerPopTouchpointProgress = require('../../modules/pop/models/FarmerPopTouchpointProgress')(sequelize, Sequelize.DataTypes);
const FarmerBankAccount = require('../../modules/farmer/models/FarmerBankAccount')(sequelize, Sequelize.DataTypes);
const FarmerLanguagePreference = require('../../modules/farmer/models/FarmerLanguagePreference')(sequelize, Sequelize.DataTypes);
const FieldAgentProfile = require('../../modules/farmer/models/FieldAgentProfile')(sequelize, Sequelize.DataTypes);
const FieldAgentFarmerAssignment = require('../../modules/farmer/models/FieldAgentFarmerAssignment')(sequelize, Sequelize.DataTypes);
const KycVerificationLog = require('../../modules/farmer/models/KycVerificationLog')(sequelize, Sequelize.DataTypes);
const OnboardingProgress = require('../../modules/farmer/models/OnboardingProgress')(sequelize, Sequelize.DataTypes);
const ProfileCompletenessScore = require('../../modules/farmer/models/ProfileCompletenessScore')(sequelize, Sequelize.DataTypes);
// Identity & Address Architecture models
const FarmerNameRecord = require('../../modules/farmer/models/FarmerNameRecord')(sequelize, Sequelize.DataTypes);
const FarmerAddressHistory = require('../../modules/farmer/models/FarmerAddressHistory')(sequelize, Sequelize.DataTypes);
const FarmerEntityMapping = require('../../modules/farmer/models/FarmerEntityMapping')(sequelize, Sequelize.DataTypes);
const FarmerValidationRecord = require('../../modules/farmer/models/FarmerValidationRecord')(sequelize, Sequelize.DataTypes);
const FarmerBorrowingSource = require('../../modules/farmer/models/FarmerBorrowingSource')(sequelize, Sequelize.DataTypes);

// Import trust farmer activity models (income mix tracking)
const TrustFarmerActivity = require('../../modules/trust/models/TrustFarmerActivity')(sequelize, Sequelize.DataTypes);
const TrustFarmerActivityMix = require('../../modules/trust/models/TrustFarmerActivityMix')(sequelize, Sequelize.DataTypes);
// Import trust loan liability + repayment models (debt + repayment discipline)
const TrustLoanLiability = require('../../modules/trust/models/TrustLoanLiability')(sequelize, Sequelize.DataTypes);
const TrustLoanRepayment = require('../../modules/trust/models/TrustLoanRepayment')(sequelize, Sequelize.DataTypes);
// Import trust household expense model (monthly cash-out snapshot)
const TrustHouseholdExpense = require('../../modules/trust/models/TrustHouseholdExpense')(sequelize, Sequelize.DataTypes);

// ─── BANK module models (registered here so getDb() calls in
//     bankPortfolioService / bankController / finacleOutboundService
//     actually resolve. Previously missing — latent bug fixed during
//     the May 2026 pilot prep). ────────────────────────────────────
const BankLoanAccount = require('../../modules/bank/models/BankLoanAccount')(sequelize, Sequelize.DataTypes);
const BankPortfolioImport = require('../../modules/bank/models/BankPortfolioImport')(sequelize, Sequelize.DataTypes);
const BankDataEntry = require('../../modules/bank/models/BankDataEntry')(sequelize, Sequelize.DataTypes);
const BankLoanAccountHistory = require('../../modules/bank/models/BankLoanAccountHistory')(sequelize, Sequelize.DataTypes);
const FinacleFieldMapping = require('../../modules/bank/models/FinacleFieldMapping')(sequelize, Sequelize.DataTypes);
const FinacleIntegrationEvent = require('../../modules/bank/models/FinacleIntegrationEvent')(sequelize, Sequelize.DataTypes);
// ADMIN module — bank-ops workforce accounts for the May 2026 pilot admin UI
const AdminUser = require('../../modules/admin/models/AdminUser')(sequelize, Sequelize.DataTypes);

// ─── VYAPAR (Vendor) module models ─────────────────────────────────
const VendorProfile = require('../../modules/vyapar/models/VendorProfile')(sequelize, Sequelize.DataTypes);
const VendorShop = require('../../modules/vyapar/models/VendorShop')(sequelize, Sequelize.DataTypes);
const VendorKyc = require('../../modules/vyapar/models/VendorKyc')(sequelize, Sequelize.DataTypes);
const VendorServiceArea = require('../../modules/vyapar/models/VendorServiceArea')(sequelize, Sequelize.DataTypes);
const VendorProductCatalog = require('../../modules/vyapar/models/VendorProductCatalog')(sequelize, Sequelize.DataTypes);
const VendorTransaction = require('../../modules/vyapar/models/VendorTransaction')(sequelize, Sequelize.DataTypes);
const VendorTransactionItem = require('../../modules/vyapar/models/VendorTransactionItem')(sequelize, Sequelize.DataTypes);
const VendorTransactionEvidence = require('../../modules/vyapar/models/VendorTransactionEvidence')(sequelize, Sequelize.DataTypes);
const VendorCommission = require('../../modules/vyapar/models/VendorCommission')(sequelize, Sequelize.DataTypes);
const VendorCreditLedger = require('../../modules/vyapar/models/VendorCreditLedger')(sequelize, Sequelize.DataTypes);
const VendorCreditSummary = require('../../modules/vyapar/models/VendorCreditSummary')(sequelize, Sequelize.DataTypes);
const VendorFarmerLink = require('../../modules/vyapar/models/VendorFarmerLink')(sequelize, Sequelize.DataTypes);
const VendorRating = require('../../modules/vyapar/models/VendorRating')(sequelize, Sequelize.DataTypes);
const VendorPerformance = require('../../modules/vyapar/models/VendorPerformance')(sequelize, Sequelize.DataTypes);
const VendorInventory = require('../../modules/vyapar/models/VendorInventory')(sequelize, Sequelize.DataTypes);
const VendorLoanMapping = require('../../modules/vyapar/models/VendorLoanMapping')(sequelize, Sequelize.DataTypes);
const VendorLoanUtilization = require('../../modules/vyapar/models/VendorLoanUtilization')(sequelize, Sequelize.DataTypes);
const VendorOfflineQueue = require('../../modules/vyapar/models/VendorOfflineQueue')(sequelize, Sequelize.DataTypes);
const VendorCrpMapping = require('../../modules/vyapar/models/VendorCrpMapping')(sequelize, Sequelize.DataTypes);
const VendorPurchaseBehaviorScore = require('../../modules/vyapar/models/VendorPurchaseBehaviorScore')(sequelize, Sequelize.DataTypes);
const VendorSentinelFeed = require('../../modules/vyapar/models/VendorSentinelFeed')(sequelize, Sequelize.DataTypes);
const VendorTrustFeed = require('../../modules/vyapar/models/VendorTrustFeed')(sequelize, Sequelize.DataTypes);

// Import DRISHTI module models (Digital Twin — scenario simulation engine)
const DrishtiScenarioTemplate = require('../../modules/drishti/models/DrishtiScenarioTemplate')(sequelize, Sequelize.DataTypes);
const DrishtiFarmerSnapshot = require('../../modules/drishti/models/DrishtiFarmerSnapshot')(sequelize, Sequelize.DataTypes);
const DrishtiScenarioRun = require('../../modules/drishti/models/DrishtiScenarioRun')(sequelize, Sequelize.DataTypes);
const DrishtiScenarioResult = require('../../modules/drishti/models/DrishtiScenarioResult')(sequelize, Sequelize.DataTypes);
const DrishtiScenarioComparison = require('../../modules/drishti/models/DrishtiScenarioComparison')(sequelize, Sequelize.DataTypes);
const DrishtiBenchmarkProfile = require('../../modules/drishti/models/DrishtiBenchmarkProfile')(sequelize, Sequelize.DataTypes);
const DrishtiPortfolioRun = require('../../modules/drishti/models/DrishtiPortfolioRun')(sequelize, Sequelize.DataTypes);
const DrishtiHouseholdIncomeSource = require('../../modules/drishti/models/DrishtiHouseholdIncomeSource')(sequelize, Sequelize.DataTypes);
const DrishtiHouseholdExpense = require('../../modules/drishti/models/DrishtiHouseholdExpense')(sequelize, Sequelize.DataTypes);

// Import Account Aggregator models (AA financial intelligence layer)
const AaConsent = require('../../modules/sentinel/models/AaConsent')(sequelize, Sequelize.DataTypes);
const AaBankStatementSummary = require('../../modules/sentinel/models/AaBankStatementSummary')(sequelize, Sequelize.DataTypes);
const AaTransaction = require('../../modules/sentinel/models/AaTransaction')(sequelize, Sequelize.DataTypes);
const AaFinancialAnalysis = require('../../modules/sentinel/models/AaFinancialAnalysis')(sequelize, Sequelize.DataTypes);
const AaConsentAuditLog = require('../../modules/sentinel/models/AaConsentAuditLog')(sequelize, Sequelize.DataTypes);
const CreditBureauReport = require('../../modules/sentinel/models/CreditBureauReport')(sequelize, Sequelize.DataTypes);

// Import Readiness models
const BankProductConfig = require('../../modules/readiness/models/BankProductConfig')(sequelize, Sequelize.DataTypes);
const ReadinessDecisionAuditLog = require('../../modules/readiness/models/ReadinessDecisionAuditLog')(sequelize, Sequelize.DataTypes);

const db = {
  sequelize,
  Sequelize,
  // Shared models
  AuditLog,
  Notification,
  Media,
  Document,
  // Auth models
  User,
  Role,
  Permission,
  UserRole,
  UserPermission,
  RolePermission,
  UserSession,
  OtpRequest,
  AadhaarVerification,
  // Shared platform models (Phase 1 complete)
  Language,
  LanguageTranslation,
  DocumentV2,
  DocumentTranslation,
  DocumentAccessLog,
  DocumentApproval,
  DocumentVersion,
  MediaAsset,
  MediaTag,
  MediaAccessLog,
  MediaProcessingJob,
  MediaTranslation,
  MediaRendition,
  AuditLogV2,
  AuditTrail,
  AuditExportLog,
  NotificationTemplate,
  NotificationTemplateTranslation,
  NotificationV2,
  // ROOTS crop execution models
  FarmRegister, Field, FieldSoilDetail, FieldOwnershipStatus, FieldLandDocumentAssociation,
  CultivationCycle, CultivationCycleLoanLinkage, CultivationCyclePlanning,
  WorkbandExecution, TaskExecution,
  TaskExecutionWeatherNote, TaskExecutionInputLog, TaskExecutionLaborLog,
  TaskExecutionMachineryLog, TaskExecutionPhoto, TaskExecutionExpense,
  CultivationCycleExpenseSummary, HarvestRecord, HarvestSaleRecord,
  CultivationCycleIncomeSummary, CultivationCycleProfitability,
  CultivationCycleHistory, CultivationCycleInsuranceLinkage,
  CultivationCycleHealthMonitoring, SoilHealthRecord, WaterManagementRecord,
  IntercropRecord, LivestockIntegrationRecord, FarmerInterventionLog,
  CultivationCycleBenchmarking,
  PopComplianceSnapshot,
  RootsComplianceSnapshot,
  RootsRedFlag,
  RootsLoanUtilizationTracking,
  // ROOTS crop models
  Organization,
  Trait,
  SoilType,
  SoilTypeTranslation,
  ClimateZone,
  AgroClimaticZoneMapping,
  CropMaster,
  CropTranslation,
  CropSeason,
  CropEstablishmentMethod,
  VarietyMaster,
  VarietyTraitAssignment,
  VarietySoilCompatibility,
  VarietyRegionalSuitability,
  InputUnit,
  InputCategory,
  InputItem,
  InputTranslation,
  InputPack,
  InputPackPrice,
  PackageOfPractice,
  PopWorkband,
  PopTask,
  PopTaskInput,
  PopCostBenchmark,
  PopWorkbandTrigger,
  PopWorkbandPestSusceptibility,
  // DICE models
  LoanProviderType,
  LoanProvider,
  LoanCategory,
  LoanSubcategory,
  LoanProduct,
  ScaleOfFinance,
  UnitEconomics,
  LoanProductEligibilityRule,
  LoanApplication,
  LoanApplicationStatus,
  LoanApplicationStatusHistory,
  LoanApplicationDocument,
  LoanApplicationBankNote,
  LoanDisbursement,
  LoanRepaymentSchedule,
  LoanRepayment,
  FarmerLoanBookmark,
  LoanIntegrationLog,
  LoanInsuranceBundled,
  // DICE post-harvest extension models
  DiceWarehouseRegistry,
  DicePostharvestTopupLoan,
  DiceProduceHypothecationLog,
  DicePriceRealisationSnapshot,
  // Trust models
  TrustSection,
  TrustQuestion,
  TrustQuestionChoice,
  TrustQuestionCondition,
  TrustTextInputScoringRange,
  TrustResponse,
  TrustResponseChoice,
  TrustResponseNumeric,
  TrustSectionProgress,
  TrustScoreCalculation,
  TrustScoreHistory,
  TrustQuestionVersionHistory,
  TrustScoreAppeal,
  // TRUST v2 models
  TrustEvidence,
  TrustAuditEvent,
  TrustDecision,
  SathiTask,
  // Location models
  LgdState,
  LgdStateTranslation,
  LgdDistrict,
  LgdDistrictTranslation,
  LgdBlock,
  LgdBlockTranslation,
  LgdVillage,
  LgdVillageTranslation,
  LgdPanchayat,
  LgdPanchayatTranslation,
  LgdVillagePanchayatMap,
  PacsRegistry,
  // SAGE models
  SageAdvisoryType, SageAdvisory, SageWeatherEvent,
  SageCropHealthObservation, SageFarmerInteraction, SageFeedback, SageAlert,
  WeatherObservation, RegionalPestAlert, GoogleFieldObservation,
  // PULSE models
  PulseMandi, PulseCommodity, PulseCommodityTranslation, PulsePriceRecord,
  PulsePriceForecast, PulseMsp, PulseMarketAlert, PulseFarmerPriceAlert,
  PulseSellRecommendation,
  // Insurance
  InsuranceEnrollment,
  // Insurance Phase 2 POS
  InsuranceProduct, InsurancePosReferral,
  // ROOTS Dairy models
  DairyHerdRegister, DairyAnimal, DairyAnimalHealthRecord, DairyBreedingRecord,
  DairyMilkProductionLog, DairyFeedUsageLog, DairyExpenseSummary, DairyIncomeSummary,
  DairyProfitabilitySummary, DairyQualityMetric, DairyMarketLinkage,
  DairyInsuranceLinkage, DairyLinkedLoanUtilization,
  // Dairy v2 financial logbook
  FarmerDairyProfile, DairyCostEvent, DairyRevenueEvent, DairyBreedingEvent,
  DairyTreatmentEvent, DairyRecurringTemplate, DairyAnimalPhoto, DairyWeeklySummary, DairyPopTemplate,
  // ROOTS Poultry
  PoultryFlock, PoultryDailyLog, PoultryHealthEvent, PoultryCostEvent,
  PoultryRevenueEvent, PoultryBatchSummary, PoultryPopTemplate,
  // ROOTS Goatery
  GoatHerd, GoatAnimal, GoatGrowthLog, GoatHealthEvent, GoatBreedingEvent,
  GoatFeedLog, GoatCostEvent, GoatRevenueEvent, GoatPopTemplate,
  // ROOTS Fishery models
  FisheryPondRegister, FisheryPond, FisherySpeciesStocked, FisheryFeedingLog,
  FisheryWaterQualityLog, FisheryHealthMonitoring, FisheryHarvestRecord,
  FisherySaleRecord, FisheryExpenseSummary, FisheryIncomeSummary,
  // Fishery v2 financial logbook
  FarmerFisheryProfile, FisheryVessel, FisheryCostEvent, FisheryRevenueEvent,
  FisheryStockingEventV2, FisheryHarvestEventV2, FisheryTripEvent,
  FisheryTreatmentEventV2, FisheryRecurringTemplate, FisheryWeeklySummary,
  // ROOTS Horticulture models
  HorticultureOrchard, HorticulturePlanting, HorticultureHarvest,
  HorticultureHealthRecord, HorticultureInputLog, HorticultureIrrigationLog,
  HorticultureExpenseSummary, HorticultureIncomeSummary,
  // SENTINEL models
  LoanHealthSnapshot, SmaClassificationLog, BulletMaturityTracker,
  RepaymentBehaviorIndex, VendorRegistry, ExpenseClassification,
  EndUseScoreLog, DiversionRiskAssessment, RedFlagEvent,
  FarmerIncomeStream, CashFlowProjection, RssScoreHistory,
  EwsSignal, EwsAlert, BranchActionQueue, ActionSuggestion,
  PortfolioSnapshot, RecoveryCase, RecoveryActionLog,
  DuplicateDetectionResult, GhostDetectionFlag,
  // COMPLIANCE models
  ConsentRecord,
  GrievanceRecord,
  // CHOICE models
  Intermediary,
  IntermediaryAssignment,
  FieldVisitLog,
  SathiBeneficiary,
  SathiCommissionLedger,
  SathiIncentiveLedger,
  SathiIssueFlag,
  SathiNudge,
  // Farmer models
  FarmerProfile,
  FarmerProfileDetail,
  FarmerAddress,
  FarmerGpsLocation,
  FarmerActivityPreference,
  FarmerActivitySubscription,
  FarmerActivitySubtype,
  FarmerSoilHealthCard,
  // Package of Practices (PoP)
  ActivityPopStage,
  ActivityPopTouchpoint,
  FarmerPopTouchpointProgress,
  FarmerBankAccount,
  FarmerLanguagePreference,
  FieldAgentProfile,
  FieldAgentFarmerAssignment,
  KycVerificationLog,
  OnboardingProgress,
  ProfileCompletenessScore,
  FarmerNameRecord,
  FarmerAddressHistory,
  FarmerEntityMapping,
  FarmerValidationRecord,
  FarmerBorrowingSource,
  // TRUST farmer activity (income mix) models
  TrustFarmerActivity,
  TrustFarmerActivityMix,
  // TRUST loan liability + repayment models
  TrustLoanLiability,
  TrustLoanRepayment,
  // TRUST household expense model
  TrustHouseholdExpense,
  // BANK module models (pilot: Excel portfolio import + cohort tracking)
  BankLoanAccount,
  BankPortfolioImport,
  BankDataEntry,
  BankLoanAccountHistory,
  FinacleFieldMapping,
  FinacleIntegrationEvent,
  // ADMIN module (bank-ops workforce auth for the pilot admin UI)
  AdminUser,
  // Vyapar (Vendor) models
  VendorProfile,
  VendorShop,
  VendorKyc,
  VendorServiceArea,
  VendorProductCatalog,
  VendorTransaction,
  VendorTransactionItem,
  VendorTransactionEvidence,
  VendorCommission,
  VendorCreditLedger,
  VendorCreditSummary,
  VendorFarmerLink,
  VendorRating,
  VendorPerformance,
  VendorInventory,
  VendorLoanMapping,
  VendorLoanUtilization,
  VendorOfflineQueue,
  VendorCrpMapping,
  VendorPurchaseBehaviorScore,
  VendorSentinelFeed,
  VendorTrustFeed,
  // DRISHTI models (Digital Twin — scenario simulation engine)
  DrishtiScenarioTemplate,
  DrishtiFarmerSnapshot,
  DrishtiScenarioRun,
  DrishtiScenarioResult,
  DrishtiScenarioComparison,
  DrishtiBenchmarkProfile,
  DrishtiPortfolioRun,
  DrishtiHouseholdIncomeSource,
  DrishtiHouseholdExpense,
  // Account Aggregator models
  AaConsent,
  AaBankStatementSummary,
  AaTransaction,
  AaFinancialAnalysis,
  AaConsentAuditLog,
  CreditBureauReport,
  // Readiness
  BankProductConfig,
  ReadinessDecisionAuditLog,
};

// Run model associations if defined
Object.values(db).forEach((model) => {
  if (model.associate) {
    model.associate(db);
  }
});

/**
 * Tests the database connection.
 * @returns {Promise<void>}
 */
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully');
  } catch (err) {
    logger.error('Unable to connect to the database:', err.message);
    throw err;
  }
};

db.testConnection = testConnection;

module.exports = db;
