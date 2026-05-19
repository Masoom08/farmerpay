"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import { Brain, Satellite, Cloud, TrendingUp, Percent, RefreshCcw, AlertTriangle, Calendar, Video, Languages, BarChart3, Wheat } from "lucide-react";
import { apiGet, formatRupees } from "@/lib/api";

export default function IntelligencePage() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const [weatherRisk, setWeatherRisk] = useState<any>(null);
  const [languages, setLanguages] = useState<any[]>([]);
  const [yieldPrediction, setYieldPrediction] = useState<any>(null);
  const [satelliteHealth, setSatelliteHealth] = useState<any>(null);
  const [npaPrediction, setNpaPrediction] = useState<any>(null);
  const [dynamicRate, setDynamicRate] = useState<any>(null);
  const [restructuring, setRestructuring] = useState<any>(null);
  const [collectionSchedule, setCollectionSchedule] = useState<any>(null);
  const [videoKyc, setVideoKyc] = useState<any>(null);

  useEffect(() => {
    async function load() {
      try {
        const token = localStorage.getItem("fp_token") || "";
        const results = await Promise.allSettled([
          apiGet("/sentinel/intelligence/advanced-analytics", token),
          apiGet("/sentinel/intelligence/weather-risk?season=rabi", token),
          apiGet("/sentinel/intelligence/languages", token),
          apiGet("/sentinel/intelligence/yield-prediction/1", token),
          apiGet("/sentinel/intelligence/satellite-health/1", token),
          apiGet("/sentinel/intelligence/npa-prediction/1", token),
          apiGet("/sentinel/intelligence/dynamic-rate/1", token),
          apiGet("/sentinel/intelligence/restructuring/1", token),
          apiGet("/sentinel/intelligence/collection-schedule/1", token),
          apiGet("/sentinel/intelligence/video-kyc/1", token),
        ]);
        if (results[0].status === "fulfilled") setAnalytics(results[0].value.data);
        if (results[1].status === "fulfilled") setWeatherRisk(results[1].value.data);
        if (results[2].status === "fulfilled") setLanguages(results[2].value.data?.languages || results[2].value.data || []);
        if (results[3].status === "fulfilled") setYieldPrediction(results[3].value.data);
        if (results[4].status === "fulfilled") setSatelliteHealth(results[4].value.data);
        if (results[5].status === "fulfilled") setNpaPrediction(results[5].value.data);
        if (results[6].status === "fulfilled") setDynamicRate(results[6].value.data);
        if (results[7].status === "fulfilled") setRestructuring(results[7].value.data);
        if (results[8].status === "fulfilled") setCollectionSchedule(results[8].value.data);
        if (results[9].status === "fulfilled") setVideoKyc(results[9].value.data);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    }
    load();
  }, []);

  const sc = (v: number) => v >= 70 ? "text-green-600" : v >= 40 ? "text-amber-600" : "text-red-600";

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-500">Loading intelligence data...</div>;

  const features = [
    { name: "ML Crop Yield Prediction", icon: Wheat, tag: "AI/ML", color: "bg-purple-100 text-purple-700", data: yieldPrediction, status: yieldPrediction ? "active" : "pending" },
    { name: "Satellite Crop Health", icon: Satellite, tag: "AgriStack", color: "bg-green-100 text-green-700", data: satelliteHealth, status: satelliteHealth ? "active" : "pending" },
    { name: "Weather Risk Scoring", icon: Cloud, tag: "Risk", color: "bg-blue-100 text-blue-700", data: weatherRisk, status: weatherRisk ? "active" : "pending" },
    { name: "Price Forecasting", icon: TrendingUp, tag: "Market Data", color: "bg-emerald-100 text-emerald-700", data: true, status: "active" },
    { name: "Dynamic Interest Rate", icon: Percent, tag: "Core Banking", color: "bg-indigo-100 text-indigo-700", data: dynamicRate, status: dynamicRate ? "active" : "pending" },
    { name: "Loan Restructuring", icon: RefreshCcw, tag: "AI/ML", color: "bg-orange-100 text-orange-700", data: restructuring, status: restructuring ? "active" : "pending" },
    { name: "NPA Prediction Model", icon: AlertTriangle, tag: "Risk", color: "bg-red-100 text-red-700", data: npaPrediction, status: npaPrediction ? "active" : "pending" },
    { name: "Farmer Income Estimation", icon: BarChart3, tag: "AI/ML", color: "bg-purple-100 text-purple-700", data: true, status: "active" },
    { name: "Smart Collection Scheduling", icon: Calendar, tag: "Collections", color: "bg-teal-100 text-teal-700", data: collectionSchedule, status: collectionSchedule ? "active" : "pending" },
    { name: "Video KYC", icon: Video, tag: "KYC", color: "bg-pink-100 text-pink-700", data: videoKyc, status: videoKyc ? "active" : "pending" },
    { name: "Multi-language (11 langs)", icon: Languages, tag: "Platform", color: "bg-cyan-100 text-cyan-700", data: languages.length > 0, status: languages.length > 0 ? "active" : "pending" },
    { name: "Advanced Analytics", icon: Brain, tag: "Analytics", color: "bg-violet-100 text-violet-700", data: analytics, status: analytics ? "active" : "pending" },
  ];

  const activeCount = features.filter(f => f.status === "active").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Brain className="w-6 h-6 text-purple-600" /> Intelligence Engine</h1>
        <p className="text-sm text-slate-500 mt-1">AI-powered insights, advanced risk analytics, and forecasting — Phase 2</p>
      </div>

      {/* Feature Status Grid */}
      <div className="grid grid-cols-4 gap-3">
        {features.map((f, i) => {
          const Icon = f.icon;
          return (
            <Card key={i} className={`transition-all hover:shadow-md ${f.status === "active" ? "border-green-200" : "border-slate-200 opacity-70"}`}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`w-5 h-5 ${f.status === "active" ? "text-green-600" : "text-slate-400"}`} />
                  <Badge variant="outline" className={`text-xs ${f.color}`}>{f.tag}</Badge>
                </div>
                <p className="text-sm font-semibold text-slate-800">{f.name}</p>
                <Badge variant={f.status === "active" ? "default" : "secondary"} className={`mt-2 text-xs ${f.status === "active" ? "bg-green-100 text-green-700" : ""}`}>
                  {f.status === "active" ? "✅ Active" : "⏳ Pending"}
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Progress value={(activeCount / 12) * 100} className="w-48 h-2" />
        <span className="font-semibold">{activeCount}/12 features active</span>
      </div>

      <Tabs defaultValue="yield" className="space-y-4">
        <TabsList className="bg-slate-100 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="yield" className="text-xs">Yield Prediction</TabsTrigger>
          <TabsTrigger value="satellite" className="text-xs">Satellite Health</TabsTrigger>
          <TabsTrigger value="weather" className="text-xs">Weather Risk</TabsTrigger>
          <TabsTrigger value="npa" className="text-xs">NPA Prediction</TabsTrigger>
          <TabsTrigger value="rate" className="text-xs">Dynamic Rate</TabsTrigger>
          <TabsTrigger value="restructure" className="text-xs">Restructuring</TabsTrigger>
          <TabsTrigger value="collection" className="text-xs">Collection</TabsTrigger>
          <TabsTrigger value="kyc" className="text-xs">Video KYC</TabsTrigger>
          <TabsTrigger value="lang" className="text-xs">Languages</TabsTrigger>
        </TabsList>

        {/* YIELD PREDICTION */}
        <TabsContent value="yield">
          <Card>
            <CardHeader><CardTitle className="text-sm uppercase tracking-wide flex items-center gap-2"><Wheat className="w-4 h-4 text-green-600" /> ML-Based Crop Yield Prediction</CardTitle></CardHeader>
            <CardContent>
              {yieldPrediction ? (
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase">Predicted Yield</p>
                    <p className="text-3xl font-extrabold text-green-700">{yieldPrediction.predictedYieldPerHa || 0}</p>
                    <p className="text-xs text-slate-400">kg/hectare</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase">Benchmark</p>
                    <p className="text-3xl font-extrabold text-blue-700">{yieldPrediction.benchmarkYieldPerHa || 0}</p>
                    <p className="text-xs text-slate-400">kg/hectare</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase">Confidence</p>
                    <p className="text-3xl font-extrabold text-purple-700">{yieldPrediction.confidencePercent || 0}%</p>
                    <Progress value={yieldPrediction.confidencePercent || 0} className="mt-2 h-2" />
                  </div>
                  <div className="text-center p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase">Total Predicted</p>
                    <p className="text-3xl font-extrabold text-slate-700">{yieldPrediction.predictedYieldKg || 0}</p>
                    <p className="text-xs text-slate-400">kg total</p>
                  </div>
                </div>
              ) : <p className="text-slate-400 text-center py-8">No active cultivation cycle found for prediction.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SATELLITE HEALTH */}
        <TabsContent value="satellite">
          <Card>
            <CardHeader><CardTitle className="text-sm uppercase tracking-wide flex items-center gap-2"><Satellite className="w-4 h-4 text-green-600" /> Satellite Imagery Crop Health (Sentinel-2)</CardTitle></CardHeader>
            <CardContent>
              {satelliteHealth ? (
                <div className="grid grid-cols-5 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg"><p className="text-xs text-slate-500">NDVI</p><p className="text-3xl font-extrabold text-green-700">{satelliteHealth.ndviValue?.toFixed(2)}</p></div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg"><p className="text-xs text-slate-500">Health</p><p className="text-xl font-bold text-blue-700 capitalize">{satelliteHealth.healthStatus}</p></div>
                  <div className="text-center p-4 bg-emerald-50 rounded-lg"><p className="text-xs text-slate-500">Vegetation Index</p><p className="text-3xl font-extrabold text-emerald-700">{satelliteHealth.vegetationIndex?.toFixed(2)}</p></div>
                  <div className="text-center p-4 bg-cyan-50 rounded-lg"><p className="text-xs text-slate-500">Moisture</p><p className="text-3xl font-extrabold text-cyan-700">{satelliteHealth.moistureIndex?.toFixed(2)}</p></div>
                  <div className="text-center p-4 bg-slate-50 rounded-lg"><p className="text-xs text-slate-500">Resolution</p><p className="text-xl font-bold text-slate-700">{satelliteHealth.resolution || '10m'}</p><p className="text-xs text-slate-400">{satelliteHealth.source}</p></div>
                </div>
              ) : <p className="text-slate-400 text-center py-8">No satellite data available.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* WEATHER RISK */}
        <TabsContent value="weather">
          <Card>
            <CardHeader><CardTitle className="text-sm uppercase tracking-wide flex items-center gap-2"><Cloud className="w-4 h-4 text-blue-600" /> Weather-Indexed Risk Scoring</CardTitle></CardHeader>
            <CardContent>
              {weatherRisk ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-xs text-slate-500">Overall Risk Score</p>
                      <p className={`text-4xl font-extrabold ${sc(100 - (weatherRisk.overallWeatherRiskScore || 0))}`}>{weatherRisk.overallWeatherRiskScore || 0}/100</p>
                      <Badge className={`mt-2 ${weatherRisk.riskCategory === 'low' ? 'bg-green-100 text-green-700' : weatherRisk.riskCategory === 'moderate' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{weatherRisk.riskCategory?.toUpperCase()}</Badge>
                    </div>
                    <div className="text-center p-4 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500">Rainfall Deviation</p>
                      <p className="text-3xl font-extrabold text-slate-700">{weatherRisk.rainfallDeviationPercent > 0 ? '+' : ''}{weatherRisk.rainfallDeviationPercent}%</p>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <p className="text-xs text-slate-500">Temp Anomaly</p>
                      <p className="text-3xl font-extrabold text-orange-700">{weatherRisk.temperatureAnomalyCelsius > 0 ? '+' : ''}{weatherRisk.temperatureAnomalyCelsius}°C</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Drought Risk', value: weatherRisk.droughtProbabilityPercent, color: 'amber' },
                      { label: 'Flood Risk', value: weatherRisk.floodProbabilityPercent, color: 'blue' },
                      { label: 'Hail Risk', value: weatherRisk.hailRiskPercent, color: 'slate' },
                    ].map(r => (
                      <div key={r.label} className="p-3 bg-slate-50 rounded-lg">
                        <div className="flex justify-between text-xs mb-1"><span className="text-slate-500">{r.label}</span><span className="font-bold">{r.value}%</span></div>
                        <Progress value={r.value || 0} className="h-2" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : <p className="text-slate-400 text-center py-8">No weather data available.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* NPA PREDICTION */}
        <TabsContent value="npa">
          <Card>
            <CardHeader><CardTitle className="text-sm uppercase tracking-wide flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-600" /> NPA Prediction Model</CardTitle></CardHeader>
            <CardContent>
              {npaPrediction ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-6 bg-red-50 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase">NPA Probability</p>
                    <p className={`text-5xl font-extrabold ${npaPrediction.npaProbability > 50 ? 'text-red-600' : npaPrediction.npaProbability > 25 ? 'text-amber-600' : 'text-green-600'}`}>{npaPrediction.npaProbability}%</p>
                    <Badge className={`mt-2 ${npaPrediction.riskBand === 'low' ? 'bg-green-100 text-green-700' : npaPrediction.riskBand === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{npaPrediction.riskBand?.toUpperCase()} RISK</Badge>
                    {npaPrediction.earlyWarningDays && <p className="text-xs text-slate-400 mt-2">Early warning: {npaPrediction.earlyWarningDays} days before default</p>}
                  </div>
                  <div className="p-4">
                    <p className="text-xs font-semibold uppercase text-slate-500 mb-3">Contributing Factors</p>
                    {(npaPrediction.contributingFactors || []).map((f: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 mb-2">
                        <span className="text-xs w-28 text-slate-600">{f.factor}</span>
                        <Progress value={f.score || 0} className="flex-1 h-2" />
                        <span className="text-xs font-bold w-10">{f.score}</span>
                        <span className="text-xs text-slate-400 w-10">{f.weight}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <p className="text-slate-400 text-center py-8">No prediction data available.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* DYNAMIC RATE */}
        <TabsContent value="rate">
          <Card>
            <CardHeader><CardTitle className="text-sm uppercase tracking-wide flex items-center gap-2"><Percent className="w-4 h-4 text-indigo-600" /> Dynamic Interest Rate Adjustment</CardTitle></CardHeader>
            <CardContent>
              {dynamicRate ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-slate-50 rounded-lg"><p className="text-xs text-slate-500">Base Rate</p><p className="text-3xl font-extrabold text-slate-700">{dynamicRate.baseRate}%</p></div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg"><p className="text-xs text-slate-500">Effective Rate</p><p className="text-3xl font-extrabold text-blue-700">{dynamicRate.effectiveRate}%</p></div>
                    <div className="text-center p-4 bg-green-50 rounded-lg"><p className="text-xs text-slate-500">After Subvention</p><p className="text-3xl font-extrabold text-green-700">{dynamicRate.netRate}%</p></div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg"><p className="text-xs text-slate-500">Total Adjustment</p><p className="text-3xl font-extrabold text-purple-700">{(dynamicRate.adjustments || []).reduce((s: number, a: any) => s + a.adjustment, 0).toFixed(1)}%</p></div>
                  </div>
                  <Table>
                    <TableHeader><TableRow><TableHead>Factor</TableHead><TableHead>Assessment</TableHead><TableHead className="text-right">Adjustment</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {(dynamicRate.adjustments || []).map((a: any, i: number) => (
                        <TableRow key={i}><TableCell className="font-medium">{a.factor}</TableCell><TableCell className="text-slate-500">{a.reason || '—'}</TableCell><TableCell className={`text-right font-bold ${a.adjustment > 0 ? 'text-red-600' : a.adjustment < 0 ? 'text-green-600' : ''}`}>{a.adjustment > 0 ? '+' : ''}{a.adjustment}%</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : <p className="text-slate-400 text-center py-8">No active loan for rate calculation.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* RESTRUCTURING */}
        <TabsContent value="restructure">
          <Card>
            <CardHeader><CardTitle className="text-sm uppercase tracking-wide flex items-center gap-2"><RefreshCcw className="w-4 h-4 text-orange-600" /> Automated Loan Restructuring</CardTitle></CardHeader>
            <CardContent>
              {restructuring ? (
                <div>
                  <Badge className={restructuring.eligible ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'} variant="outline">
                    {restructuring.eligible ? '⚠️ Eligible for Restructuring' : '✅ No Restructuring Needed'}
                  </Badge>
                  {restructuring.options && restructuring.options.length > 0 && (
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      {restructuring.options.map((opt: any, i: number) => (
                        <Card key={i} className={`${i === 0 ? 'border-green-300 bg-green-50' : ''}`}>
                          <CardContent className="pt-4">
                            <p className="font-bold text-sm">{opt.type}</p>
                            <div className="mt-2 space-y-1 text-xs text-slate-600">
                              <p>New EMI: <span className="font-bold">{formatRupees(opt.newEmi)}</span></p>
                              <p>New Tenure: <span className="font-bold">{opt.newTenure} months</span></p>
                              <p>New Rate: <span className="font-bold">{opt.newRate}%</span></p>
                              <p>Total Cost: <span className="font-bold">{formatRupees(opt.totalCost)}</span></p>
                            </div>
                            {i === 0 && <Badge className="mt-2 bg-green-600 text-white text-xs">Recommended</Badge>}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              ) : <p className="text-slate-400 text-center py-8">No loan data available.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* COLLECTION SCHEDULE */}
        <TabsContent value="collection">
          <Card>
            <CardHeader><CardTitle className="text-sm uppercase tracking-wide flex items-center gap-2"><Calendar className="w-4 h-4 text-teal-600" /> Smart Collection Schedule</CardTitle></CardHeader>
            <CardContent>
              {collectionSchedule && collectionSchedule.schedule ? (
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Channel</TableHead><TableHead>Reason</TableHead><TableHead>Priority</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {collectionSchedule.schedule.map((s: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{s.date}</TableCell>
                        <TableCell className="font-bold">{formatRupees(s.amount)}</TableCell>
                        <TableCell><Badge variant="outline">{s.channel}</Badge></TableCell>
                        <TableCell className="text-sm text-slate-500">{s.reason}</TableCell>
                        <TableCell><Badge className={s.priority === 'high' ? 'bg-red-100 text-red-700' : s.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}>{s.priority}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : <p className="text-slate-400 text-center py-8">No collection schedule available.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* VIDEO KYC */}
        <TabsContent value="kyc">
          <Card>
            <CardHeader><CardTitle className="text-sm uppercase tracking-wide flex items-center gap-2"><Video className="w-4 h-4 text-pink-600" /> Video KYC Integration</CardTitle></CardHeader>
            <CardContent>
              {videoKyc ? (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <Progress value={videoKyc.completionPercent || 0} className="flex-1 h-3" />
                    <span className="text-sm font-bold">{videoKyc.completionPercent || 0}% Complete</span>
                  </div>
                  <div className="grid grid-cols-5 gap-3">
                    {(videoKyc.steps || []).map((step: any, i: number) => (
                      <div key={i} className={`p-4 rounded-lg text-center ${step.status === 'completed' ? 'bg-green-50' : step.status === 'in_progress' ? 'bg-blue-50' : 'bg-slate-50'}`}>
                        <p className="text-2xl mb-1">{step.status === 'completed' ? '✅' : step.status === 'in_progress' ? '🔄' : '⬜'}</p>
                        <p className="text-xs font-medium">{step.name}</p>
                        <Badge variant="outline" className="mt-1 text-xs">{step.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <p className="text-slate-400 text-center py-8">No KYC data available.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* LANGUAGES */}
        <TabsContent value="lang">
          <Card>
            <CardHeader><CardTitle className="text-sm uppercase tracking-wide flex items-center gap-2"><Languages className="w-4 h-4 text-cyan-600" /> Multi-Language Support (Bhashini)</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3">
                {languages.map((lang: any, i: number) => (
                  <div key={i} className={`p-4 rounded-lg border text-center ${lang.active ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                    <p className="text-lg font-bold">{lang.native || lang.name}</p>
                    <p className="text-xs text-slate-500">{lang.name}</p>
                    <Badge variant={lang.active ? "default" : "secondary"} className={`mt-2 text-xs ${lang.active ? 'bg-green-100 text-green-700' : ''}`}>
                      {lang.active ? '✅ Active' : '⏳ Planned'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
