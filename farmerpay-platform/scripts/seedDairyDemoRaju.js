/**
 * Seed demo dairy data for Raju Gowda (farmer_id=12).
 * Exercises the v2 service layer end-to-end:
 *  - Creates MEDIUM-tier dairy profile
 *  - Adds 3 animals (Ganga lactating, Yamuna pregnant heifer, Krishna bull)
 *  - Logs 2 weeks of herd-level feed/fodder/labor costs
 *  - Logs per-animal vet treatment for Ganga
 *  - Logs a breeding attempt (AI) for Yamuna
 *  - Logs 2 weeks of milk sales (with fat/snf)
 *  - Creates a recurring monthly labor template
 *
 * Usage: node scripts/seedDairyDemoRaju.js
 * Idempotent: skips animals if profile already exists with >=3 animals.
 */

/* eslint-disable no-console */
const path = require('path');
process.chdir(path.join(__dirname, '..'));

const RAJU_ID = 12;

const profileService = require('../src/modules/roots/dairy/services/dairyProfileService');
const animalService = require('../src/modules/roots/dairy/services/dairyAnimalV2Service');
const costService = require('../src/modules/roots/dairy/services/dairyCostEventService');
const revenueService = require('../src/modules/roots/dairy/services/dairyRevenueEventService');
const breedingService = require('../src/modules/roots/dairy/services/dairyBreedingEventService');
const treatmentService = require('../src/modules/roots/dairy/services/dairyTreatmentEventService');
const recurringService = require('../src/modules/roots/dairy/services/dairyRecurringService');
const pnlService = require('../src/modules/roots/dairy/services/dairyPnlService');

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

