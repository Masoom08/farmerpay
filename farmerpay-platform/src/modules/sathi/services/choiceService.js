/**
 * Choice Service
 * Business logic for CRP/intermediary profiles, assignments, interactions, and performance.
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../../../shared/utils/logger');

let db;
const getDb = () => {
  if (!db) db = require('../../../shared/models');
  return db;
};

/**
 * Retrieves full intermediary profile with assigned farmers, logs, ratings, and KPIs.
 */
const getIntermediaryProfile = async (choiceId) => {
  const {
    ChoiceIntermediary, ChoiceAssignment, ChoiceInteractionLog,
    ChoiceRating, ChoicePerformanceKpi, ChoiceBadge, User,
  } = getDb();

  const intermediary = await ChoiceIntermediary.findOne({
    where: { choice_id: choiceId, is_active: true },
    include: [
      { model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'mobile'] },
      {
        model: ChoiceAssignment,
        as: 'assignments',
        where: { is_active: true, assignment_status: 'active' },
        required: false,
        limit: 5,
      },
      {
        model: ChoiceInteractionLog,
        as: 'interactionLogs',
        where: { is_active: true },
        required: false,
        limit: 10,
        order: [['interaction_date', 'DESC']],
      },
      {
        model: ChoiceRating,
        as: 'ratings',
        where: { is_active: true },
        required: false,
        limit: 5,
        order: [['rated_on', 'DESC']],
      },
      {
        model: ChoicePerformanceKpi,
        as: 'performanceKpis',
        where: { is_active: true },
        required: false,
        limit: 3,
        order: [['kpi_year', 'DESC'], ['kpi_month', 'DESC']],
      },
      {
        model: ChoiceBadge,
        as: 'badges',
        where: { is_active: true },
        required: false,
      },
    ],
  });

  if (!intermediary) {
    const err = new Error('Intermediary not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  return {
    profile: {
      choiceId: intermediary.choice_id,
      name: intermediary.intermediary_name,
      code: intermediary.intermediary_code,
      phone: intermediary.intermediary_phone,
      type: intermediary.intermediary_type,
      areaOfOperation: intermediary.area_of_operation,
      farmersManaged: intermediary.farmers_managed,
      performanceRating: intermediary.performance_rating,
      totalTasksCompleted: intermediary.total_tasks_completed,
    },
    assignedFarmers: intermediary.assignments,
    interactionLogs: intermediary.interactionLogs,
    ratings: intermediary.ratings,
    performanceKpis: intermediary.performanceKpis,
    badges: intermediary.badges,
  };
};

/**
 * Retrieves tasks assigned to an intermediary via their linked agent profile.
 */
const getIntermediaryTasks = async (choiceId) => {
  const { ChoiceIntermediary, SathiTask } = getDb();

  const intermediary = await ChoiceIntermediary.findOne({
    where: { choice_id: choiceId, is_active: true },
  });

  if (!intermediary) {
    const err = new Error('Intermediary not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  // Find tasks where the agent user matches the intermediary user
  const { FieldAgentProfile } = getDb();
  const agentProfile = await FieldAgentProfile.findOne({
    where: { agent_user_id: intermediary.intermediary_user_id, is_active: true },
  });

  if (!agentProfile) {
    return { tasks: [], total: 0 };
  }

  const { count, rows } = await SathiTask.findAndCountAll({
    where: { assigned_to_agent_id: agentProfile.id, is_active: true },
    order: [['due_date', 'ASC']],
  });

  return { tasks: rows, total: count };
};

/**
 * Retrieves paginated list of farmers assigned to an intermediary.
 */
const getAssignedFarmers = async (choiceId, filters = {}) => {
  const { ChoiceAssignment, ChoiceInteractionLog, User } = getDb();

  const limit = filters.limit || 20;
  const offset = filters.offset || 0;

  const { count, rows } = await ChoiceAssignment.findAndCountAll({
    where: { choice_id: choiceId, assignment_status: 'active', is_active: true },
    include: [
      {
        model: User,
        as: 'farmer',
        attributes: ['id', 'first_name', 'last_name', 'mobile'],
      },
    ],
    limit,
    offset,
    order: [['assigned_at', 'DESC']],
  });

  // Fetch last interaction for each farmer
  const farmersWithInteraction = await Promise.all(
    rows.map(async (assignment) => {
      const lastInteraction = await ChoiceInteractionLog.findOne({
        where: {
          choice_id: choiceId,
          farmer_id: assignment.farmer_id,
          is_active: true,
        },
        order: [['interaction_date', 'DESC']],
      });

      return {
        farmerId: assignment.farmer_id,
        farmerName: assignment.farmer
          ? `${assignment.farmer.first_name || ''} ${assignment.farmer.last_name || ''}`.trim()
          : null,
        assignmentDate: assignment.assigned_at,
        lastInteraction: lastInteraction ? lastInteraction.interaction_date : null,
      };
    })
  );

  return { farmers: farmersWithInteraction, total: count };
};

/**
 * Logs a new interaction between intermediary and farmer.
 */
const createInteraction = async (choiceId, data) => {
  const { ChoiceInteractionLog, ChoiceIntermediary, User } = getDb();

  // Verify intermediary
  const intermediary = await ChoiceIntermediary.findOne({
    where: { choice_id: choiceId, is_active: true },
  });
  if (!intermediary) {
    const err = new Error('Intermediary not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  // Verify farmer
  const farmer = await User.findOne({ where: { id: data.farmerId, is_active: true } });
  if (!farmer) {
    const err = new Error('Farmer not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  const interaction = await ChoiceInteractionLog.create({
    interaction_id: uuidv4(),
    choice_id: choiceId,
    farmer_id: data.farmerId,
    interaction_type: data.interactionType,
    interaction_date: new Date(),
    interaction_duration_minutes: data.duration || null,
    interaction_purpose: data.purpose || null,
    outcome: data.outcome || null,
  });

  logger.info(`Interaction logged for intermediary ${choiceId} with farmer ${data.farmerId}`);
  return { interactionId: interaction.id };
};

/**
 * Retrieves monthly performance KPIs for an intermediary.
 */
const getPerformance = async (choiceId, month, year) => {
  const { ChoicePerformanceKpi } = getDb();

  const kpi = await ChoicePerformanceKpi.findOne({
    where: {
      choice_id: choiceId,
      kpi_month: month,
      kpi_year: year,
      is_active: true,
    },
  });

  if (!kpi) {
    return {
      tasksAssigned: 0,
      tasksCompleted: 0,
      completionRate: 0,
      qualityRating: null,
      farmerSatisfaction: null,
    };
  }

  return {
    tasksAssigned: kpi.tasks_assigned,
    tasksCompleted: kpi.tasks_completed,
    tasksRejected: kpi.tasks_rejected,
    completionRate: kpi.completion_rate_percent,
    qualityRating: kpi.quality_rating,
    farmerSatisfaction: kpi.farmers_satisfaction_score,
  };
};

module.exports = {
  getIntermediaryProfile,
  getIntermediaryTasks,
  getAssignedFarmers,
  createInteraction,
  getPerformance,
};
