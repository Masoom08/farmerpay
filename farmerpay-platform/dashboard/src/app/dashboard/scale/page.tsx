"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  Code2,
  Link as LinkIcon,
  Network,
  Server,
  MapPin,
  FileText,
  BarChart3,
} from "lucide-react";
import { apiGet, formatRupees } from "@/lib/api";

export default function ScalePage() {
  const [loading, setLoading] = useState(true);
  const [multiBankConfig, setMultiBankConfig] = useState<any>(null);
  const [apiMarketplace, setApiMarketplace] = useState<any>(null);
  const [aaStatus, setAaStatus] = useState<any>(null);
  const [ocenNetwork, setOcenNetwork] = useState<any>(null);
  const [cbsIntegrations, setCbsIntegrations] = useState<any>(null);
  const [stateCustomization, setStateCustomization] = useState<any>(null);
  const [regulatoryReports, setRegulatoryReports] = useState<any>(null);
  const [benchmarks, setBenchmarks] = useState<any>(null);

  useEffect(() => {
    async function load() {
      try {
        const token = localStorage.getItem("fp_token") || "";
        const results = await Promise.allSettled([
          apiGet("/bank/multi-bank/config", token),
          apiGet("/bank/open-api/marketplace", token),
          apiGet("/bank/account-aggregator/1", token),
          apiGet("/bank/ocen/network", token),
          apiGet("/bank/cbs/integrations", token),
          apiGet("/bank/state-customization", token),
          apiGet("/bank/regulatory-reports", token),
          apiGet("/bank/benchmarks", token),
        ]);
        if (results[0].status === "fulfilled") setMultiBankConfig(results[0].value.data);
        if (results[1].status === "fulfilled") setApiMarketplace(results[1].value.data);
        if (results[2].status === "fulfilled") setAaStatus(results[2].value.data);
        if (results[3].status === "fulfilled") setOcenNetwork(results[3].value.data);
        if (results[4].status === "fulfilled") setCbsIntegrations(results[4].value.data);
        if (results[5].status === "fulfilled") setStateCustomization(results[5].value.data);
        if (results[6].status === "fulfilled") setRegulatoryReports(results[6].value.data);
        if (results[7].status === "fulfilled") setBenchmarks(results[7].value.data);
      } catch (e) {
        console.error("Scale load error:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const featureCards = [
    { title: "Multi-Bank", desc: "5 banks onboarded", icon: Building2, color: "text-blue-600 bg-blue-50" },
    { title: "Open API", desc: "15 APIs published", icon: Code2, color: "text-purple-600 bg-purple-50" },
    { title: "Account Aggregator", desc: "3 AA providers", icon: LinkIcon, color: "text-green-600 bg-green-50" },
    { title: "OCEN Network", desc: "Registered as BA", icon: Network, color: "text-orange-600 bg-orange-50" },
    { title: "CBS Integration", desc: "4 CBS platforms", icon: Server, color: "text-indigo-600 bg-indigo-50" },
    { title: "State Customization", desc: "5 states configured", icon: MapPin, color: "text-teal-600 bg-teal-50" },
    { title: "Regulatory Reports", desc: "6 report types", icon: FileText, color: "text-red-600 bg-red-50" },
    { title: "Benchmarks", desc: "6 metrics tracked", icon: BarChart3, color: "text-amber-600 bg-amber-50" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400 text-sm">Loading Scale Platform...</p>
      </div>
    );
  }

  const banks = multiBankConfig?.banks || [];
  const apis = apiMarketplace?.apis || [];
  const cbsList = cbsIntegrations?.integrations || [];
  const states = stateCustomization?.states || [];
  const reports = regulatoryReports?.reports || [];
  const benchmarkData = benchmarks?.benchmarks || [];
  const ocen = ocenNetwork || {};
  const aa = aaStatus || {};

  const uniqueMetrics: string[] = benchmarkData.reduce((acc: string[], b: any) => {
    const m = String(b.metric);
    if (!acc.includes(m)) acc.push(m);
    return acc;
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Scale Platform</h1>
      <p className="text-sm text-slate-500">
        Phase 4 — Multi-bank support, open APIs, and national rollout capabilities.
      </p>

      {/* Feature Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {featureCards.map((f) => (
          <Card key={f.title} className="card-hover">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${f.color}`}>
                <f.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{f.title}</p>
                <p className="text-xs text-slate-500">{f.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="multi-bank" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="multi-bank">Multi-Bank</TabsTrigger>
          <TabsTrigger value="open-api">Open API</TabsTrigger>
          <TabsTrigger value="aa">Account Aggregator</TabsTrigger>
          <TabsTrigger value="ocen">OCEN</TabsTrigger>
          <TabsTrigger value="cbs">CBS Integration</TabsTrigger>
          <TabsTrigger value="state">State Customization</TabsTrigger>
          <TabsTrigger value="regulatory">Regulatory Reports</TabsTrigger>
          <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
        </TabsList>

        {/* ── 1. Multi-Bank ────────────────────────────────────── */}
        <TabsContent value="multi-bank">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Multi-Bank White-Label Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bank</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Farmers</TableHead>
                    <TableHead className="text-right">Portfolio</TableHead>
                    <TableHead className="text-right">NPA %</TableHead>
                    <TableHead>Modules</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {banks.map((b: any) => (
                    <TableRow key={b.bankId}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: b.primaryColor }}
                          />
                          {b.bankName}
                        </div>
                      </TableCell>
                      <TableCell>{b.bankCode}</TableCell>
                      <TableCell>
                        <Badge variant={b.isActive ? "default" : "secondary"}>
                          {b.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{b.farmerCount.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{formatRupees(b.portfolioSize)}</TableCell>
                      <TableCell className="text-right">{b.npaRate}%</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {b.modules.map((m: string) => (
                            <Badge key={m} variant="outline" className="text-[10px]">{m}</Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── 2. Open API ──────────────────────────────────────── */}
        <TabsContent value="open-api">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">API Marketplace</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>API Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Auth</TableHead>
                    <TableHead className="text-right">Rate Limit</TableHead>
                    <TableHead>Pricing</TableHead>
                    <TableHead className="text-right">Subscribers</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apis.map((a: any) => (
                    <TableRow key={a.apiId}>
                      <TableCell className="font-medium">{a.apiName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] capitalize">{a.category}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{a.version}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px]">{a.method}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{a.authType}</TableCell>
                      <TableCell className="text-right text-xs">{a.rateLimit}/hr</TableCell>
                      <TableCell className="text-xs">{a.pricing}</TableCell>
                      <TableCell className="text-right">{a.subscribers}</TableCell>
                      <TableCell>
                        <Badge
                          variant={a.status === "published" ? "default" : a.status === "beta" ? "secondary" : "destructive"}
                          className="text-[10px]"
                        >
                          {a.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── 3. Account Aggregator ────────────────────────────── */}
        <TabsContent value="aa">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account Aggregator Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-500 mb-1">Connection Status</p>
                    <Badge variant={aa.connected ? "default" : "secondary"}>
                      {aa.connected ? "Connected" : "Not Connected"}
                    </Badge>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-500 mb-1">Consent Status</p>
                    <Badge variant="outline">{aa.consentStatus || "N/A"}</Badge>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-500 mb-1">Last Fetch</p>
                    <p className="text-sm font-medium">{aa.lastFetchDate || "Never"}</p>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Available AA Providers</h3>
                <div className="flex gap-2">
                  {(aa.availableProviders || []).map((p: any) => (
                    <Badge key={p.name} variant="outline" className="text-xs">{p.name} ({p.type})</Badge>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Supported FI Types</h3>
                <div className="flex gap-2 flex-wrap">
                  {(aa.fiTypes || []).map((fi: string) => (
                    <Badge key={fi} variant="secondary" className="text-[10px]">{fi}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── 4. OCEN ──────────────────────────────────────────── */}
        <TabsContent value="ocen">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">OCEN Lending Network</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-500 mb-1">Network Status</p>
                    <Badge variant="default">{ocen.networkStatus}</Badge>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-500 mb-1">Borrower Agent ID</p>
                    <p className="text-sm font-mono font-medium">{ocen.borrowerAgentId}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-500 mb-1">Total Disbursed</p>
                    <p className="text-sm font-medium">{formatRupees(ocen.totalDisbursed)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-500 mb-1">Active Loans</p>
                    <p className="text-sm font-medium">{ocen.activeLoanCount}</p>
                  </CardContent>
                </Card>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Lender</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Min Amount</TableHead>
                    <TableHead className="text-right">Max Amount</TableHead>
                    <TableHead>Tenure</TableHead>
                    <TableHead className="text-right">Interest %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(ocen.products || []).map((p: any) => (
                    <TableRow key={p.productId}>
                      <TableCell className="font-medium">{p.productName}</TableCell>
                      <TableCell>{p.lenderName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] uppercase">{p.type}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatRupees(p.minAmount)}</TableCell>
                      <TableCell className="text-right">{formatRupees(p.maxAmount)}</TableCell>
                      <TableCell className="text-xs">{p.tenure}</TableCell>
                      <TableCell className="text-right">{p.interestRate}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── 5. CBS Integration ───────────────────────────────── */}
        <TabsContent value="cbs">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Core Banking System Integrations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cbsList.map((cbs: any) => (
                <Card key={cbs.cbsName}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{cbs.cbsName}</p>
                        <p className="text-xs text-slate-500">{cbs.vendor} &middot; {cbs.version}</p>
                      </div>
                      <Badge
                        variant={cbs.status === "active" ? "default" : "secondary"}
                      >
                        {cbs.status}
                      </Badge>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pathway</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cbs.pathways.map((pw: any) => (
                          <TableRow key={pw.name}>
                            <TableCell className="font-medium text-xs">{pw.name}</TableCell>
                            <TableCell>
                              <Badge
                                variant={pw.status === "active" ? "default" : "secondary"}
                                className="text-[10px]"
                              >
                                {pw.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-slate-500">{pw.description}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── 6. State Customization ───────────────────────────── */}
        <TabsContent value="state">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {states.map((s: any) => (
              <Card key={s.stateId}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{s.stateName}</span>
                    <Badge variant={s.isActive ? "default" : "secondary"}>
                      {s.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Crops Focused</p>
                    <div className="flex gap-1 flex-wrap">
                      {s.cropsFocused.map((c: string) => (
                        <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Mandis Connected</span>
                    <span className="font-semibold">{s.mandisConnected}</span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Languages</p>
                    <div className="flex gap-1">
                      {s.languageSupported.map((l: string) => (
                        <Badge key={l} variant="secondary" className="text-[10px]">{l}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">SoF Configured</span>
                    <Badge variant={s.sofConfigured ? "default" : "secondary"} className="text-[10px]">
                      {s.sofConfigured ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Custom Rules</p>
                    <ul className="text-xs text-slate-600 space-y-0.5">
                      {s.customRules.map((r: string, i: number) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-slate-400 mt-0.5">-</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── 7. Regulatory Reports ────────────────────────────── */}
        <TabsContent value="regulatory">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Regulatory Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Regulator</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Last Generated</TableHead>
                    <TableHead>Next Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Download</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((r: any) => (
                    <TableRow key={r.reportId}>
                      <TableCell className="font-medium">{r.reportName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] capitalize">{r.frequency}</Badge>
                      </TableCell>
                      <TableCell className="text-xs font-medium">{r.regulator}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] uppercase">{r.format}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{r.lastGenerated}</TableCell>
                      <TableCell className="text-xs">{r.nextDue}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            r.status === "generated" ? "default"
                            : r.status === "overdue" ? "destructive"
                            : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {r.downloadUrl ? (
                          <span className="text-xs text-blue-600 cursor-pointer hover:underline">
                            Download
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">N/A</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── 8. Benchmarks ────────────────────────────────────── */}
        <TabsContent value="benchmarks">
          <div className="space-y-4">
            {uniqueMetrics.map((metric) => {
              const rows = benchmarkData.filter((b: any) => b.metric === metric);
              const sorted = [...rows].sort((a: any, b: any) => a.rank - b.rank);
              return (
                <Card key={metric}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{metric}</span>
                      <Badge variant="outline" className="text-xs">
                        Industry Avg: {sorted[0]?.industryAvg}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rank</TableHead>
                          <TableHead>Bank</TableHead>
                          <TableHead className="text-right">Value</TableHead>
                          <TableHead>Percentile</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sorted.map((b: any) => (
                          <TableRow key={b.bankName}>
                            <TableCell className="font-semibold">#{b.rank}</TableCell>
                            <TableCell className="font-medium">{b.bankName}</TableCell>
                            <TableCell className="text-right">{b.value}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={b.percentile} className="h-2 w-24" />
                                <span className="text-xs text-slate-500 w-8">{b.percentile}%</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