(async () => {
  try {
    console.log('→ Upserting dairy profile...');
    await profileService.upsertProfile(RAJU_ID, {
      herdTier: 'MEDIUM',
      cooperativeName: 'KMF Bangalore Dairy Union',
      cooperativeMemberId: 'KMF-BLR-44821',
      defaultPaymentMode: 'CASH',
      currency: 'INR',
    });

    const existing = await animalService.listAnimals(RAJU_ID);
    let ganga, yamuna, krishna;

    if (existing.length >= 3) {
      console.log(`  (already have ${existing.length} animals — reusing)`);
      ganga = existing.find((a) => a.name === 'Ganga') || existing[0];
      yamuna = existing.find((a) => a.name === 'Yamuna') || existing[1];
      krishna = existing.find((a) => a.name === 'Krishna') || existing[2];
    } else {
      console.log('→ Adding 3 animals...');
      ganga = await animalService.addAnimal(RAJU_ID, {
        tagNumber: 'RG-001',
        name: 'Ganga',
        species: 'CATTLE',
        breedCode: 'HF_CROSS',
        gender: 'FEMALE',
        dateOfBirth: '2022-03-15',
        purchaseDate: '2024-08-10',
        purchaseCost: 65000,
        purchaseCostFormal: 50000,
        purchaseCostInformal: 15000,
        paymentMode: 'CASH',
        purchaseSource: 'Mandya cattle fair',
        acquisitionMode: 'PURCHASED',
        lifecycleStage: 'PEAK_LACTATION',
        notes: 'High yielder, ~12L/day',
      });
      yamuna = await animalService.addAnimal(RAJU_ID, {
        tagNumber: 'RG-002',
        name: 'Yamuna',
        species: 'CATTLE',
        breedCode: 'JERSEY_CROSS',
        gender: 'FEMALE',
        dateOfBirth: '2023-01-20',
        purchaseDate: '2024-11-02',
        purchaseCost: 45000,
        paymentMode: 'BANK',
        acquisitionMode: 'PURCHASED',
        lifecycleStage: 'PREGNANT',
      });
      krishna = await animalService.addAnimal(RAJU_ID, {
        tagNumber: 'RG-003',
        name: 'Krishna',
        species: 'BUFFALO',
        breedCode: 'MURRAH',
        gender: 'FEMALE',
        dateOfBirth: '2021-07-10',
        purchaseDate: '2024-02-15',
        purchaseCost: 85000,
        paymentMode: 'CASH',
        acquisitionMode: 'PURCHASED',
        lifecycleStage: 'PEAK_LACTATION',
        notes: '7L/day, high fat %',
      });
    }

    console.log('→ Logging 14 days of herd-level feed/fodder/labor costs...');
    for (let i = 13; i >= 0; i -= 1) {
      const d = daysAgo(i);
      await costService.createCostEvent(RAJU_ID, {
        eventDate: d,
        scope: 'HERD',
        category: 'FEED',
        quantity: 12,
        unit: 'kg',
        unitPrice: 32,
        amount: 384,
        amountFormal: 384,
        paymentMode: 'CASH',
        vendorName: 'Local agri store',
      });
      await costService.createCostEvent(RAJU_ID, {
        eventDate: d,
        scope: 'HERD',
        category: 'FODDER',
        quantity: 40,
        unit: 'kg',
        amount: 200,
        amountFormal: 200,
        paymentMode: 'CASH',
      });
      if (i % 7 === 0) {
        await costService.createCostEvent(RAJU_ID, {
          eventDate: d,
          scope: 'HERD',
          category: 'LABOR',
          amount: 700,
          amountFormal: 0,
          amountInformal: 700,
          paymentMode: 'CASH',
          notes: 'Weekly labor to Manjappa',
        });
      }
    }

    console.log('→ Logging per-animal vet treatment for Ganga...');
    await treatmentService.createTreatmentEvent(RAJU_ID, {
      animalId: ganga.animal_uuid,
      treatmentDate: daysAgo(5),
      condition: 'Mild mastitis',
      treatmentType: 'MASTITIS',
      vetName: 'Dr Basavaraj',
      vetType: 'PRIVATE',
      medicineCost: 420,
      vetFee: 300,
      otherCost: 50,
      costFormal: 420,
      costInformal: 350,
      paymentMode: 'CASH',
      outcome: 'RECOVERED',
    });

    console.log('→ Logging AI breeding for Yamuna...');
    await breedingService.createBreedingEvent(RAJU_ID, {
      animalId: yamuna.animal_uuid,
      serviceType: 'AI',
      aiDate: daysAgo(10),
      bullCode: 'HF-2301',
      breedUsed: 'HOLSTEIN_FRIESIAN',
      serviceProvider: 'KMF Cooperative',
      serviceProviderType: 'COOP_INSEMINATOR',
      serviceCharge: 250,
      transportCost: 50,
      gratuityCost: 100,
      costFormal: 250,
      costInformal: 150,
      paymentMode: 'CASH',
    });

    console.log('→ Logging 14 days of milk sales (cooperative)...');
    for (let i = 13; i >= 0; i -= 1) {
      const d = daysAgo(i);
      // Ganga
      await revenueService.createRevenueEvent(RAJU_ID, {
        eventDate: d,
        scope: 'ANIMAL',
        animalId: ganga.animal_uuid,
        category: 'MILK_SALE_COOP',
        quantityLiters: 12,
        fatPct: 4.2,
        snfPct: 8.6,
        ratePerLiter: 34,
        payerName: 'KMF',
      });
      // Krishna (buffalo, higher fat)
      await revenueService.createRevenueEvent(RAJU_ID, {
        eventDate: d,
        scope: 'ANIMAL',
        animalId: krishna.animal_uuid,
        category: 'MILK_SALE_COOP',
        quantityLiters: 7,
        fatPct: 7.1,
        snfPct: 9.2,
        ratePerLiter: 48,
        payerName: 'KMF',
      });
    }

    console.log('→ Creating recurring monthly labor template...');
    const templates = await recurringService.listTemplates(RAJU_ID);
    if (!templates.some((t) => t.template_name === 'Monthly labor wage')) {
      await recurringService.createTemplate(RAJU_ID, {
        templateName: 'Monthly labor wage',
        category: 'LABOR',
        defaultAmount: 4500,
        frequency: 'MONTHLY',
        dayOfPeriod: 1,
        nextDueDate: daysAgo(-1), // tomorrow
        defaultPaymentMode: 'CASH',
        defaultVendor: 'Manjappa',
      });
    }

    console.log('\n→ Computing herd P&L (last 14 days)...');
    const herdPnl = await pnlService.getHerdPnl(RAJU_ID, daysAgo(14), daysAgo(0));
    console.log(JSON.stringify(herdPnl, null, 2));

    console.log('\n→ Computing per-animal P&L (last 14 days)...');
    const perAnimal = await pnlService.getPerAnimalPnl(RAJU_ID, daysAgo(14), daysAgo(0));
    console.log(JSON.stringify(perAnimal, null, 2));

    console.log('\n✔ Seed complete.');
    process.exit(0);
  } catch (err) {
    console.error('✘ Seed failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
