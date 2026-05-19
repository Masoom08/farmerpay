/**
 * DRISHTI Interactive Visualization Dashboard
 *
 * Standalone Express server on port 4000 that runs DRISHTI engines
 * with mock farmer data and renders results as interactive charts.
 *
 * Usage: node tools/drishti-dashboard.js
 * Open:  http://localhost:4000
 */

const express = require('express');
const path = require('path');

// Import engines directly (no DB needed)
const preLoanEngine = require('../src/modules/drishti/services/engines/preLoanEngine');
const householdPortfolioEngine = require('../src/modules/drishti/services/engines/householdPortfolioEngine');
const climateStressEngine = require('../src/modules/drishti/services/engines/climateStressEngine');
const insuranceEngine = require('../src/modules/drishti/services/engines/insuranceEngine');
const marketTimingEngine = require('../src/modules/drishti/services/engines/marketTimingEngine');
const { computePortfolio } = require('../src/modules/drishti/services/engines/bankerPortfolioEngine');

const app = express();
app.use(express.json());

// ─── Mock Data ──────────────────────────────────────────────────────

const SNAPSHOT = {
  farmer_id: 1, total_farm_size_hectares: 2.5, district_id: 45, block_id: 102,
  land_ownership_type: 'owned', years_farming_experience: 12, education_level: 'secondary',
  family_members_count: 5, earning_members_count: 3, dependents_count: 2,
  spouse_occupation: 'SHG member + Kirana shop', primary_non_farm_occupation: null,
  trust_score: 72, trust_band: 'good',
  total_outstanding: 85000, total_monthly_emi: 8650,
  non_farm_income_streams: 5, non_farm_loan_emi_monthly: 2000,
  active_crop_cycles: [{ cycleId: 1, cropId: 'crop_paddy', season: 'kharif', status: 'growing' }],
  active_dairy_profile: { herdId: 1, animalCount: 3, registerName: 'Main Herd' },
  active_fishery_profile: { registerId: 1, totalPondAreaHectares: 0.2, registerName: 'Pond A' },
  horticulture_profile: null,
  historical_crop_profitability: [
    { season: 'kharif', year: 2025, cropId: 'crop_paddy', actualProfit: 45000, isProfitable: true },
    { season: 'kharif', year: 2024, cropId: 'crop_paddy', actualProfit: 38000, isProfitable: true },
  ],
  historical_dairy_profitability: [
    { month: 3, year: 2026, totalIncome: 12000, totalExpense: 5000, netProfit: 7000 },
    { month: 2, year: 2026, totalIncome: 11500, totalExpense: 4800, netProfit: 6700 },
  ],
  historical_fishery_profitability: [{ month: 1, year: 2026, totalIncome: 8000, totalExpense: 3000, netProfit: 5000 }],
  active_loans: [{ applicationId: 101, productName: 'Kharif Crop Loan', repaymentType: 'emi', approvalAmount: 100000, interestRate: 7.0, tenureMonths: 12, outstanding: 85000, emiAmount: 8650, nextDueDate: '2026-05-15', healthStatus: 'good' }],
  relevant_commodity_prices: [
    { commodityId: 'crop_paddy', currentPrice: 22, priceDate: '2026-04-10', priceTrend: 'stable', forecast30dPrice: 23, forecastConfidence: 65 },
  ],
  weather_outlook: { observedAt: '2026-04-12', tempCelsius: 34, humidityPercent: 45, rainfallMm24h: 0, conditionText: 'Clear sky' },
  active_insurance: [{ type: 'pmfby_crop', sumInsured: 100000, premiumPaid: 2000, season: 'kharif', policyExpiry: '2026-12-31', claimStatus: 'none' }],
  household_income_details: {
    income_streams: [
      { source: 'spouse_shg', label: 'Wife SHG', earning_member: 'spouse', amount_monthly: 3500, frequency: 'monthly', reliability: 'regular', active_months: null },
      { source: 'wage_labor', label: 'Construction', earning_member: 'farmer', amount_monthly: 6000, frequency: 'seasonal', reliability: 'irregular', active_months: [1,2,3,4,5,11,12] },
      { source: 'pension', label: 'Old Age Pension', earning_member: 'family', amount_monthly: 1000, frequency: 'monthly', reliability: 'guaranteed', active_months: null },
      { source: 'remittance', label: 'Son in Pune', earning_member: 'family', amount_monthly: 5000, frequency: 'monthly', reliability: 'regular', active_months: null },
      { source: 'petty_business', label: 'Kirana shop', earning_member: 'spouse', amount_monthly: 4000, frequency: 'daily', reliability: 'regular', active_months: null },
    ],
    total_monthly_non_farm: 19500,
  },
  total_non_farm_monthly: 19500,
  household_expense_details: {
    expense_categories: [
      { category: 'food_groceries', label: 'Food', monthly: 6000, peak_months: null, peak_amount: 0 },
      { category: 'education', label: 'Education', monthly: 2500, peak_months: [6], peak_amount: 15000 },
      { category: 'healthcare', label: 'Healthcare', monthly: 1000, peak_months: null, peak_amount: 0 },
      { category: 'social_obligations', label: 'Festivals', monthly: 1667, peak_months: null, peak_amount: 0 },
      { category: 'utilities', label: 'Utilities', monthly: 1200, peak_months: null, peak_amount: 0 },
      { category: 'transportation', label: 'Transport', monthly: 800, peak_months: null, peak_amount: 0 },
      { category: 'non_farm_loan_emi', label: 'Gold loan', monthly: 2000, peak_months: null, peak_amount: 0 },
    ],
    total_monthly_expense: 15167,
  },
  total_household_expense_monthly: 15167,
};

