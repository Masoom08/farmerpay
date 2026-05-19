/**
 * Seed extension questions into the existing TRUST sections.
 *
 * "One name, one number" — instead of creating a parallel "livelihood" set
 * of sections, we ENRICH the existing 6 trust sections with profile-style
 * questions that:
 *   - capture the farmer's persona (household, land, schemes, goals)
 *   - directly contribute to the TRUST score via points_awarded
 *
 * Mapping of new questions → existing sections:
 *   PERSONAL_PROFILE   → household / family / education / primary income
 *   FARM_DETAILS       → land tenure / parcels / irrigation / soil
 *   FINANCIAL_LITERACY → KCC / PMFBY / PMJJBY / PMSBY / PM-KISAN
 *   REPAYMENT_CAPACITY → safety buffer / risk tolerance / top worry
 *   NETWORK_REFERENCES → FPO / cooperative membership / community goal
 *
 * Idempotent: skips a question if (section, exact text) already exists.
 *
 * Usage: node scripts/seedTrustProfileExtensions.js
 */

/* eslint-disable no-console */
const path = require('path');
process.chdir(path.join(__dirname, '..'));

const { v4: uuidv4 } = require('uuid');
const db = require('../src/shared/models');

// Each question contributes meaningful points so completing them visibly raises the score.
const EXTENSIONS = {
  PERSONAL_PROFILE: [
    {
      text: 'How many family members live in your household?',
      type: 'numeric_input', unit: 'persons', min: 1, max: 30,
    },
    {
      text: 'How many dependents (elderly / non-earning) do you support?',
      type: 'numeric_input', unit: 'persons', min: 0, max: 15,
    },
    {
      text: 'What is your highest level of education?',
      type: 'multiple_choice',
      choices: [
        { text: 'Illiterate', points: 2 },
        { text: 'Primary', points: 4 },
        { text: 'Secondary', points: 6 },
        { text: 'Higher Secondary', points: 8 },
        { text: 'Diploma', points: 9 },
        { text: 'Graduate', points: 10 },
        { text: 'Post Graduate', points: 10 },
      ],
    },
    {
      text: 'What is your primary source of household income?',
      type: 'multiple_choice',
      choices: [
        { text: 'Farming', points: 8 },
        { text: 'Dairy', points: 9 },
        { text: 'Fishery', points: 9 },
        { text: 'Daily Labour', points: 4 },
        { text: 'Salaried Job', points: 10 },
        { text: 'Small Business', points: 9 },
        { text: 'Other', points: 5 },
      ],
    },
  ],

  FARM_DETAILS: [
    {
      text: 'How is your farmland held?',
      type: 'multiple_choice',
      choices: [
        { text: 'Owned', points: 12 },
        { text: 'Leased', points: 6 },
        { text: 'Shared', points: 5 },
        { text: 'Govt Allotted', points: 9 },
        { text: 'Mixed', points: 8 },
      ],
    },
    {
      text: 'How many separate land parcels do you cultivate?',
      type: 'numeric_input', unit: 'parcels', min: 0, max: 50,
    },
    {
      text: 'Do you have any source of irrigation?',
      type: 'yes_no',
      choices: [
        { text: 'Yes', points: 12 },
        { text: 'No', points: 0 },
      ],
    },
    {
      text: 'What is your main irrigation source?',
      type: 'multiple_choice',
      choices: [
        { text: 'Rainfed', points: 3 },
        { text: 'Borewell', points: 10 },
        { text: 'Open Well', points: 8 },
        { text: 'Canal', points: 12 },
        { text: 'River', points: 11 },
        { text: 'Pond', points: 9 },
        { text: 'Other', points: 5 },
      ],
    },
    {
      text: 'What is the main soil type of your land?',
      type: 'multiple_choice',
      choices: [
        { text: 'Black', points: 8 },
        { text: 'Red', points: 7 },
        { text: 'Alluvial', points: 9 },
        { text: 'Sandy', points: 5 },
        { text: 'Loamy', points: 9 },
        { text: 'Clay', points: 6 },
        { text: "Don't know", points: 2 },
      ],
    },
  ],

  FINANCIAL_LITERACY: [
    {
      text: 'Do you have a Kisan Credit Card (KCC)?',
      type: 'yes_no',
      choices: [{ text: 'Yes', points: 12 }, { text: 'No', points: 0 }],
    },
    {
      text: 'Are you enrolled in PMFBY (crop insurance)?',
      type: 'yes_no',
      choices: [{ text: 'Yes', points: 10 }, { text: 'No', points: 0 }],
    },
    {
      text: 'Are you enrolled in PMJJBY (life insurance)?',
      type: 'yes_no',
      choices: [{ text: 'Yes', points: 6 }, { text: 'No', points: 0 }],
    },
    {
      text: 'Are you enrolled in PMSBY (accident insurance)?',
      type: 'yes_no',
      choices: [{ text: 'Yes', points: 6 }, { text: 'No', points: 0 }],
    },
    {
      text: 'Do you receive PM-KISAN payments?',
      type: 'yes_no',
      choices: [{ text: 'Yes', points: 6 }, { text: 'No', points: 0 }],
    },
  ],

  REPAYMENT_CAPACITY: [
    {
      text: 'If a bad season cuts your income by 30%, can you still cover essentials for 3 months?',
      type: 'yes_no',
      choices: [{ text: 'Yes', points: 15 }, { text: 'No', points: 0 }],
    },
    {
      text: 'How comfortable are you taking new loans?',
      type: 'multiple_choice',
      choices: [
        { text: 'Very uncomfortable', points: 6 },
        { text: 'Cautious', points: 12 },
        { text: 'Comfortable', points: 10 },
        { text: 'Very comfortable', points: 4 },
      ],
    },
    {
      text: 'What worries you the most about farming?',
      type: 'multiple_choice',
      choices: [
        { text: 'Weather/drought', points: 6 },
        { text: 'Pest/disease', points: 6 },
        { text: 'Falling prices', points: 6 },
        { text: 'Loan repayment', points: 8 },
        { text: 'Rising input costs', points: 6 },
        { text: 'Labour shortage', points: 6 },
        { text: 'Health/family', points: 6 },
      ],
    },
  ],

  NETWORK_REFERENCES: [
    {
      text: 'Are you a member of any FPO / cooperative?',
      type: 'yes_no',
      choices: [{ text: 'Yes', points: 12 }, { text: 'No', points: 0 }],
    },
    {
      text: 'What is your most important goal in the next 3 years?',
      type: 'multiple_choice',
      choices: [
        { text: "Children's education", points: 8 },
        { text: 'Buy more land', points: 7 },
        { text: 'Build/repair house', points: 6 },
        { text: 'Buy livestock', points: 7 },
        { text: "Daughter's marriage", points: 5 },
        { text: 'Pay off debt', points: 9 },
        { text: 'Start business', points: 7 },
        { text: 'Other', points: 4 },
      ],
    },
  ],
};

