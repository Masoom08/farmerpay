/**
 * Seed demo fishery data for Raju Gowda (farmer_id=12).
 * Exercises the v2 fishery service layer end-to-end to make Raju a
 * triple-income demo farmer (crop + dairy + fishery).
 *
 * Exercises:
 *  - BOTH operation_type profile (both inland + sea) to cover all P&L paths
 *  - 2 inland ponds (Rohu + Catla) with construction cost → POND_CONSTRUCTION
 *  - 1 sea vessel (mechanized boat) with purchase cost → VESSEL_PURCHASE
 *  - Stocking → auto FINGERLINGS cost + pond cycle markers
 *  - 14 days of herd/farm-level feed/labor/aeration costs
 *  - Pond-level treatment event
 *  - 3 sea trips with fuel/ice/crew/landing sale (sea P&L via trips)
 *  - Partial harvest from Rohu pond with sale
 *  - Recurring daily feed template
 *  - Weekly summary finalize (bulk entry path)
 *  - Computes all 4 P&L views
 *
 * Usage: node scripts/seedFisheryDemoRaju.js
 * Idempotent where possible (profile upsert; checks for existing ponds/vessels).
 */

/* eslint-disable no-console */
const path = require('path');
process.chdir(path.join(__dirname, '..'));

const RAJU_ID = 12;

const profileService = require('../src/modules/roots/fishery/services/fisheryProfileService');
const pondService = require('../src/modules/roots/fishery/services/fisheryPondV2Service');
const vesselService = require('../src/modules/roots/fishery/services/fisheryVesselService');
const costService = require('../src/modules/roots/fishery/services/fisheryCostEventService');
const revenueService = require('../src/modules/roots/fishery/services/fisheryRevenueEventService');
const stockingService = require('../src/modules/roots/fishery/services/fisheryStockingService');
const harvestService = require('../src/modules/roots/fishery/services/fisheryHarvestService');
const tripService = require('../src/modules/roots/fishery/services/fisheryTripService');
const treatmentService = require('../src/modules/roots/fishery/services/fisheryTreatmentService');
const recurringService = require('../src/modules/roots/fishery/services/fisheryRecurringService');
const weeklyService = require('../src/modules/roots/fishery/services/fisheryWeeklySummaryService');
const pnlService = require('../src/modules/roots/fishery/services/fisheryPnlService');

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

