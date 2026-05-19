/**
 * Trust Integration Tests
 * Full journey: answer questions → calculate score → view history → appeal
 */

const { initApp, getAgent, truncateTables, closeConnections } = require('../helpers/setup');
const { createTestUser, createTestTrustSection } = require('../helpers/factories');

let agent, farmerToken, farmerId, section, question, choices;

beforeAll(async () => {
  await initApp();
  agent = getAgent();
  const { token, user } = await createTestUser();
  farmerToken = token;
  farmerId = user.id;
  const trustData = await createTestTrustSection();
  section = trustData.section;
  question = trustData.question;
  choices = trustData.choices;
});

afterAll(async () => {
  await truncateTables([
    'trust_score_appeals', 'trust_score_histories', 'trust_score_calculations',
    'trust_section_progress', 'trust_response_choices', 'trust_response_numerics',
    'trust_responses', 'trust_question_choices', 'trust_question_conditions',
    'trust_text_input_scoring_ranges', 'trust_questions', 'trust_sections', 'users',
  ]);
  await closeConnections();
});

describe('Trust Integration', () => {
  // ─── Get Sections ─────────────────────────────────────────────

  describe('GET /api/v1/trust/sections', () => {
    it('should return available trust sections', async () => {
      const res = await agent
        .get('/api/v1/trust/sections')
        .set('Authorization', `Bearer ${farmerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ─── Get Questions for Section ────────────────────────────────

  describe('GET /api/v1/trust/sections/:sectionId/questions', () => {
    it('should return questions with choices', async () => {
      const res = await agent
        .get(`/api/v1/trust/sections/${section.id}/questions`)
        .set('Authorization', `Bearer ${farmerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ─── Submit Response ──────────────────────────────────────────

  describe('POST /api/v1/trust/responses', () => {
    it('should submit trust questionnaire response', async () => {
      const res = await agent
        .post('/api/v1/trust/responses')
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({
          sectionId: section.id,
          responses: [
            { questionId: question.id, choiceId: choices[0].id },
          ],
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
    });
  });

  // ─── Calculate Score ──────────────────────────────────────────

  describe('POST /api/v1/trust/calculate', () => {
    it('should calculate trust score', async () => {
      const res = await agent
        .post('/api/v1/trust/calculate')
        .set('Authorization', `Bearer ${farmerToken}`);

      expect([200, 201]).toContain(res.status);
      if (res.body.data) {
        expect(res.body.data).toHaveProperty('totalScore');
      }
    });
  });

  // ─── View Score History ───────────────────────────────────────

  describe('GET /api/v1/trust/score/history', () => {
    it('should return score history', async () => {
      const res = await agent
        .get('/api/v1/trust/score/history')
        .set('Authorization', `Bearer ${farmerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ─── Submit Appeal ────────────────────────────────────────────

  describe('POST /api/v1/trust/appeals', () => {
    it('should submit a trust score appeal', async () => {
      const res = await agent
        .post('/api/v1/trust/appeals')
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({ reason: 'I have additional land documents' });

      expect([200, 201, 400]).toContain(res.status);
    });
  });
});