const BENCHMARKS = [
  { district_id: 45, activity_type: 'crop', crop_id: 'crop_paddy', season: 'kharif', avg_yield_kg_per_hectare: 3600, avg_cost_per_hectare: 55000, avg_revenue_per_hectare: 79200, avg_profit_per_hectare: 24200, yield_rainfall_elasticity: -0.5, yield_temperature_sensitivity: -0.3, historical_claim_rate_pct: 25, avg_claim_payout: 15000, sample_size: 450 },
  { district_id: 45, activity_type: 'dairy', avg_milk_yield_per_animal: 7, avg_monthly_cost_per_animal: 4500, avg_monthly_revenue_per_animal: 7350, sample_size: 300 },
  { district_id: 45, activity_type: 'fishery', avg_yield_kg_per_hectare_pond: 3500, avg_cost_per_hectare_pond: 140000, avg_revenue_per_hectare_pond: 420000, sample_size: 80 },
];

// ─── API Routes ─────────────────────────────────────────────────────

app.post('/api/engine/:type', (req, res) => {
  try {
    const engineType = req.params.type;
    const input = req.body;
    let result;

    switch (engineType) {
      case 'pre_loan':
        result = preLoanEngine.compute({ snapshot: SNAPSHOT, benchmarks: BENCHMARKS, input: { farmer_id: 1, loan_product_id: 1, loan_amount: input.loan_amount || 200000, loan_tenure_months: input.loan_tenure_months || 12, repayment_type: input.repayment_type || 'emi', activity: input.activity || { type: 'crop', crop_id: 'crop_paddy', acreage_hectares: input.acreage || 1.2, season: 'kharif', irrigation_type: input.irrigation || 'rainfed' }, overrides: input.overrides || {}, computation_mode: 'deterministic', include_insurance_comparison: true }});
        break;
      case 'household_portfolio':
        result = householdPortfolioEngine.compute({ snapshot: SNAPSHOT, benchmarks: BENCHMARKS, input: { farmer_id: 1, proposed_farm_activities: input.proposed_farm_activities || { crops: [{ crop_id: 'crop_paddy', acreage_hectares: 0.8, season: 'kharif', irrigation: 'rainfed' }], dairy: { animal_count: input.dairy_animals || 3, feed_quality: 'standard' }, fishery: input.include_fishery ? { pond_area_hectares: 0.2, stocking_density: 'standard', cycle_months: 8 } : null }, household_income: { use_saved_profile: true }, household_expenses: { use_saved_profile: true }, time_horizon_months: 12, include_stress_scenarios: true }});
        break;
      case 'climate_stress':
        result = climateStressEngine.compute({ snapshot: SNAPSHOT, benchmarks: BENCHMARKS, input: { farmer_id: 1, climate_scenario: { rainfall_deviation_pct: input.rainfall || -25, temperature_deviation_celsius: input.temperature || 2, delayed_monsoon_weeks: input.delay_weeks || 0 }, include_household_impact: true, computation_mode: input.monte_carlo ? 'monte_carlo' : 'deterministic', monte_carlo_runs: 300 }});
        break;
      case 'insurance':
        result = insuranceEngine.compute({ snapshot: SNAPSHOT, benchmarks: BENCHMARKS, input: { farmer_id: 1, insurance_type: input.insurance_type || 'pmfby', sum_insured: input.sum_insured || 100000, premium_amount: null, activity: { type: 'crop', crop_id: 'crop_paddy', acreage_hectares: 1.2, season: 'kharif' }, computation_mode: input.monte_carlo ? 'monte_carlo' : 'deterministic', monte_carlo_runs: 300 }});
        break;
      case 'market_timing':
        result = marketTimingEngine.compute({ snapshot: SNAPSHOT, benchmarks: BENCHMARKS, input: { farmer_id: 1, commodity_id: 'crop_paddy', quantity_quintals: input.quantity || 50, current_price_per_quintal: input.price || 2200, storage_options: { warehousing_cost_per_quintal_month: input.storage_cost || 50, storage_duration_months: [1, 2, 3], quality_degradation_pct_per_month: 1 }, active_loan_id: 101, include_topup_loan_simulation: true, computation_mode: input.monte_carlo ? 'monte_carlo' : 'deterministic', monte_carlo_runs: 300 }});
        break;
      case 'banker_portfolio':
        const farmers = Array.from({ length: input.farmer_count || 10 }, (_, i) => ({ snapshot: { ...SNAPSHOT, farmer_id: i + 1, total_outstanding: 50000 + Math.random() * 150000, total_monthly_emi: 4000 + Math.random() * 8000 }, benchmarks: BENCHMARKS }));
        result = computePortfolio({ farmerSnapshots: farmers, shockVariables: { rainfall_deviation_pct: input.rainfall || -25, price_change_pct: input.price_change || -10, temperature_deviation_celsius: input.temperature || 2 }, computationMode: 'deterministic' });
        break;
      default:
        return res.status(400).json({ error: 'Unknown engine: ' + engineType });
    }
    res.json({ success: true, engine: engineType, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, stack: err.stack?.split('\n').slice(0, 3) });
  }
});