(async () => {
  try {
    console.log('→ Upserting fishery profile (BOTH operation)...');
    await profileService.upsertProfile(RAJU_ID, {
      operationType: 'BOTH',
      tier: 'MEDIUM',
      cooperativeName: 'Karnataka Fisheries Federation',
      cooperativeMemberId: 'KFF-MYS-1082',
      primaryMarket: 'Mysuru wholesale fish market',
      defaultPaymentMode: 'CASH',
      currency: 'INR',
    });

    // ── Inland ponds ──
    const existingPonds = await pondService.listPonds(RAJU_ID);
    let rohuPond, catlaPond;
    if (existingPonds.length >= 2) {
      console.log(`  (already have ${existingPonds.length} ponds — reusing)`);
      rohuPond = existingPonds.find((p) => p.pond_name === 'Rohu Pond 1') || existingPonds[0];
      catlaPond = existingPonds.find((p) => p.pond_name === 'Catla Pond 2') || existingPonds[1];
    } else {
      console.log('→ Adding 2 inland ponds...');
      rohuPond = await pondService.addPond(RAJU_ID, {
        pondName: 'Rohu Pond 1',
        pondAreaHectares: 1.2,
        pondDepthMeters: 2.5,
        waterSource: 'canal',
        currentCycleStartDate: daysAgo(90),
        currentSpecies: 'Rohu',
        expectedHarvestDate: daysAgo(-60),
        constructionDate: daysAgo(400),
        constructionCost: 85000,
        constructionCostFormal: 50000,
        constructionCostInformal: 35000,
        paymentMode: 'CASH',
        notes: 'First pond — Rohu monoculture',
      });
      catlaPond = await pondService.addPond(RAJU_ID, {
        pondName: 'Catla Pond 2',
        pondAreaHectares: 0.8,
        pondDepthMeters: 2.2,
        waterSource: 'groundwater',
        currentCycleStartDate: daysAgo(60),
        currentSpecies: 'Catla',
        expectedHarvestDate: daysAgo(-90),
        constructionDate: daysAgo(180),
        constructionCost: 55000,
        paymentMode: 'CASH',
      });
    }

    // ── Sea vessel ──
    const existingVessels = await vesselService.listVessels(RAJU_ID);
    let vessel;
    if (existingVessels.length >= 1) {
      console.log(`  (already have ${existingVessels.length} vessel(s) — reusing)`);
      vessel = existingVessels[0];
    } else {
      console.log('→ Adding sea vessel...');
      vessel = await vesselService.addVessel(RAJU_ID, {
        vesselName: 'Ganga Matha',
        registrationNumber: 'KA-MYS-FSH-4421',
        vesselType: 'MECHANIZED_BOAT',
        lengthMeters: 9.5,
        engineHp: 75,
        fuelType: 'DIESEL',
        crewSize: 4,
        homePort: 'Mangalore',
        purchaseDate: daysAgo(600),
        purchaseCost: 480000,
        purchaseCostFormal: 300000,
        purchaseCostInformal: 180000,
        paymentMode: 'BANK',
        acquisitionMode: 'PURCHASED',
        notes: 'Mechanized fiber boat, coastal fishing',
      });
    }

    // ── Stocking event (Rohu pond) ──
    console.log('→ Logging stocking event for Rohu pond...');
    await stockingService.createStockingEvent(RAJU_ID, {
      pondId: rohuPond.pond_uuid,
      stockingDate: daysAgo(90),
      speciesName: 'Rohu',
      speciesType: 'ROHU',
      fingerlingsCount: 8000,
      costPerFingerling: 1.5,
      costFormal: 8000,
      costInformal: 4000,
      paymentMode: 'CASH',
      supplierName: 'Mysuru fingerlings hatchery',
      expectedSurvivalRate: 70,
      expectedHarvestDate: daysAgo(-60),
    });

    // ── 14 days of farm-level feed/labor/aeration costs ──
    console.log('→ Logging 14 days of farm-level feed/labor/aeration costs...');
    for (let i = 13; i >= 0; i -= 1) {
      const d = daysAgo(i);
      await costService.createCostEvent(RAJU_ID, {
        eventDate: d,
        scope: 'FARM',
        category: 'FEED',
        quantity: 25,
        unit: 'kg',
        unitPrice: 42,
        amount: 1050,
        amountFormal: 1050,
        paymentMode: 'CASH',
        vendorName: 'Aqua feed supplier',
      });
      if (i % 7 === 0) {
        await costService.createCostEvent(RAJU_ID, {
          eventDate: d,
          scope: 'FARM',
          category: 'LABOR',
          amount: 900,
          amountFormal: 0,
          amountInformal: 900,
          paymentMode: 'CASH',
          notes: 'Weekly pond labor',
        });
        await costService.createCostEvent(RAJU_ID, {
          eventDate: d,
          scope: 'POND',
          pondId: rohuPond.pond_uuid,
          category: 'AERATION_ELECTRICITY',
          amount: 450,
          amountFormal: 450,
          paymentMode: 'BANK',
        });
      }
    }

    // ── Treatment event (Catla pond) ──
    console.log('→ Logging pond treatment event for Catla pond...');
    await treatmentService.createTreatmentEvent(RAJU_ID, {
      pondId: catlaPond.pond_uuid,
      treatmentDate: daysAgo(4),
      condition: 'White spot disease outbreak',
      treatmentType: 'DISEASE_TREATMENT',
      affectedSpecies: 'Catla',
      mortalityBeforePct: 8,
      mortalityAfterPct: 2,
      vetName: 'Dr Prakash (fisheries extension)',
      vetType: 'GOVT',
      medicineCost: 1200,
      vetFee: 500,
      otherCost: 200,
      costFormal: 1200,
      costInformal: 700,
      paymentMode: 'CASH',
      outcome: 'RECOVERED',
    });

    // ── 3 sea trips ──
    console.log('→ Logging 3 sea trips...');
    const trips = [
      { depart: daysAgo(12), ret: daysAgo(11), fuel: 4200, ice: 800, crew: 3200, catch: 180, sale: 36000 },
      { depart: daysAgo(7), ret: daysAgo(6), fuel: 4500, ice: 900, crew: 3200, catch: 210, sale: 42000 },
      { depart: daysAgo(2), ret: daysAgo(1), fuel: 4100, ice: 850, crew: 3200, catch: 165, sale: 33000 },
    ];
    for (const t of trips) {
      await tripService.createTrip(RAJU_ID, {
        vesselId: vessel.vessel_uuid,
        departDate: t.depart,
        returnDate: t.ret,
        fuelLiters: t.fuel / 95,
        fuelCost: t.fuel,
        iceKg: 100,
        iceCost: t.ice,
        baitCost: 400,
        crewCount: 4,
        crewWagesTotal: t.crew,
        otherCost: 200,
        catchTotalKg: t.catch,
        catchSpeciesMix: [
          { species: 'Mackerel', kg: t.catch * 0.55 },
          { species: 'Sardine', kg: t.catch * 0.30 },
          { species: 'Pomfret', kg: t.catch * 0.15 },
        ],
        landingPort: 'Mangalore auction hall',
        saleAmount: t.sale,
        saleBuyer: 'Mangalore wholesale buyer',
        saleBuyerType: 'AUCTION',
        auctionCommission: t.sale * 0.05,
        paymentMode: 'CASH',
        status: 'COMPLETED',
      });
    }

    // ── Partial harvest from Rohu pond ──
    console.log('→ Logging partial harvest from Rohu pond...');
    await harvestService.createHarvestEvent(RAJU_ID, {
      pondId: rohuPond.pond_uuid,
      harvestDate: daysAgo(3),
      totalKg: 450,
      avgWeightGrams: 850,
      survivalPct: null,
      harvestMethod: 'PARTIAL_HARVEST',
      laborCost: 1200,
      saleAmount: 58500,
      ratePerKg: 130,
      species: 'Rohu',
      saleCategory: 'FISH_SALE_WHOLESALE',
      buyerName: 'Mysuru wholesale fish market',
      buyerType: 'WHOLESALER',
      paymentMode: 'CASH',
    });

    // ── Recurring daily feed template ──
    console.log('→ Creating recurring daily feed template...');
    const templates = await recurringService.listTemplates(RAJU_ID);
    if (!templates.some((t) => t.template_name === 'Daily aqua feed')) {
      await recurringService.createTemplate(RAJU_ID, {
        templateName: 'Daily aqua feed',
        scope: 'FARM',
        category: 'FEED',
        defaultAmount: 1050,
        defaultQuantity: 25,
        defaultUnit: 'kg',
        defaultVendor: 'Aqua feed supplier',
        defaultPaymentMode: 'CASH',
        frequency: 'DAILY',
        nextDueDate: daysAgo(-1),
      });
    }

    // ── Weekly summary finalize (bulk entry demo) ──
    console.log('→ Creating + finalizing a weekly summary...');
    const existingSummaries = await weeklyService.listWeeklySummaries(RAJU_ID);
    const hasFinalized = existingSummaries.some((s) => s.is_finalized);
    if (!hasFinalized) {
      const summary = await weeklyService.upsertWeeklySummary(RAJU_ID, {
        weekStartDate: daysAgo(30),
        weekEndDate: daysAgo(24),
        totalFeedCost: 7200,
        totalAerationCost: 1400,
        totalPondLaborCost: 1800,
        totalFuelCost: 8500,
        totalIceCost: 1700,
        totalCrewWages: 6400,
        totalFishKg: 380,
        totalFishRevenue: 74000,
        notes: 'Bulk entry — week before last',
      });
      await weeklyService.finalizeWeek(RAJU_ID, summary.summary_uuid);
    } else {
      console.log('  (weekly summary already finalized — skipping)');
    }

    // ── P&L views ──
    const start = daysAgo(14);
    const end = daysAgo(0);

    console.log('\n→ Farm P&L (last 14 days)...');
    console.log(JSON.stringify(await pnlService.getFarmPnl(RAJU_ID, start, end), null, 2));

    console.log('\n→ Per-pond P&L (last 14 days)...');
    console.log(JSON.stringify(await pnlService.getPerPondPnl(RAJU_ID, start, end), null, 2));

    console.log('\n→ Per-vessel P&L (last 14 days)...');
    console.log(JSON.stringify(await pnlService.getPerVesselPnl(RAJU_ID, start, end), null, 2));

    console.log('\n→ Per-trip P&L (last 14 days)...');
    console.log(JSON.stringify(await pnlService.getPerTripPnl(RAJU_ID, start, end), null, 2));

    console.log('\n✔ Fishery seed complete.');
    process.exit(0);
  } catch (err) {
    console.error('✘ Fishery seed failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