(async () => {
  try {
    const { TrustSection, TrustQuestion, TrustQuestionChoice } = db;

    let totalQ = 0, totalC = 0, skipped = 0;

    for (const [sectionCode, questions] of Object.entries(EXTENSIONS)) {
      const section = await TrustSection.findOne({ where: { section_code: sectionCode } });
      if (!section) {
        console.warn(`⚠ Section ${sectionCode} not found — skipping ${questions.length} questions`);
        continue;
      }

      console.log(`→ Section ${sectionCode} (id=${section.id})`);

      for (const q of questions) {
        const existing = await TrustQuestion.findOne({
          where: { section_id: section.id, question_text: q.text },
        });

        if (existing) {
          skipped++;
          continue;
        }

        const question = await TrustQuestion.create({
          question_uuid: uuidv4(),
          section_id: section.id,
          question_text: q.text,
          question_type: q.type,
          required_answer_type: q.type === 'numeric_input'
            ? 'number'
            : q.type === 'yes_no'
              ? 'boolean'
              : 'choice',
          min_value: q.min || null,
          max_value: q.max || null,
          unit_of_measurement: q.unit || null,
          is_active: true,
        });
        totalQ++;

        if (q.choices && q.choices.length) {
          for (let i = 0; i < q.choices.length; i++) {
            const ch = q.choices[i];
            await TrustQuestionChoice.create({
              question_id: question.id,
              choice_text: ch.text,
              choice_value: ch.text.toUpperCase().replace(/[^A-Z0-9]+/g, '_'),
              choice_order: i + 1,
              points_awarded: ch.points || 0,
              is_active: true,
            });
            totalC++;
          }
        }
      }

      console.log(`   ✓ done`);
    }

    console.log(`\n✅ Trust profile extension seeded.`);
    console.log(`   New questions: ${totalQ}`);
    console.log(`   New choices  : ${totalC}`);
    console.log(`   Skipped (already present): ${skipped}`);
    console.log(`\nNext step: node scripts/recalcTrustScores.js   (refresh existing farmers' scores)`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
})();