// ─── Dashboard HTML ─────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>DRISHTI Dashboard</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>
<style>
  *{margin:0;padding:0;box-sizing:border-box} body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f7fa;color:#1a1a2e}
  .header{background:linear-gradient(135deg,#1a5632,#2d8659);color:#fff;padding:20px 30px;display:flex;align-items:center;gap:15px}
  .header h1{font-size:24px} .header span{opacity:0.8;font-size:14px}
  .tabs{display:flex;background:#fff;border-bottom:2px solid #e0e0e0;padding:0 20px;overflow-x:auto}
  .tab{padding:12px 20px;cursor:pointer;border-bottom:3px solid transparent;font-size:14px;font-weight:500;white-space:nowrap;transition:all 0.2s}
  .tab:hover{background:#f0f7f4} .tab.active{border-bottom-color:#2d8659;color:#2d8659;font-weight:600}
  .content{padding:20px 30px;max-width:1400px;margin:0 auto}
  .controls{background:#fff;border-radius:12px;padding:20px;margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06)}
  .controls h3{margin-bottom:12px;color:#1a5632}
  .control-row{display:flex;gap:20px;flex-wrap:wrap;align-items:end}
  .control-group{display:flex;flex-direction:column;gap:4px}
  .control-group label{font-size:12px;color:#666;font-weight:500}
  .control-group input,.control-group select{padding:8px 12px;border:1px solid #ddd;border-radius:6px;font-size:14px;width:180px}
  .control-group input[type=range]{width:200px}
  .btn{padding:10px 24px;background:#2d8659;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;transition:background 0.2s}
  .btn:hover{background:#1a5632} .btn:disabled{background:#ccc;cursor:wait}
  .results{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px}
  .card{background:#fff;border-radius:12px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06)}
  .card h4{color:#1a5632;margin-bottom:10px;font-size:15px}
  .metric{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0;font-size:13px}
  .metric .label{color:#666} .metric .value{font-weight:600}
  .metric .value.good{color:#2d8659} .metric .value.warn{color:#e67e22} .metric .value.bad{color:#e74c3c}
  .chart-container{position:relative;height:280px;margin-top:10px}
  .tag{display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600}
  .tag.good{background:#e8f5e9;color:#2d8659} .tag.watch{background:#fff3e0;color:#e67e22} .tag.stressed{background:#ffebee;color:#e74c3c}
  .recommendation{padding:8px 12px;margin:4px 0;border-radius:8px;font-size:13px;display:flex;align-items:start;gap:8px}
  .recommendation.verdict{background:#e8f5e9;border-left:3px solid #2d8659}
  .recommendation.warning{background:#fff3e0;border-left:3px solid #e67e22}
  .recommendation.action{background:#e3f2fd;border-left:3px solid #2196f3}
  .recommendation.info{background:#f5f5f5;border-left:3px solid #9e9e9e}
  .recommendation.strength{background:#e8f5e9;border-left:3px solid #4caf50}
  .loading{text-align:center;padding:40px;color:#999}
  #output{min-height:200px}
</style>
</head>
<body>
<div class="header">
  <div><h1>DRISHTI Dashboard</h1><span>Digital Twin \u2014 Scenario Simulation Engine</span></div>
</div>
<div class="tabs">
  <div class="tab active" data-engine="pre_loan">Pre-Loan</div>
  <div class="tab" data-engine="household_portfolio">Household Portfolio</div>
  <div class="tab" data-engine="climate_stress">Climate Stress</div>
  <div class="tab" data-engine="insurance">Insurance</div>
  <div class="tab" data-engine="market_timing">Market Timing</div>
  <div class="tab" data-engine="banker_portfolio">Banker Portfolio</div>
</div>
<div class="content">
  <div class="controls" id="controls"></div>
  <div id="output"><div class="loading">Select an engine tab and click Run to see results</div></div>
</div>
<script>
const ENGINES={
  pre_loan:{label:'Pre-Loan Scenario',controls:[
    {id:'loan_amount',label:'Loan Amount (\u20b9)',type:'range',min:50000,max:500000,step:10000,value:200000,show:true},
    {id:'loan_tenure_months',label:'Tenure (months)',type:'select',options:[6,9,12,18,24,36],value:12},
    {id:'acreage',label:'Acreage (ha)',type:'range',min:0.5,max:5,step:0.25,value:1.2,show:true},
    {id:'irrigation',label:'Irrigation',type:'select',options:['rainfed','irrigated','mixed'],value:'rainfed'},
  ]},
  household_portfolio:{label:'Household Portfolio',controls:[
    {id:'dairy_animals',label:'Dairy Animals',type:'range',min:0,max:10,step:1,value:3,show:true},
    {id:'include_fishery',label:'Include Fishery?',type:'select',options:['true','false'],value:'true'},
  ]},
  climate_stress:{label:'Climate Stress Test',controls:[
    {id:'rainfall',label:'Rainfall Deviation %',type:'range',min:-50,max:50,step:5,value:-25,show:true},
    {id:'temperature',label:'Temperature +\u00b0C',type:'range',min:0,max:6,step:0.5,value:2,show:true},
    {id:'delay_weeks',label:'Monsoon Delay (weeks)',type:'range',min:0,max:6,step:1,value:0,show:true},
    {id:'monte_carlo',label:'Monte Carlo?',type:'select',options:['false','true'],value:'false'},
  ]},
  insurance:{label:'Insurance Decision',controls:[
    {id:'insurance_type',label:'Type',type:'select',options:['pmfby','weather_index','livestock','aquaculture'],value:'pmfby'},
    {id:'sum_insured',label:'Sum Insured (\u20b9)',type:'range',min:25000,max:500000,step:25000,value:100000,show:true},
    {id:'monte_carlo',label:'Monte Carlo?',type:'select',options:['false','true'],value:'false'},
  ]},
  market_timing:{label:'Market Timing',controls:[
    {id:'quantity',label:'Quantity (quintals)',type:'range',min:10,max:200,step:10,value:50,show:true},
    {id:'price',label:'Current Price (\u20b9/qtl)',type:'range',min:1000,max:5000,step:100,value:2200,show:true},
    {id:'storage_cost',label:'Storage Cost (\u20b9/qtl/mo)',type:'range',min:20,max:100,step:5,value:50,show:true},
    {id:'monte_carlo',label:'Monte Carlo?',type:'select',options:['false','true'],value:'false'},
  ]},
  banker_portfolio:{label:'Banker Portfolio Stress',controls:[
    {id:'farmer_count',label:'Portfolio Size',type:'range',min:5,max:50,step:5,value:20,show:true},
    {id:'rainfall',label:'Rainfall Deviation %',type:'range',min:-50,max:0,step:5,value:-25,show:true},
    {id:'price_change',label:'Price Change %',type:'range',min:-30,max:0,step:5,value:-10,show:true},
    {id:'temperature',label:'Temperature +\u00b0C',type:'range',min:0,max:5,step:0.5,value:2,show:true},
  ]},
};
let activeEngine='pre_loan',charts=[];
function destroyCharts(){charts.forEach(c=>c.destroy());charts=[];}
function renderControls(engine){
  const cfg=ENGINES[engine];const el=document.getElementById('controls');
  let html='<h3>'+cfg.label+'</h3><div class="control-row">';
  cfg.controls.forEach(c=>{
    html+='<div class="control-group"><label>'+c.label+'</label>';
    if(c.type==='range')html+='<input type="range" id="ctrl_'+c.id+'" min="'+c.min+'" max="'+c.max+'" step="'+c.step+'" value="'+c.value+'" oninput="document.getElementById(\\'val_'+c.id+'\\').textContent=this.value"><span id="val_'+c.id+'">'+c.value+'</span>';
    else if(c.type==='select'){html+='<select id="ctrl_'+c.id+'">';c.options.forEach(o=>html+='<option value="'+o+'"'+(o==c.value?' selected':'')+'>'+o+'</option>');html+='</select>';}
    else html+='<input type="'+c.type+'" id="ctrl_'+c.id+'" value="'+c.value+'">';
    html+='</div>';
  });
  html+='<div class="control-group"><label>&nbsp;</label><button class="btn" id="runBtn" onclick="runEngine()">Run Scenario</button></div></div>';
  el.innerHTML=html;
}
function getInputs(){
  const cfg=ENGINES[activeEngine];const inputs={};
  cfg.controls.forEach(c=>{const el=document.getElementById('ctrl_'+c.id);if(el){let v=el.value;if(c.type==='range')v=parseFloat(v);if(v==='true')v=true;if(v==='false')v=false;inputs[c.id]=v;}});
  return inputs;
}
async function runEngine(){
  const btn=document.getElementById('runBtn');btn.disabled=true;btn.textContent='Running...';
  document.getElementById('output').innerHTML='<div class="loading">Computing scenario...</div>';
  destroyCharts();
  try{
    const res=await fetch('/api/engine/'+activeEngine,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(getInputs())});
    const json=await res.json();
    if(json.success)renderResults(activeEngine,json.data);else document.getElementById('output').innerHTML='<div class="card"><h4>Error</h4><pre>'+JSON.stringify(json.error,null,2)+'</pre></div>';
  }catch(e){document.getElementById('output').innerHTML='<div class="card"><h4>Error</h4><p>'+e.message+'</p></div>';}
  btn.disabled=false;btn.textContent='Run Scenario';
}
function fmt(n){if(n==null)return'-';const v=parseFloat(n);if(isNaN(v))return n;if(Math.abs(v)>=100000)return '\u20b9'+(v/100000).toFixed(1)+'L';if(Math.abs(v)>=1000)return '\u20b9'+(v/1000).toFixed(1)+'K';return '\u20b9'+Math.round(v);}
function pct(n){return n!=null?Math.round(parseFloat(n)*100)+'%':'-';}
function healthTag(s){const cls=s==='good'?'good':s==='watch'?'watch':'stressed';return '<span class="tag '+cls+'">'+((s||'unknown').toUpperCase())+'</span>';}
function renderRecs(recs){if(!recs||!recs.length)return '';return recs.map(r=>'<div class="recommendation '+(r.type||'info')+'">'+r.message+'</div>').join('');}
function renderResults(engine,data){
  const el=document.getElementById('output');let html='';
  if(engine==='pre_loan'){
    const lt=data.loanTerms||{};const scenarios=data.scenarios||[];
    html+='<div class="results"><div class="card"><h4>Loan Terms</h4>';
    html+=m('Amount',fmt(lt.amount))+m('Interest Rate',lt.interest_rate+'%')+m('Tenure',lt.tenure_months+' months')+m('Monthly EMI',fmt(lt.monthly_emi))+m('Total Repayable',fmt(lt.total_repayable))+m('Total Interest',fmt(lt.total_interest));
    html+='</div>';
    scenarios.forEach(s=>{const p=s.projections||{};
      html+='<div class="card"><h4>'+s.label.toUpperCase()+' Scenario</h4><p style="font-size:12px;color:#888;margin-bottom:8px">'+s.description+'</p>';
      html+=m('Revenue',fmt(p.total_revenue))+m('Cost',fmt(p.total_cost))+m('Net Income',fmt(p.net_farm_income),p.net_farm_income>0?'good':'bad');
      html+=m('EMI/Income',pct(p.emi_to_income_ratio),p.emi_to_income_ratio<0.3?'good':p.emi_to_income_ratio<0.45?'warn':'bad');
      html+=m('Health',healthTag(p.health_status))+m('Risk Score',p.risk_score);
      if(p.breakeven_yield_kg_per_hectare)html+=m('Breakeven Yield',Math.round(p.breakeven_yield_kg_per_hectare)+' kg/ha');
      if(p.yield_safety_margin_pct!=null)html+=m('Safety Margin',Math.round(p.yield_safety_margin_pct)+'%',p.yield_safety_margin_pct>20?'good':p.yield_safety_margin_pct>0?'warn':'bad');
      html+='</div>';
    });
    if(data.insuranceComparison){const ic=data.insuranceComparison;html+='<div class="card"><h4>Insurance Comparison</h4>'+m('Without Insurance Loss',fmt(ic.without_insurance?.worst_case_loss),'bad')+m('With PMFBY Loss',fmt(ic.with_pmfby?.worst_case_loss),'good')+m('Premium',fmt(ic.with_pmfby?.premium))+m('Expected Payout',fmt(ic.with_pmfby?.expected_payout),'good')+'</div>';}
    html+='<div class="card" style="grid-column:1/-1"><h4>Recommendations</h4>'+renderRecs(data.recommendations)+'</div>';
    html+='<div class="card" style="grid-column:1/-1"><h4>Monthly Cash Flow (Base Scenario)</h4><div class="chart-container"><canvas id="cfChart"></canvas></div></div></div>';
    el.innerHTML=html;
    const base=scenarios.find(s=>s.label==='base');if(base&&base.monthly_cashflow){
      const cf=base.monthly_cashflow;
      charts.push(new Chart(document.getElementById('cfChart'),{type:'bar',data:{labels:cf.map(m=>m.monthName||m.month),datasets:[{label:'Inflows',data:cf.map(m=>m.inflows?.total||0),backgroundColor:'rgba(45,134,89,0.7)'},{label:'Outflows',data:cf.map(m=>-(m.outflows?.total||0)),backgroundColor:'rgba(231,76,60,0.7)'},{label:'Cumulative',data:cf.map(m=>m.cumulative),type:'line',borderColor:'#2196f3',borderWidth:2,pointRadius:3,fill:false,yAxisID:'y1'}]},options:{responsive:true,maintainAspectRatio:false,scales:{y:{title:{display:true,text:'\u20b9'}},y1:{position:'right',title:{display:true,text:'Cumulative'},grid:{drawOnChartArea:false}}}}}));
    }
  } else if(engine==='household_portfolio'){
    const is=data.incomeSummary||{};const es=data.expenseSummary||{};const np=data.netPosition||{};const fr=data.financialResilience||{};const comp=data.comparisonToCurrent||{};
    html+='<div class="results"><div class="card"><h4>Income Summary</h4>'+m('Total Annual',fmt(is.total_projected_annual),'good')+m('Farm Income',fmt(is.farm_income_annual)+' ('+is.farm_income_pct+'%)')+m('Non-Farm Income',fmt(is.non_farm_income_annual)+' ('+is.non_farm_income_pct+'%)')+m('Diversification',is.income_diversification_index+' ('+is.income_diversification_rating+')')+'</div>';
    html+='<div class="card"><h4>Expenses</h4>'+m('Household',fmt(es.total_annual_household))+m('Farm Operations',fmt(es.total_annual_farm_operations))+m('Loan EMIs',fmt(es.total_annual_loan_emi))+m('Grand Total',fmt(es.grand_total_annual),'bad')+'</div>';
    html+='<div class="card"><h4>Net Position</h4>'+m('Annual Surplus',fmt(np.annual_surplus),np.annual_surplus>0?'good':'bad')+m('Surplus Months',np.surplus_months)+m('Deficit Months',np.deficit_months,np.deficit_months>3?'bad':np.deficit_months>0?'warn':'good')+m('Working Capital Gap',fmt(np.working_capital_gap))+'</div>';
    html+='<div class="card"><h4>Financial Resilience</h4>'+m('Score',fr.resilience_score+'/100 ('+fr.resilience_rating+')')+m('Months w/o Farm Income',fr.months_survivable_without_farm_income)+m('Non-Farm Covers Expenses',fr.non_farm_covers_household_expenses_pct+'%')+m('Single Point of Failure',fr.single_point_of_failure?'YES':'No',fr.single_point_of_failure?'bad':'good')+'</div>';
    if(comp.income_change_pct!=null){html+='<div class="card"><h4>vs Current</h4>'+m('Income Change',comp.income_change_pct+'%',comp.income_change_pct>0?'good':'bad')+m('Current',fmt(comp.current_total_household_income))+m('Proposed',fmt(comp.proposed_total_household_income))+m('Risk Change',comp.risk_change)+'</div>';}
    html+='<div class="card" style="grid-column:1/-1"><h4>Recommendations</h4>'+renderRecs(data.recommendations)+'</div>';
    html+='<div class="card" style="grid-column:1/-1"><h4>Income Streams</h4><div class="chart-container"><canvas id="incomeChart"></canvas></div></div></div>';
    el.innerHTML=html;
    const streams=(is.income_streams||[]).filter(s=>s.annual>0);
    if(streams.length)charts.push(new Chart(document.getElementById('incomeChart'),{type:'doughnut',data:{labels:streams.map(s=>s.source),datasets:[{data:streams.map(s=>s.annual),backgroundColor:['#2d8659','#4caf50','#81c784','#a5d6a7','#c8e6c9','#2196f3','#64b5f6','#90caf9','#e67e22','#f39c12','#9c27b0','#ba68c8']}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right'}}}}));
  } else if(engine==='climate_stress'){
    const cascade=data.impactCascade||{};const cs=data.climateScenario||{};const mc=data.monteCarlo;
    html+='<div class="results"><div class="card"><h4>Climate Scenario</h4>'+m('Type',cs.scenario_type)+m('Severity',cs.severity)+m('Rainfall',cs.rainfall_deviation_pct+'%')+m('Temperature','+'+cs.temperature_deviation_celsius+'\u00b0C')+'</div>';
    html+='<div class="card"><h4>Impact Cascade</h4>'+m('Revenue Change',fmt(cascade.revenue_impact?.change)+' ('+cascade.revenue_impact?.change_pct+'%)',cascade.revenue_impact?.change_pct<-10?'bad':'warn')+m('Income Change',fmt(cascade.income_impact?.change),cascade.income_impact?.change<0?'bad':'good')+m('Feed Cost Multiplier',cascade.cost_impact?.dairy_feed_multiplier+'x')+m('SMA Migration',cascade.loan_stress?.sma_migration)+'</div>';
    if(mc){html+='<div class="card"><h4>Monte Carlo ('+mc.num_runs+' runs)</h4>'+m('Prob. Profitable',Math.round(mc.probability_profitable*100)+'%',mc.probability_profitable>0.6?'good':'bad')+m('Prob. SMA Stress',Math.round(mc.probability_sma_stress*100)+'%',mc.probability_sma_stress<0.3?'good':'bad')+m('Income P10',fmt(mc.income_p10))+m('Income P50',fmt(mc.income_p50))+m('Income P90',fmt(mc.income_p90))+'</div>';}
    html+='<div class="card" style="grid-column:1/-1"><h4>Recommendations</h4>'+renderRecs(data.recommendations)+'</div>';
    const scenarios=data.scenarios||[];
    html+='<div class="card" style="grid-column:1/-1"><h4>Baseline vs Stress Cash Flow</h4><div class="chart-container"><canvas id="stressChart"></canvas></div></div></div>';
    el.innerHTML=html;
    if(scenarios.length>=2){const bl=scenarios[0].monthly_cashflow||[];const st=scenarios[1].monthly_cashflow||[];
      charts.push(new Chart(document.getElementById('stressChart'),{type:'line',data:{labels:bl.map(m=>m.monthName||m.month),datasets:[{label:'Baseline Net',data:bl.map(m=>m.net),borderColor:'#2d8659',borderWidth:2,fill:false},{label:'Stress Net',data:st.map(m=>m.net),borderColor:'#e74c3c',borderWidth:2,borderDash:[5,5],fill:false}]},options:{responsive:true,maintainAspectRatio:false,scales:{y:{title:{display:true,text:'\u20b9'}}}}}));
    }
  } else if(engine==='insurance'){
    const terms=data.insuranceTerms||{};const rec=data.recommendation||{};const fy=data.fiveYearAnalysis||{};const be=data.breakEven||{};const mc=data.monteCarlo;
    html+='<div class="results"><div class="card"><h4>Insurance Terms</h4>'+m('Type',terms.insurance_type)+m('Sum Insured',fmt(terms.sum_insured))+m('Premium/Season',fmt(terms.premium_per_season))+m('Premium %',terms.premium_as_pct_of_sum+'%')+'</div>';
    html+='<div class="card"><h4>Verdict: '+rec.verdict+'</h4><p style="margin:8px 0;font-size:13px">'+rec.reasoning+'</p>'+m('Confidence',rec.confidence)+m('Enroll Score',rec.enroll_score+'/100')+m('5-Year ROI',fy.five_year_roi_pct+'%',fy.five_year_roi_pct>0?'good':'bad')+'</div>';
    html+='<div class="card"><h4>Break-Even</h4>'+m('Break-Even Frequency',Math.round(be.break_even_claim_frequency*100)+'%')+m('Historical Frequency',Math.round(be.historical_claim_frequency*100)+'%')+m('Verdict',be.break_even_verdict)+'</div>';
    if(mc){html+='<div class="card"><h4>Monte Carlo</h4>'+m('Payout Probability',Math.round(mc.payout_probability*100)+'%')+m('Avg Payout',fmt(mc.average_payout_amount))+m('Worst Case (Uninsured)',fmt(mc.worst_case_loss_uninsured),'bad')+m('Worst Case (Insured)',fmt(mc.worst_case_loss_insured),'good')+'</div>';}
    html+='<div class="card" style="grid-column:1/-1"><h4>5-Year Projection</h4><div class="chart-container"><canvas id="insurChart"></canvas></div></div>';
    html+='<div class="card" style="grid-column:1/-1"><h4>Recommendations</h4>'+renderRecs(data.recommendations)+'</div></div>';
    el.innerHTML=html;
    if(fy.yearly_breakdown){const yrs=fy.yearly_breakdown;
      charts.push(new Chart(document.getElementById('insurChart'),{type:'bar',data:{labels:yrs.map(y=>'Year '+y.year),datasets:[{label:'Cumulative Premiums',data:yrs.map(y=>y.premium_paid),backgroundColor:'rgba(231,76,60,0.6)'},{label:'Expected Payouts',data:yrs.map(y=>y.expected_payouts),backgroundColor:'rgba(45,134,89,0.6)'},{label:'Net',data:yrs.map(y=>y.cumulative_net),type:'line',borderColor:'#2196f3',borderWidth:2,pointRadius:4,fill:false}]},options:{responsive:true,maintainAspectRatio:false}}));
    }
  } else if(engine==='market_timing'){
    const sn=data.sellNow||{};const opt=data.optimalWindow||{};
    html+='<div class="results"><div class="card"><h4>Sell Now</h4>'+m('Price',fmt(sn.price_per_quintal)+'/qtl')+m('Gross Value',fmt(sn.gross_value))+m('Net Proceeds',fmt(sn.net_proceeds))+'</div>';
    html+='<div class="card"><h4>Optimal: '+opt.recommended_action+'</h4>'+m('Expected Proceeds',fmt(opt.expected_net_proceeds))+m('Gain vs Sell Now',fmt(opt.gain_vs_sell_now),opt.gain_vs_sell_now>0?'good':'bad')+m('Probability',Math.round((opt.probability_of_gain||0)*100)+'%')+m('Confidence',opt.confidence)+'</div>';
    (data.storageScenarios||[]).forEach(s=>{html+='<div class="card"><h4>Store '+s.months+' Month(s)</h4>'+m('Projected Price',fmt(s.projected_price)+'/qtl')+m('Storage Cost',fmt(s.storage_cost))+m('Net Proceeds',fmt(s.net_proceeds))+m('Gain vs Now',fmt(s.net_gain_vs_sell_now),s.net_gain_vs_sell_now>0?'good':'bad')+m('ROI',s.storage_roi_pct+'%')+'</div>';});
    html+='<div class="card" style="grid-column:1/-1"><h4>Price Trajectory</h4><div class="chart-container"><canvas id="priceChart"></canvas></div></div>';
    html+='<div class="card" style="grid-column:1/-1"><h4>Recommendations</h4>'+renderRecs(data.recommendations)+'</div></div>';
    el.innerHTML=html;
    const pt=data.priceTrajectory?.monthly_prices||[];
    if(pt.length)charts.push(new Chart(document.getElementById('priceChart'),{type:'line',data:{labels:pt.map((_,i)=>'Month '+(i+1)),datasets:[{label:'Projected Price (\u20b9/qtl)',data:pt,borderColor:'#2d8659',borderWidth:2,fill:true,backgroundColor:'rgba(45,134,89,0.1)',pointRadius:4},{label:'Current Price',data:pt.map(()=>sn.price_per_quintal),borderColor:'#999',borderDash:[5,5],borderWidth:1,pointRadius:0,fill:false}]},options:{responsive:true,maintainAspectRatio:false,scales:{y:{title:{display:true,text:'\u20b9/quintal'}}}}}));
  } else if(engine==='banker_portfolio'){
    const ps=data.portfolioSummary||{};const si=data.stressImpact||{};const mig=si.sma_migration||{};
    html+='<div class="results"><div class="card"><h4>Portfolio Summary</h4>'+m('Total Farmers',ps.total_farmers)+m('Outstanding',fmt(ps.total_outstanding))+m('Current NPAs',ps.current_npa_count)+m('Current NPA Amt',fmt(ps.current_npa_amount))+'</div>';
    html+='<div class="card"><h4>Stress Impact</h4>'+m('Projected NPAs',si.projected_npa_count,'bad')+m('Additional NPAs','+'+(si.additional_npa_count||0),si.additional_npa_count>0?'bad':'good')+m('NPA Amount',fmt(si.projected_npa_amount))+m('Portfolio at Risk',si.portfolio_at_risk_pct+'%',si.portfolio_at_risk_pct>10?'bad':'warn')+m('VaR (95%)',fmt(data.portfolioVar95))+'</div>';
    html+='<div class="card"><h4>SMA Migration</h4>'+m('Good \u2192 Watch',mig.good_to_watch)+m('Good \u2192 Stressed',mig.good_to_stressed)+m('Good \u2192 NPA',mig.good_to_npa)+m('Watch \u2192 Stressed',mig.watch_to_stressed)+m('Watch \u2192 NPA',mig.watch_to_npa)+m('Stressed \u2192 NPA',mig.stressed_to_npa)+m('No Change',mig.no_change)+m('Improved',mig.improved)+'</div>';
    html+='<div class="card" style="grid-column:1/-1"><h4>Top Intervention Candidates</h4><table style="width:100%;font-size:13px;border-collapse:collapse"><tr style="border-bottom:2px solid #eee"><th style="text-align:left;padding:6px">Farmer</th><th>Outstanding</th><th>Current</th><th>Projected</th><th>Risk Score</th></tr>';
    (data.interventionList||[]).slice(0,10).forEach(f=>{html+='<tr style="border-bottom:1px solid #f0f0f0"><td style="padding:6px">Farmer #'+f.farmer_id+'</td><td style="text-align:center">'+fmt(f.outstanding)+'</td><td style="text-align:center">'+healthTag(f.current_status)+'</td><td style="text-align:center">'+healthTag(f.projected_status)+'</td><td style="text-align:center;font-weight:600">'+f.risk_score+'</td></tr>';});
    html+='</table></div><div class="card" style="grid-column:1/-1"><h4>Recommendations</h4>'+renderRecs(data.recommendations)+'</div></div>';
    el.innerHTML=html;
  }
}
function m(label,value,cls){return '<div class="metric"><span class="label">'+label+'</span><span class="value'+(cls?' '+cls:'')+'">'+value+'</span></div>';}
document.querySelectorAll('.tab').forEach(tab=>{
  tab.addEventListener('click',()=>{
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));tab.classList.add('active');
    activeEngine=tab.dataset.engine;renderControls(activeEngine);destroyCharts();
    document.getElementById('output').innerHTML='<div class="loading">Adjust parameters and click Run</div>';
  });
});
renderControls('pre_loan');
</script>
</body></html>`);
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`\n  DRISHTI Dashboard running at http://localhost:${PORT}\n`);
  console.log('  Engines available:');
  console.log('    - Pre-Loan Scenario Modeling');
  console.log('    - Household & Activity Portfolio');
  console.log('    - Climate Stress Testing');
  console.log('    - Insurance Decision');
  console.log('    - Post-Harvest Market Timing');
  console.log('    - Banker Portfolio Simulation\n');
});
