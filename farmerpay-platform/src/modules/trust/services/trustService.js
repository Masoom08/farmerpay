/**
 * Trust Service
 * Business logic for TRUST questionnaire, responses, score retrieval, and appeals.
 */

const { Op } = require('sequelize');
const logger = require('../../../shared/utils/logger');
const { generateUUID } = require('../../../shared/utils/uuidHelper');
const { setWithTTL, getKey, deleteKeys } = require('../../../config/redis');
const { calculateTrustScore } = require('./scoringEngine');
const { computeLeverage } = require('./leverageService');
const { parsePagination, buildMeta } = require('../../../shared/utils/paginationHelper');

const CACHE_TTL = 86400; // 24h

let db;
const getDb = () => { if (!db) db = require('../../../shared/models'); return db; };

/**
 * Gets all active scoring sections.
 * @returns {Promise<Array>}
 */
const getSections = async (options = {}) => {
  const { limit = 50, offset = 0 } = options;
  const { TrustSection } = getDb();
  const sections = await TrustSection.findAll({
    where: { is_active: true },
    order: [['section_order', 'ASC']],
    attributes: ['id', 'section_uuid', 'section_code', 'section_name', 'section_description', 'section_order', 'weight_in_total_score', 'max_points'],
    limit,
    offset,
  });
  return sections.map((s) => ({
    sectionId: s.id, sectionUuid: s.section_uuid, sectionCode: s.section_code,
    sectionName: s.section_name, description: s.section_description,
    order: s.section_order, weight: parseFloat(s.weight_in_total_score), maxPoints: s.max_points,
  }));
};

/**
 * Gets questions for a section with choices.
 * @param {number} sectionId
 * @returns {Promise<Array>}
 */
const getSectionQuestions = async (sectionId) => {
  const { TrustQuestion, TrustQuestionChoice } = getDb();
  const questions = await TrustQuestion.findAll({
    where: { section_id: sectionId, is_active: true },
    include: [{ model: TrustQuestionChoice, as: 'choices', where: { is_active: true }, required: false, order: [['choice_order', 'ASC']] }],
    order: [['id', 'ASC']],
  });
  return questions.map((q) => ({
    questionId: q.id, questionUuid: q.question_uuid,
    questionText: q.question_text, questionType: q.question_type,
    requiredAnswerType: q.required_answer_type,
    minValue: q.min_value, maxValue: q.max_value, unit: q.unit_of_measurement,
    conditionalLogic: q.conditional_logic, dependsOnQuestionId: q.depends_on_question_id,
    choices: (q.choices || []).map((c) => ({
      choiceId: c.id, text: c.choice_text, value: c.choice_value, order: c.choice_order,
    })),
  }));
};

/**
 * Saves farmer responses for a section and triggers score recalculation.
 * @param {number} farmerId - Internal user ID
 * @param {number} sectionId
 * @param {Array} responses - [{ questionId, response }]
 * @returns {Promise<Object>} { responsesCollected, sectionProgress, nextSection }
 */
const saveResponses = async (farmerId, sectionId, responses) => {
  const models = getDb();
  const { TrustResponse, TrustResponseChoice, TrustResponseNumeric, TrustQuestion, TrustQuestionChoice, TrustTextInputScoringRange, TrustSectionProgress, TrustSection, sequelize: seq } = models;

  const transaction = await seq.transaction();

  try {
    let collected = 0;

    // Batch-load all questions to avoid N+1 queries
    const questionIds = responses.map(r => r.questionId);
    const questions = await TrustQuestion.findAll({
      where: { id: questionIds },
      include: [
        { model: TrustQuestionChoice, as: 'choices' },
        { model: TrustTextInputScoringRange, as: 'scoringRanges', required: false },
      ],
      transaction,
    });
    const questionMap = new Map(questions.map(q => [q.id, q]));

    for (const resp of responses) {
      const question = questionMap.get(resp.questionId);
      if (!question || question.section_id !== sectionId) continue;

      // Upsert response
      let [trustResponse] = await TrustResponse.upsert({
        response_uuid: generateUUID(),
        farmer_id: farmerId,
        question_id: resp.questionId,
        response_timestamp: new Date(),
      }, { transaction, returning: true });

      // Reload to get id
      trustResponse = await TrustResponse.findOne({ where: { farmer_id: farmerId, question_id: resp.questionId }, transaction });

      // Clear existing sub-responses
      await TrustResponseChoice.destroy({ where: { trust_response_id: trustResponse.id }, transaction });
      await TrustResponseNumeric.destroy({ where: { trust_response_id: trustResponse.id }, transaction });

      // Store response based on type
      if (question.question_type === 'numeric_input') {
        const numericValue = parseFloat(resp.response);
        if (!Number.isFinite(numericValue)) {
          const err = new Error(`Question ${question.id}: numeric value required`);
          err.statusCode = 400;
          err.errorCode = 'TRUST_RESPONSE_INVALID';
          throw err;
        }
        // Enforce the min/max bounds declared on the question. Without this
        // a farmer can submit land_size = 1_000_000 or income = -99999 and
        // directly manipulate their own composite score.
        const min = question.min_value !== null && question.min_value !== undefined ? parseFloat(question.min_value) : null;
        const max = question.max_value !== null && question.max_value !== undefined ? parseFloat(question.max_value) : null;
        if ((min !== null && numericValue < min) || (max !== null && numericValue > max)) {
          const err = new Error(`Question ${question.id}: value ${numericValue} is out of range [${min ?? '-∞'}, ${max ?? '∞'}]`);
          err.statusCode = 400;
          err.errorCode = 'TRUST_RESPONSE_OUT_OF_RANGE';
          throw err;
        }
        await TrustResponseNumeric.create({
          trust_response_id: trustResponse.id,
          numeric_value: numericValue,
        }, { transaction });
      } else if (question.question_type === 'yes_no' || question.question_type === 'multiple_choice') {
        const choiceIds = Array.isArray(resp.response) ? resp.response : [resp.response];
        for (const cId of choiceIds) {
          const choiceId = typeof cId === 'number' ? cId : parseInt(cId, 10);
          if (!isNaN(choiceId)) {
            await TrustResponseChoice.create({
              trust_response_id: trustResponse.id,
              choice_id: choiceId,
            }, { transaction });
          }
        }
      }

      collected++;
    }

    // Update section progress
    const totalQuestions = await TrustQuestion.count({ where: { section_id: sectionId, is_active: true } });
    const totalResponses = await TrustResponse.count({
      where: { farmer_id: farmerId, is_active: true },
      include: [{ model: TrustQuestion, as: 'question', where: { section_id: sectionId }, attributes: [] }],
    });

    const isComplete = totalResponses >= totalQuestions;

    await TrustSectionProgress.upsert({
      farmer_id: farmerId,
      section_id: sectionId,
      responses_collected: totalResponses,
      questions_in_section: totalQuestions,
      section_status: isComplete ? 'completed' : 'in_progress',
      section_start_timestamp: new Date(),
      ...(isComplete ? { section_complete_timestamp: new Date() } : {}),
    }, { transaction });

    await transaction.commit();

    // Trigger score recalculation FIRST so the new value is cached, then
    // invalidate only if recalc fails (avoiding a window where the cache
    // is empty and a read falls through to a stale DB snapshot). Order
    // matters: invalidate-then-recalc leaves a gap if recalc throws.
    try {
      await calculateTrustScore(farmerId, models);
    } catch (err) {
      logger.warn('Score recalculation deferred:', err.message);
      // Still invalidate so a stale cached value doesn't outlive the
      // responses that were just saved.
      await deleteKeys(`trust:score:${farmerId}`);
    }

    // Find next section
    const currentSection = await TrustSection.findByPk(sectionId);
    const nextSection = await TrustSection.findOne({
      where: { section_order: { [Op.gt]: currentSection.section_order }, is_active: true },
      order: [['section_order', 'ASC']],
    });

    logger.info(`TRUST responses saved: farmer ${farmerId}, section ${sectionId}, ${collected} responses`);

    return {
      responsesCollected: totalResponses,
      sectionProgress: { total: totalQuestions, completed: totalResponses, status: isComplete ? 'completed' : 'in_progress' },
      nextSection: nextSection ? { sectionId: nextSection.id, sectionName: nextSection.section_name } : null,
    };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

/**
 * Gets overall progress across all sections.
 * @param {number} farmerId
 * @returns {Promise<Object>}
 */
const getProgress = async (farmerId) => {
  const { TrustSectionProgress, TrustSection, TrustQuestion, TrustResponse } = getDb();

  const sections = await TrustSection.findAll({ where: { is_active: true }, order: [['section_order', 'ASC']] });

  // Recompute totals at read time so that newly-added questions are reflected
  // immediately for every farmer (TrustSectionProgress.questions_in_section is
  // only updated on writes, so it goes stale whenever the question bank grows).
  const [questionCounts, responseRows, progressRecords] = await Promise.all([
    TrustQuestion.findAll({
      where: { is_active: true, section_id: sections.map((s) => s.id) },
      attributes: ['section_id', [TrustQuestion.sequelize.fn('COUNT', TrustQuestion.sequelize.col('id')), 'cnt']],
      group: ['section_id'],
      raw: true,
    }),
    TrustResponse.findAll({
      where: { farmer_id: farmerId, is_active: true },
      include: [{ model: TrustQuestion, as: 'question', attributes: ['section_id'] }],
      attributes: ['question_id'],
    }),
    TrustSectionProgress.findAll({ where: { farmer_id: farmerId, is_active: true } }),
  ]);

  const questionCountMap = {};
  questionCounts.forEach((r) => { questionCountMap[r.section_id] = parseInt(r.cnt, 10); });

  const responseCountMap = {};
  responseRows.forEach((r) => {
    const sid = r.question?.section_id;
    if (sid) responseCountMap[sid] = (responseCountMap[sid] || 0) + 1;
  });

  const progressMap = {};
  progressRecords.forEach((p) => { progressMap[p.section_id] = p; });

  let totalQuestions = 0;
  let totalResponses = 0;

  const sectionProgress = sections.map((s) => {
    const total = questionCountMap[s.id] || 0;
    const collected = responseCountMap[s.id] || 0;
    totalQuestions += total;
    totalResponses += collected;

    let status = 'not_started';
    if (collected >= total && total > 0) status = 'completed';
    else if (collected > 0) status = 'in_progress';

    return {
      sectionId: s.id,
      sectionName: s.section_name,
      sectionCode: s.section_code,
      status,
      responsesCollected: collected,
      totalQuestions: total,
    };
  });

  const overallProgress = totalQuestions > 0 ? Math.round((totalResponses / totalQuestions) * 100) : 0;

  return { sections: sectionProgress, overallProgress };
};

/**
 * Gets the farmer's TRUST score (cached 24h).
 * @param {number} farmerId
 * @returns {Promise<Object>}
 */
const getScore = async (farmerId) => {
  const cacheKey = `trust:score:${farmerId}`;
  const cached = await getKey(cacheKey);
  if (cached) return cached;

  const models = getDb();
  const { TrustScoreHistory } = models;

  // Check for existing score
  let latest = await TrustScoreHistory.findOne({
    where: { farmer_id: farmerId, is_active: true },
    order: [['calculated_at', 'DESC']],
  });

  // Calculate if no score exists
  if (!latest) {
    const result = await calculateTrustScore(farmerId, models);
    const score = {
      totalScore: result.totalScore, scoreBand: result.scoreBand,
      sectionScores: result.sectionScores, calculatedAt: result.calculatedAt,
      nextReviewDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    };
    await setWithTTL(cacheKey, score, CACHE_TTL);
    return score;
  }

  const score = {
    totalScore: latest.total_trust_score, scoreBand: latest.score_band,
    scoreBandMin: latest.score_band_min, scoreBandMax: latest.score_band_max,
    sectionScores: latest.section_scores, calculatedAt: latest.calculated_at,
    nextReviewDate: new Date(new Date(latest.calculated_at).getTime() + 90 * 24 * 60 * 60 * 1000),
  };

  await setWithTTL(cacheKey, score, CACHE_TTL);
  return score;
};

/**
 * Gets score history with pagination.
 * @param {number} farmerId
 * @param {Object} query
 * @returns {Promise<Object>}
 */
const getScoreHistory = async (farmerId, query) => {
  const { TrustScoreHistory } = getDb();
  const { page, limit, offset } = parsePagination(query);

  const { count, rows } = await TrustScoreHistory.findAndCountAll({
    where: { farmer_id: farmerId, is_active: true },
    order: [['calculated_at', 'DESC']],
    limit, offset,
  });

  return {
    history: rows.map((h) => ({
      score: h.total_trust_score, band: h.score_band,
      sectionScores: h.section_scores, calculatedAt: h.calculated_at,
    })),
    meta: buildMeta(page, limit, count),
  };
};

/**
 * Submits a score appeal.
 * @param {number} farmerId
 * @param {Object} data - { appealReason, additionalContext }
 * @returns {Promise<Object>}
 */
const submitAppeal = async (farmerId, data) => {
  const { TrustScoreAppeal, TrustScoreHistory } = getDb();

  // Get current score
  const latestScore = await TrustScoreHistory.findOne({
    where: { farmer_id: farmerId, is_active: true },
    order: [['calculated_at', 'DESC']],
  });

  // Check for existing pending appeal
  const existing = await TrustScoreAppeal.findOne({
    where: { farmer_id: farmerId, appeal_status: { [Op.in]: ['pending', 'under_review'] }, is_active: true },
  });
  if (existing) {
    const err = new Error('You already have a pending appeal');
    err.statusCode = 409; err.errorCode = 'RES_002';
    throw err;
  }

  const appeal = await TrustScoreAppeal.create({
    appeal_uuid: generateUUID(),
    farmer_id: farmerId,
    appeal_against_score: latestScore?.total_trust_score || 0,
    appeal_reason: [data.appealReason, data.additionalContext].filter(Boolean).join('\n\n'),
  });

  logger.info(`TRUST appeal submitted: farmer ${farmerId}, appeal ${appeal.appeal_uuid}`);

  return { appealId: appeal.appeal_uuid, status: appeal.appeal_status, submittedAt: appeal.appeal_submitted_at };
};

/**
 * Gets an appeal by UUID.
 * @param {number} farmerId
 * @param {string} appealUuid
 * @returns {Promise<Object>}
 */
const getAppeal = async (farmerId, appealUuid) => {
  const { TrustScoreAppeal } = getDb();
  const appeal = await TrustScoreAppeal.findOne({
    where: { appeal_uuid: appealUuid, farmer_id: farmerId, is_active: true },
  });
  if (!appeal) {
    const err = new Error('Appeal not found');
    err.statusCode = 404; err.errorCode = 'RES_001';
    throw err;
  }
  return {
    appealId: appeal.appeal_uuid, status: appeal.appeal_status,
    appealAgainstScore: appeal.appeal_against_score, reason: appeal.appeal_reason,
    submittedAt: appeal.appeal_submitted_at, decisionAt: appeal.appeal_decision_at,
    decisionNotes: appeal.decision_notes,
  };
};

/**
 * Admin: Gets all appeals with pagination and filtering.
 * @param {Object} query - { status, page, limit }
 * @returns {Promise<Object>}
 */
const getAppealsAdmin = async (query) => {
  const { TrustScoreAppeal, User } = getDb();
  const { page, limit, offset } = parsePagination(query);

  const where = { is_active: true };
  if (query.status) where.appeal_status = query.status;

  const { count, rows } = await TrustScoreAppeal.findAndCountAll({
    where, include: [{ model: User, as: 'farmer', attributes: ['user_id', 'first_name', 'last_name', 'mobile'] }],
    order: [['appeal_submitted_at', 'DESC']], limit, offset,
  });

  return {
    appeals: rows.map((a) => ({
      appealId: a.appeal_uuid, status: a.appeal_status,
      score: a.appeal_against_score, reason: a.appeal_reason,
      submittedAt: a.appeal_submitted_at, farmer: a.farmer ? {
        userId: a.farmer.user_id, name: [a.farmer.first_name, a.farmer.last_name].filter(Boolean).join(' '),
      } : null,
    })),
    meta: buildMeta(page, limit, count),
  };
};

/* ──────────────────────────────────────────────────────────────────────── */
/*  Farmer activity (income mix) — under TRUST so the whole picture lives  */
/*  under one name.                                                         */
/* ──────────────────────────────────────────────────────────────────────── */

/**
 * Returns a farmer's active activity subscriptions and the latest year mix.
 */
const getActivities = async (farmerId) => {
  const { TrustFarmerActivity, TrustFarmerActivityMix } = getDb();

  const [activities, mixes] = await Promise.all([
    TrustFarmerActivity.findAll({
      where: { farmer_id: farmerId, is_active: true },
      order: [['is_primary', 'DESC'], ['activity_type', 'ASC']],
    }),
    TrustFarmerActivityMix.findAll({
      where: { farmer_id: farmerId, is_active: true },
      order: [['reference_year', 'DESC']],
    }),
  ]);

  const latestYear = mixes.reduce((max, m) => Math.max(max, m.reference_year), 0);
  const latestMix = mixes.filter((m) => m.reference_year === latestYear);

  return {
    activities: activities.map((a) => ({
      activityUuid: a.activity_uuid,
      activityType: a.activity_type,
      isPrimary: a.is_primary,
      startedYear: a.started_year,
      source: a.source,
    })),
    mix: {
      referenceYear: latestYear || new Date().getFullYear(),
      items: latestMix.map((m) => ({
        mixUuid: m.mix_uuid,
        activityType: m.activity_type,
        sharePercent: parseFloat(m.share_percent),
        estimatedAnnualIncomeInr: m.estimated_annual_income_inr ? parseFloat(m.estimated_annual_income_inr) : null,
        confidence: m.confidence,
      })),
    },
  };
};

/**
 * Upserts a farmer's activity subscriptions and (optionally) annual mix.
 * Soft-deactivates rows that are missing from the new payload.
 */
const upsertActivities = async (farmerId, payload) => {
  const { TrustFarmerActivity, TrustFarmerActivityMix, sequelize: seq } = getDb();
  const transaction = await seq.transaction();

  try {
    // Soft-deactivate any existing activities then re-upsert
    await TrustFarmerActivity.update(
      { is_active: false },
      { where: { farmer_id: farmerId, is_active: true }, transaction }
    );

    for (const a of payload.activities || []) {
      const existing = await TrustFarmerActivity.findOne({
        where: { farmer_id: farmerId, activity_type: a.type },
        transaction,
      });
      if (existing) {
        await existing.update({
          is_active: true,
          is_primary: !!a.isPrimary,
          started_year: a.startedYear || existing.started_year,
          source: a.source || existing.source || 'FARMER_DECLARED',
        }, { transaction });
      } else {
        await TrustFarmerActivity.create({
          activity_uuid: generateUUID(),
          farmer_id: farmerId,
          activity_type: a.type,
          is_primary: !!a.isPrimary,
          started_year: a.startedYear || null,
          source: a.source || 'FARMER_DECLARED',
        }, { transaction });
      }
    }

    // Optional annual mix
    if (payload.mix && Array.isArray(payload.mix.items) && payload.mix.items.length) {
      const year = payload.mix.referenceYear || new Date().getFullYear();
      const sum = payload.mix.items.reduce((s, i) => s + (parseFloat(i.sharePercent) || 0), 0);
      if (sum > 105) {
        const err = new Error(`Activity shares sum to ${sum.toFixed(0)}% — must be <= 100%`);
        err.statusCode = 400;
        err.errorCode = 'VAL_001';
        throw err;
      }

      await TrustFarmerActivityMix.update(
        { is_active: false },
        { where: { farmer_id: farmerId, reference_year: year, is_active: true }, transaction }
      );

      for (const item of payload.mix.items) {
        const existing = await TrustFarmerActivityMix.findOne({
          where: { farmer_id: farmerId, activity_type: item.type, reference_year: year },
          transaction,
        });
        if (existing) {
          await existing.update({
            is_active: true,
            share_percent: item.sharePercent,
            estimated_annual_income_inr: item.estimatedAnnualIncomeInr || null,
            confidence: item.confidence || existing.confidence || 'MEDIUM',
          }, { transaction });
        } else {
          await TrustFarmerActivityMix.create({
            mix_uuid: generateUUID(),
            farmer_id: farmerId,
            activity_type: item.type,
            reference_year: year,
            share_percent: item.sharePercent,
            estimated_annual_income_inr: item.estimatedAnnualIncomeInr || null,
            confidence: item.confidence || 'MEDIUM',
          }, { transaction });
        }
      }
    }

    await transaction.commit();

    // Invalidate cached score so the next read recalcs (mix changes affect SENTINEL signal)
    await deleteKeys(`trust:score:${farmerId}`);

    logger.info(`Trust activities upserted: farmer ${farmerId}, ${(payload.activities || []).length} activities`);
    return getActivities(farmerId);
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

/**
 * One-call dashboard payload for the mobile TRUST card.
 * Returns score, profile completeness, activities, mix, and the "next nudge"
 * (lowest-order incomplete section). All in a single round-trip.
 */
const getHome = async (farmerId) => {
  const [scoreVal, progressVal, activitiesVal, expenseSummary, leverageVal] = await Promise.all([
    getScore(farmerId),
    getProgress(farmerId),
    getActivities(farmerId),
    getExpenseSummary(farmerId),
    computeLeverage(farmerId).catch((e) => {
      logger.warn(`Leverage compute failed for farmer ${farmerId}: ${e.message}`);
      return null;
    }),
  ]);

  const nextNudge = progressVal.sections.find((s) => s.status !== 'completed');

  // Monthly expense nudge — show ONLY if current month not yet logged
  const expenseNudge = expenseSummary.currentMonth.logged
    ? null
    : {
      year: expenseSummary.currentMonth.year,
      month: expenseSummary.currentMonth.month,
      message: 'Log this month\'s household expenses to keep your TRUST score current.',
    };

  return {
    score: {
      total: scoreVal.totalScore,
      band: scoreVal.scoreBand,
      bandMin: scoreVal.scoreBandMin,
      bandMax: scoreVal.scoreBandMax,
      calculatedAt: scoreVal.calculatedAt,
    },
    profile: {
      completionPercent: progressVal.overallProgress,
      sections: progressVal.sections,
      nextNudge: nextNudge ? {
        sectionId: nextNudge.sectionId,
        sectionCode: nextNudge.sectionCode,
        sectionName: nextNudge.sectionName,
        status: nextNudge.status,
        responsesCollected: nextNudge.responsesCollected,
        totalQuestions: nextNudge.totalQuestions,
      } : null,
    },
    activities: {
      active: activitiesVal.activities.map((a) => a.activityType),
      primary: activitiesVal.activities.find((a) => a.isPrimary)?.activityType || null,
      mix: activitiesVal.mix,
    },
    expenses: {
      monthsLogged: expenseSummary.monthsLogged,
      avgLast3MonthsInr: expenseSummary.avgLast3MonthsInr,
      avgLast6MonthsInr: expenseSummary.avgLast6MonthsInr,
      currentMonth: expenseSummary.currentMonth,
      nudge: expenseNudge,
    },
    leverage: leverageVal,
  };
};

/**
 * L5 — Standalone leverage endpoint. Re-uses computeLeverage from leverageService.
 */
const getLeverage = async (farmerId) => computeLeverage(farmerId);

// ─── Loan Liabilities ──────────────────────────────────────────────

/**
 * Lists all active loan liabilities for a farmer + summary stats.
 */
const listLiabilities = async (farmerId) => {
  const { TrustLoanLiability, TrustLoanRepayment } = getDb();

  const liabilities = await TrustLoanLiability.findAll({
    where: { farmer_id: farmerId, is_active: true },
    order: [['status', 'ASC'], ['created_at', 'DESC']],
  });

  // Aggregate stats over ACTIVE loans only
  const activeLoans = liabilities.filter((l) => l.status === 'ACTIVE');
  const totalOutstanding = activeLoans.reduce((s, l) => s + parseFloat(l.outstanding_inr || 0), 0);
  const totalEmi = activeLoans.reduce((s, l) => s + parseFloat(l.emi_inr || 0), 0);
  const byLenderType = {};
  for (const l of activeLoans) {
    byLenderType[l.lender_type] = (byLenderType[l.lender_type] || 0) + 1;
  }

  // Repayment discipline: count ontime / late / missed across active loans
  let onTime = 0, late = 0, missed = 0;
  if (activeLoans.length > 0) {
    const repayments = await TrustLoanRepayment.findAll({
      where: { farmer_id: farmerId, is_active: true },
    });
    for (const r of repayments) {
      if (r.status === 'PAID_ONTIME') onTime++;
      else if (r.status === 'PAID_LATE') late++;
      else if (r.status === 'MISSED') missed++;
    }
  }
  const totalDecided = onTime + late + missed;
  const onTimeRate = totalDecided > 0 ? Math.round((onTime / totalDecided) * 100) : null;

  return {
    liabilities: liabilities.map((l) => ({
      loanUuid: l.loan_uuid,
      lenderType: l.lender_type,
      lenderName: l.lender_name,
      loanPurpose: l.loan_purpose,
      principalInr: parseFloat(l.principal_inr),
      outstandingInr: parseFloat(l.outstanding_inr),
      interestRatePct: l.interest_rate_pct ? parseFloat(l.interest_rate_pct) : null,
      tenureMonths: l.tenure_months,
      emiInr: l.emi_inr ? parseFloat(l.emi_inr) : null,
      emiFrequency: l.emi_frequency,
      startDate: l.start_date,
      endDate: l.end_date,
      status: l.status,
      isSecured: l.is_secured,
      collateralDescription: l.collateral_description,
      source: l.source,
      notes: l.notes,
    })),
    summary: {
      activeCount: activeLoans.length,
      totalCount: liabilities.length,
      totalOutstandingInr: totalOutstanding,
      totalEmiInr: totalEmi,
      byLenderType,
      repaymentDiscipline: {
        onTime,
        late,
        missed,
        onTimeRate,
      },
    },
  };
};

/**
 * Creates a new loan liability for a farmer.
 */
const createLiability = async (farmerId, payload) => {
  const { TrustLoanLiability } = getDb();

  const liability = await TrustLoanLiability.create({
    loan_uuid: generateUUID(),
    farmer_id: farmerId,
    lender_type: payload.lenderType,
    lender_name: payload.lenderName || null,
    loan_purpose: payload.loanPurpose,
    principal_inr: payload.principalInr,
    outstanding_inr: payload.outstandingInr != null ? payload.outstandingInr : payload.principalInr,
    interest_rate_pct: payload.interestRatePct || null,
    tenure_months: payload.tenureMonths || null,
    emi_inr: payload.emiInr || null,
    emi_frequency: payload.emiFrequency || 'MONTHLY',
    start_date: payload.startDate || null,
    end_date: payload.endDate || null,
    status: payload.status || 'ACTIVE',
    is_secured: !!payload.isSecured,
    collateral_description: payload.collateralDescription || null,
    source: payload.source || 'FARMER_DECLARED',
    notes: payload.notes || null,
    is_active: true,
  });

  await deleteKeys(`trust:score:${farmerId}`);
  logger.info(`Trust liability created: farmer ${farmerId}, loan ${liability.loan_uuid}`);
  return { loanUuid: liability.loan_uuid };
};

/**
 * Updates an existing loan liability (by uuid, scoped to farmer).
 */
const updateLiability = async (farmerId, loanUuid, payload) => {
  const { TrustLoanLiability } = getDb();

  const liability = await TrustLoanLiability.findOne({
    where: { loan_uuid: loanUuid, farmer_id: farmerId, is_active: true },
  });
  if (!liability) {
    const err = new Error('Loan not found');
    err.statusCode = 404;
    throw err;
  }

  const allowed = {
    lender_type: payload.lenderType,
    lender_name: payload.lenderName,
    loan_purpose: payload.loanPurpose,
    principal_inr: payload.principalInr,
    outstanding_inr: payload.outstandingInr,
    interest_rate_pct: payload.interestRatePct,
    tenure_months: payload.tenureMonths,
    emi_inr: payload.emiInr,
    emi_frequency: payload.emiFrequency,
    start_date: payload.startDate,
    end_date: payload.endDate,
    status: payload.status,
    is_secured: payload.isSecured,
    collateral_description: payload.collateralDescription,
    notes: payload.notes,
  };
  const update = {};
  for (const [k, v] of Object.entries(allowed)) {
    if (v !== undefined) update[k] = v;
  }
  await liability.update(update);

  await deleteKeys(`trust:score:${farmerId}`);
  return { loanUuid };
};

/**
 * Soft-deletes a loan liability.
 */
const deleteLiability = async (farmerId, loanUuid) => {
  const { TrustLoanLiability } = getDb();
  const liability = await TrustLoanLiability.findOne({
    where: { loan_uuid: loanUuid, farmer_id: farmerId, is_active: true },
  });
  if (!liability) {
    const err = new Error('Loan not found');
    err.statusCode = 404;
    throw err;
  }
  await liability.update({ is_active: false });
  await deleteKeys(`trust:score:${farmerId}`);
  return { loanUuid };
};

// ─── Loan Repayments ───────────────────────────────────────────────

/**
 * Lists repayments for a single loan (scoped to farmer).
 */
const listRepayments = async (farmerId, loanUuid) => {
  const { TrustLoanLiability, TrustLoanRepayment } = getDb();
  const liability = await TrustLoanLiability.findOne({
    where: { loan_uuid: loanUuid, farmer_id: farmerId, is_active: true },
  });
  if (!liability) {
    const err = new Error('Loan not found');
    err.statusCode = 404;
    throw err;
  }
  const repayments = await TrustLoanRepayment.findAll({
    where: { liability_id: liability.id, is_active: true },
    order: [['due_date', 'ASC']],
  });
  return repayments.map((r) => ({
    repaymentUuid: r.repayment_uuid,
    installmentNumber: r.installment_number,
    dueDate: r.due_date,
    dueAmountInr: parseFloat(r.due_amount_inr),
    paidDate: r.paid_date,
    paidAmountInr: r.paid_amount_inr ? parseFloat(r.paid_amount_inr) : null,
    status: r.status,
    daysLate: r.days_late,
    paymentChannel: r.payment_channel,
    referenceNumber: r.reference_number,
    notes: r.notes,
  }));
};

/**
 * Logs (creates or updates) a repayment installment for a loan.
 * Auto-derives status + days_late if paid_date is set.
 */
const logRepayment = async (farmerId, loanUuid, payload) => {
  const { TrustLoanLiability, TrustLoanRepayment } = getDb();
  const liability = await TrustLoanLiability.findOne({
    where: { loan_uuid: loanUuid, farmer_id: farmerId, is_active: true },
  });
  if (!liability) {
    const err = new Error('Loan not found');
    err.statusCode = 404;
    throw err;
  }

  // Derive status + days_late
  let status = payload.status || 'UPCOMING';
  let daysLate = null;
  if (payload.paidDate && payload.dueDate) {
    const due = new Date(payload.dueDate);
    const paid = new Date(payload.paidDate);
    daysLate = Math.max(0, Math.round((paid - due) / 86400000));
    const paidAmt = parseFloat(payload.paidAmountInr || 0);
    const dueAmt = parseFloat(payload.dueAmountInr || 0);
    if (paidAmt < dueAmt && paidAmt > 0) status = 'PARTIAL';
    else if (daysLate === 0) status = 'PAID_ONTIME';
    else status = 'PAID_LATE';
  } else if (!payload.paidDate && payload.dueDate) {
    const due = new Date(payload.dueDate);
    if (due < new Date()) status = 'MISSED';
  }

  const repayment = await TrustLoanRepayment.create({
    repayment_uuid: generateUUID(),
    liability_id: liability.id,
    farmer_id: farmerId,
    installment_number: payload.installmentNumber || null,
    due_date: payload.dueDate,
    due_amount_inr: payload.dueAmountInr,
    paid_date: payload.paidDate || null,
    paid_amount_inr: payload.paidAmountInr || null,
    status,
    days_late: daysLate,
    payment_channel: payload.paymentChannel || null,
    reference_number: payload.referenceNumber || null,
    notes: payload.notes || null,
    is_active: true,
  });

  // Auto-decrement outstanding if a payment landed
  if (payload.paidAmountInr && parseFloat(payload.paidAmountInr) > 0) {
    const newOutstanding = Math.max(
      0,
      parseFloat(liability.outstanding_inr) - parseFloat(payload.paidAmountInr),
    );
    await liability.update({
      outstanding_inr: newOutstanding,
      status: newOutstanding === 0 ? 'CLOSED' : liability.status,
    });
  }

  await deleteKeys(`trust:score:${farmerId}`);
  return { repaymentUuid: repayment.repayment_uuid, status, daysLate };
};

// ─── Household Expenses ───────────────────────────────────────────

const EXPENSE_FIELDS = [
  'food_inr', 'education_inr', 'health_inr', 'utilities_inr', 'transport_inr',
  'rent_inr', 'farm_inputs_inr', 'loan_emi_inr', 'savings_inr', 'other_inr',
];

const EXPENSE_PAYLOAD_KEYS = {
  foodInr: 'food_inr',
  educationInr: 'education_inr',
  healthInr: 'health_inr',
  utilitiesInr: 'utilities_inr',
  transportInr: 'transport_inr',
  rentInr: 'rent_inr',
  farmInputsInr: 'farm_inputs_inr',
  loanEmiInr: 'loan_emi_inr',
  savingsInr: 'savings_inr',
  otherInr: 'other_inr',
};

function expenseRowToDto(row) {
  if (!row) return null;
  return {
    expenseUuid: row.expense_uuid,
    referenceYear: row.reference_year,
    referenceMonth: row.reference_month,
    foodInr: parseFloat(row.food_inr),
    educationInr: parseFloat(row.education_inr),
    healthInr: parseFloat(row.health_inr),
    utilitiesInr: parseFloat(row.utilities_inr),
    transportInr: parseFloat(row.transport_inr),
    rentInr: parseFloat(row.rent_inr),
    farmInputsInr: parseFloat(row.farm_inputs_inr),
    loanEmiInr: parseFloat(row.loan_emi_inr),
    savingsInr: parseFloat(row.savings_inr),
    otherInr: parseFloat(row.other_inr),
    totalInr: parseFloat(row.total_inr),
    confidence: row.confidence,
    source: row.source,
    notes: row.notes,
  };
}

/**
 * Lists most-recent monthly expense snapshots for a farmer.
 */
const listExpenses = async (farmerId, opts = {}) => {
  const { TrustHouseholdExpense } = getDb();
  const limit = Math.min(parseInt(opts.limit, 10) || 12, 60);

  const rows = await TrustHouseholdExpense.findAll({
    where: { farmer_id: farmerId, is_active: true },
    order: [['reference_year', 'DESC'], ['reference_month', 'DESC']],
    limit,
  });
  return rows.map(expenseRowToDto);
};

/**
 * Returns the snapshot for the current calendar month, or null.
 */
const getCurrentMonthExpense = async (farmerId) => {
  const { TrustHouseholdExpense } = getDb();
  const now = new Date();
  const row = await TrustHouseholdExpense.findOne({
    where: {
      farmer_id: farmerId,
      reference_year: now.getFullYear(),
      reference_month: now.getMonth() + 1,
      is_active: true,
    },
  });
  return expenseRowToDto(row);
};

/**
 * Aggregates: 3-month average + 6-month average + current-month status.
 */
const getExpenseSummary = async (farmerId) => {
  const { TrustHouseholdExpense } = getDb();
  const rows = await TrustHouseholdExpense.findAll({
    where: { farmer_id: farmerId, is_active: true },
    order: [['reference_year', 'DESC'], ['reference_month', 'DESC']],
    limit: 6,
  });

  const dtos = rows.map(expenseRowToDto);
  const avg = (slice) =>
    slice.length === 0
      ? 0
      : Math.round(slice.reduce((s, r) => s + r.totalInr, 0) / slice.length);

  const now = new Date();
  const currentMonthLogged = dtos.some(
    (d) => d.referenceYear === now.getFullYear() && d.referenceMonth === now.getMonth() + 1,
  );

  return {
    monthsLogged: dtos.length,
    avgLast3MonthsInr: avg(dtos.slice(0, 3)),
    avgLast6MonthsInr: avg(dtos.slice(0, 6)),
    currentMonth: {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      logged: currentMonthLogged,
    },
    latest: dtos[0] || null,
  };
};

/**
 * Upserts a monthly expense snapshot. Computes total_inr server-side.
 */
const upsertMonthlyExpense = async (farmerId, payload) => {
  const { TrustHouseholdExpense } = getDb();

  const year = payload.referenceYear || new Date().getFullYear();
  const month = payload.referenceMonth || (new Date().getMonth() + 1);

  // Translate payload camelCase keys → snake_case columns and compute total
  const cols = {};
  for (const [k, dbCol] of Object.entries(EXPENSE_PAYLOAD_KEYS)) {
    if (payload[k] != null) cols[dbCol] = parseFloat(payload[k]) || 0;
  }
  const total = EXPENSE_FIELDS.reduce((s, f) => s + (parseFloat(cols[f] || 0)), 0);

  const existing = await TrustHouseholdExpense.findOne({
    where: { farmer_id: farmerId, reference_year: year, reference_month: month },
  });

  if (existing) {
    await existing.update({
      ...cols,
      total_inr: total,
      confidence: payload.confidence || existing.confidence,
      source: payload.source || existing.source,
      notes: payload.notes !== undefined ? payload.notes : existing.notes,
      is_active: true,
    });
  } else {
    await TrustHouseholdExpense.create({
      expense_uuid: generateUUID(),
      farmer_id: farmerId,
      reference_year: year,
      reference_month: month,
      food_inr: cols.food_inr || 0,
      education_inr: cols.education_inr || 0,
      health_inr: cols.health_inr || 0,
      utilities_inr: cols.utilities_inr || 0,
      transport_inr: cols.transport_inr || 0,
      rent_inr: cols.rent_inr || 0,
      farm_inputs_inr: cols.farm_inputs_inr || 0,
      loan_emi_inr: cols.loan_emi_inr || 0,
      savings_inr: cols.savings_inr || 0,
      other_inr: cols.other_inr || 0,
      total_inr: total,
      confidence: payload.confidence || 'MEDIUM',
      source: payload.source || 'FARMER_DECLARED',
      notes: payload.notes || null,
      is_active: true,
    });
  }

  await deleteKeys(`trust:score:${farmerId}`);
  logger.info(`Trust expense upserted: farmer ${farmerId}, ${year}-${month}, total ₹${total}`);

  return getExpenseSummary(farmerId);
};

// ═══════════════════════════════════════════════════════════════════
// TRUST v2 — Snapshot Compute, Read, Decision, Request-More-Data
// ═══════════════════════════════════════════════════════════════════

const crypto = require('crypto');
const { deriveDecision, deriveLegacyBand } = require('./decisionEngine');
const { rollupGroups } = require('./groupRollup');
const { scoreAllPillars, assertWeightsSum } = require('./pillarEngine');
const { collectForScoring, readForSnapshot, buildExternalEvidenceItems } = require('./evidenceCollector');
const { persist } = require('./snapshotPersister');
const { getCibilStatus } = require('./cibilBridge');
const { logEvent } = require('./auditLogger');
const trustCache = require('./cache');
const { PILLAR_CODE_BY_SECTION_CODE, STALE_DAYS, PILLAR_TO_TASK_TYPE, PILLAR_TO_REASON_CODE } = require('../constants');
const { getChannel } = require('../../../config/rabbitmq');
const config = require('../../../config');

/**
 * Normalises an inputs object for fingerprinting:
 * sort keys, strip nulls, round floats to 4 decimals.
 */
const normaliseForFingerprint = (obj) => {
  return JSON.stringify(obj, (key, value) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'number' && !Number.isInteger(value)) {
      return Math.round(value * 10000) / 10000;
    }
    return value;
  }, 0);
};

const computeFingerprint = (normalisedInputs) => {
  const json = normaliseForFingerprint(normalisedInputs);
  return crypto.createHash('sha256').update(json).digest('hex');
};

/**
 * Computes a full TRUST v2 snapshot for a farmer.
 * Steps 1-10 per B3 spec.
 *
 * @param {number} farmerId
 * @param {Object} [options]
 * @param {string} [options.reason]
 * @returns {Promise<Object>} Snapshot DTO or { status: 'INCOMPLETE', missingPillars }
 */
const computeSnapshot = async (farmerId, options = {}) => {
  const { reason } = options;

  // 1. Collect all evidence
  const evidenceData = await collectForScoring(farmerId);
  const { sections, bundle, aaAnalysis, rootsLand } = evidenceData;

  // Runtime weight assertion
  assertWeightsSum(sections);

  // 2-3. Score all pillars
  const { pillarResults, missingPillars } = scoreAllPillars(bundle);

  // 4. If mandatory pillars are MISSING → return incomplete
  if (missingPillars.length > 0) {
    return { status: 'INCOMPLETE', missingPillars };
  }

  // 5. Compute total_score_1000
  let totalScore1000 = 0;
  const sectionScoresJson = {};

  for (const section of sections) {
    const pillarCode = section.pillar_code || PILLAR_CODE_BY_SECTION_CODE[section.section_code];
    if (!pillarCode) continue;

    const result = pillarResults[pillarCode];
    const weight = parseFloat(section.weight_in_total_score) / 100; // fraction
    const contribution = Math.round(result.normalizedScore * weight * 10);
    totalScore1000 += contribution;

    sectionScoresJson[pillarCode] = {
      score: result.normalizedScore,
      weight,
      contribution,
      rawPoints: result.rawPoints,
      maxPoints: result.maxPossiblePoints,
    };
  }

  totalScore1000 = Math.min(1000, Math.max(0, Math.round(totalScore1000)));
  const legacyScore = Math.round(totalScore1000 / 10);

  // 6. Decision
  const decision = deriveDecision(totalScore1000);
  const legacyBand = deriveLegacyBand(totalScore1000);

  // 7. Fingerprint
  const cibil = await getCibilStatus(farmerId);
  const inputsFingerprint = computeFingerprint({
    pillarResults, cibil, farmerId,
  });

  // 8. Build external evidence items
  const externalEvidenceItems = buildExternalEvidenceItems(pillarResults, {
    aaAnalysis, rootsLand, cibil,
  });

  // 9. Persist (single transaction)
  const snapshot = await persist({
    farmerId, totalScore1000, legacyScore, legacyBand, decision,
    cibil, inputsFingerprint, sectionScoresJson, pillarResults,
    sections, externalEvidenceItems, reason,
  });

  // 10. Invalidate cache
  await trustCache.invalidateForFarmer(farmerId);

  // Build and return DTO
  return buildSnapshotDto(snapshot, sections, pillarResults, sectionScoresJson, cibil);
};

/**
 * Reads the latest active snapshot for a farmer.
 * Redis cache → DB fallback.
 */
const getLatestSnapshot = async (farmerId) => {
  // Redis check
  const cached = await trustCache.getSnapshot(farmerId);
  if (cached) return cached;

  const {
    TrustScoreHistory, TrustScoreCalculation, TrustSection,
  } = getDb();

  // Latest active snapshot
  const snapshot = await TrustScoreHistory.findOne({
    where: { farmer_id: farmerId, is_active: true },
    order: [['calculated_at', 'DESC']],
  });

  if (!snapshot) return null;

  // Per-pillar calculations
  const calculations = await TrustScoreCalculation.findAll({
    where: { farmer_id: farmerId, is_active: true },
    include: [{ model: TrustSection, as: 'section' }],
    order: [['section_id', 'ASC']],
  });

  // Build pillars array
  const pillars = calculations.map((calc) => ({
    code: calc.section?.pillar_code || PILLAR_CODE_BY_SECTION_CODE[calc.section?.section_code],
    name: calc.section?.section_name,
    weight: parseFloat(calc.section?.weight_in_total_score || 0) / 100,
    score: calc.normalized_score,
    rawPoints: calc.raw_points,
    maxPoints: calc.max_possible_points,
    contribution: parseFloat(calc.contribution_to_total),
  })).sort((a, b) => {
    const order = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];
    return order.indexOf(a.code) - order.indexOf(b.code);
  });

  // Groups from section_scores JSON
  const groups = rollupGroups(snapshot.section_scores);

  // Evidence union
  const evidence = await readForSnapshot(snapshot.id, farmerId);

  // Previous score + delta
  let previousScore = null;
  let delta = null;
  if (snapshot.previous_snapshot_id) {
    const prev = await TrustScoreHistory.findByPk(snapshot.previous_snapshot_id, {
      attributes: ['total_score_1000'],
    });
    if (prev) {
      previousScore = prev.total_score_1000;
      delta = (snapshot.total_score_1000 || 0) - previousScore;
    }
  }

  // Confidence
  const confidence = evidence.some((e) => e.source === 'AA' || e.source === 'CIBIL')
    ? 'HIGH'
    : evidence.length > 10 ? 'MEDIUM' : 'LOW';

  const dto = {
    snapshotUuid: snapshot.score_history_uuid,
    score: snapshot.total_score_1000,
    legacyScore: snapshot.total_trust_score,
    scoreBand: snapshot.score_band,
    decision: snapshot.decision,
    computedAt: snapshot.calculated_at,
    previousScore,
    delta,
    inputsFingerprint: snapshot.inputs_fingerprint,
    cibil: {
      flag: snapshot.cibil_flag,
      overdueInr: snapshot.cibil_overdue_inr ? parseFloat(snapshot.cibil_overdue_inr) : null,
      issuer: snapshot.cibil_overdue_issuer,
    },
    pillars,
    groups,
    evidence,
    confidence,
  };

  // Cache for 24h
  await trustCache.setSnapshot(farmerId, dto);

  return dto;
};

/**
 * Checks if a snapshot is stale (>30 days old).
 */
const isStale = (snapshot) => {
  if (!snapshot || !snapshot.computedAt) return true;
  const computedAt = new Date(snapshot.computedAt);
  const ageDays = (Date.now() - computedAt.getTime()) / (1000 * 60 * 60 * 24);
  return ageDays > STALE_DAYS;
};

/**
 * Records a banker decision on a snapshot.
 * Duplicate (score_history_id, banker_id) → 409 conflict.
 */
const recordDecision = async ({ snapshotUuid, bankerId, decision, reasonCode, reasonText, cibilAcknowledged }) => {
  const { TrustScoreHistory, TrustDecision } = getDb();

  // Resolve snapshot
  const snapshot = await TrustScoreHistory.findOne({
    where: { score_history_uuid: snapshotUuid, is_active: true },
  });
  if (!snapshot) {
    const err = new Error('Snapshot not found or no longer active');
    err.statusCode = 404;
    err.errorCode = 'TRUST_SNAPSHOT_NOT_FOUND';
    throw err;
  }

  // Check for duplicate
  const existing = await TrustDecision.findOne({
    where: { score_history_id: snapshot.id, banker_id: bankerId },
  });
  if (existing) {
    const err = new Error('Decision already recorded for this snapshot by this banker');
    err.statusCode = 409;
    err.errorCode = 'TRUST_DECISION_DUPLICATE';
    throw err;
  }

  // Compute integrity hash before insert. Auditors can recompute this from
  // the persisted fields; any mismatch (e.g. reason_text edited post-hoc by
  // a compromised operator) is detectable without relying on DB-level
  // audit triggers.
  const crypto = require('crypto');
  const decisionUuid = generateUUID();
  const createdIso = new Date().toISOString();
  const hashInput = [
    decisionUuid,
    snapshot.id,
    bankerId,
    decision,
    reasonCode || '',
    reasonText || '',
    createdIso,
  ].join('|');
  const decisionHash = crypto.createHash('sha256').update(hashInput).digest('hex');

  // Insert decision
  const decisionRow = await TrustDecision.create({
    decision_uuid: decisionUuid,
    score_history_id: snapshot.id,
    banker_id: bankerId,
    decision,
    reason_code: reasonCode || null,
    reason_text: reasonText || null,
    cibil_acknowledged: cibilAcknowledged || false,
    decision_hash: decisionHash,
  });

  // Audit
  await logEvent({
    farmerId: snapshot.farmer_id,
    actorType: 'BANKER',
    actorId: bankerId,
    action: 'DECISION_RECORDED',
    payload: { decision, reasonCode, snapshotUuid },
    scoreHistoryId: snapshot.id,
  });

  // On SANCTION, emit domain event
  if (decision === 'SANCTION') {
    try {
      const channel = await getChannel();
      if (channel) {
        channel.publish(
          config.rabbitmq.exchange,
          'trust.decision.sanction',
          Buffer.from(JSON.stringify({
            farmerId: snapshot.farmer_id,
            snapshotUuid,
            bankerId,
            scoredAt: snapshot.calculated_at,
          })),
        );
      }
    } catch (err) {
      logger.warn(`[TRUST/decision] RabbitMQ publish failed: ${err.message}`);
    }
  }

  // Invalidate portfolio cache
  await trustCache.invalidatePortfolio();

  return {
    decisionUuid: decisionRow.decision_uuid,
    snapshotUuid,
    decision,
    recordedAt: decisionRow.created_at,
  };
};

/**
 * Requests more data by creating Sathi tasks for missing pillars.
 */
const requestMoreData = async (farmerId, { missingPillars }) => {
  const { SathiTask } = getDb();

  const tasks = [];
  for (const pillarCode of missingPillars) {
    const task = await SathiTask.create({
      task_uuid: generateUUID(),
      farmer_id: farmerId,
      task_type: PILLAR_TO_TASK_TYPE[pillarCode] || 'FARMER_REQUESTED',
      reason_code: PILLAR_TO_REASON_CODE[pillarCode] || 'FARMER_REQUESTED',
      status: 'OPEN',
      requested_by: 'BANKER',
    });
    tasks.push({ taskUuid: task.task_uuid, pillarCode, taskType: task.task_type });
  }

  // Audit
  await logEvent({
    farmerId,
    actorType: 'BANKER',
    actorId: null,
    action: 'SATHI_TASK_REQUESTED',
    payload: { missingPillars, taskCount: tasks.length },
  });

  return tasks;
};

/**
 * Helper: builds the full snapshot DTO from raw data.
 */
const buildSnapshotDto = (snapshot, sections, pillarResults, sectionScoresJson, cibil) => {
  const pillars = sections
    .filter((s) => s.pillar_code)
    .map((s) => {
      const result = pillarResults[s.pillar_code] || {};
      return {
        code: s.pillar_code,
        name: s.section_name,
        weight: parseFloat(s.weight_in_total_score) / 100,
        score: result.normalizedScore || 0,
        rawPoints: result.rawPoints || 0,
        maxPoints: result.maxPossiblePoints || 0,
        contribution: sectionScoresJson[s.pillar_code]?.contribution || 0,
      };
    })
    .sort((a, b) => {
      const order = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];
      return order.indexOf(a.code) - order.indexOf(b.code);
    });

  const groups = rollupGroups(sectionScoresJson);

  return {
    snapshotUuid: snapshot.score_history_uuid,
    score: snapshot.total_score_1000,
    legacyScore: snapshot.total_trust_score,
    scoreBand: snapshot.score_band,
    decision: snapshot.decision,
    computedAt: snapshot.calculated_at,
    previousScore: null,
    delta: null,
    inputsFingerprint: snapshot.inputs_fingerprint,
    cibil: {
      flag: cibil.flag,
      overdueInr: cibil.overdueInr,
      issuer: cibil.issuer,
    },
    pillars,
    groups,
    evidence: [],
    confidence: 'MEDIUM',
  };
};

module.exports = {
  getSections, getSectionQuestions, saveResponses, getProgress,
  getScore, getScoreHistory, submitAppeal, getAppeal, getAppealsAdmin,
  getActivities, upsertActivities, getHome,
  listLiabilities, createLiability, updateLiability, deleteLiability,
  listRepayments, logRepayment,
  listExpenses, getCurrentMonthExpense, getExpenseSummary, upsertMonthlyExpense,
  getLeverage,
  // TRUST v2
  computeSnapshot,
  getLatestSnapshot,
  isStale,
  recordDecision,
  requestMoreData,
};
