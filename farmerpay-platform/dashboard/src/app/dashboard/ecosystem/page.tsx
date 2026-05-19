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
  Globe,
  ShoppingCart,
  Landmark,
  Warehouse,
  Users,
  PawPrint,
  CloudRain,
  FileCheck,
  Ticket,
  ShieldCheck,
  BarChart3,
} from "lucide-react";
import { apiGet, formatRupees } from "@/lib/api";

export default function EcosystemPage() {
  const [loading, setLoading] = useState(true);
  const [marketplace, setMarketplace] = useState<any[]>([]);
  const [supplyChain, setSupplyChain] = useState<any>(null);
  const [warehouseFinance, setWarehouseFinance] = useState<any>(null);
  const [fpoLending, setFpoLending] = useState<any>(null);
  const [livestockInsurance, setLivestockInsurance] = useState<any>(null);
  const [weatherInsurance, setWeatherInsurance] = useState<any>(null);
  const [digiLocker, setDigiLocker] = useState<any>(null);
  const [erupiVouchers, setErupiVouchers] = useState<any>(null);
  const [crifScore, setCrifScore] = useState<any>(null);
  const [commodityHedging, setCommodityHedging] = useState<any>(null);

  useEffect(() => {
    async function load() {
      try {
        const token = localStorage.getItem("fp_token") || "";
        const results = await Promise.allSettled([
          apiGet("/vyapar/marketplace/inputs?search=", token),
          apiGet("/vyapar/supply-chain-finance/1", token),
          apiGet("/vyapar/warehouse-finance/1", token),
          apiGet("/vyapar/fpo-lending/1", token),
          apiGet("/vyapar/livestock-insurance/1", token),
          apiGet("/vyapar/weather-insurance/products", token),
          apiGet("/vyapar/digilocker/1", token),
          apiGet("/vyapar/erupi/farmer/1", token),
          apiGet("/vyapar/crif-score/1", token),
          apiGet("/vyapar/commodity-hedging/1", token),
        ]);
        if (results[0].status === "fulfilled")
          setMarketplace(results[0].value.data || []);
        if (results[1].status === "fulfilled")
          setSupplyChain(results[1].value.data);
        if (results[2].status === "fulfilled")
          setWarehouseFinance(results[2].value.data);
        if (results[3].status === "fulfilled")
          setFpoLending(results[3].value.data);
        if (results[4].status === "fulfilled")
          setLivestockInsurance(results[4].value.data);
        if (results[5].status === "fulfilled")
          setWeatherInsurance(results[5].value.data);
        if (results[6].status === "fulfilled")
          setDigiLocker(results[6].value.data);
        if (results[7].status === "fulfilled")
          setErupiVouchers(results[7].value.data);
        if (results[8].status === "fulfilled")
          setCrifScore(results[8].value.data);
        if (results[9].status === "fulfilled")
          setCommodityHedging(results[9].value.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        Loading ecosystem data...
      </div>
    );

  const features = [
    {
      name: "Farmer Marketplace",
      icon: ShoppingCart,
      tag: "Marketplace",
      color: "bg-green-100 text-green-700",
    },
    {
      name: "Supply Chain Finance",
      icon: Landmark,
      tag: "SCF",
      color: "bg-blue-100 text-blue-700",
    },
    {
      name: "Warehouse Finance",
      icon: Warehouse,
      tag: "SCF",
      color: "bg-amber-100 text-amber-700",
    },
    {
      name: "FPO Lending",
      icon: Users,
      tag: "Lending",
      color: "bg-purple-100 text-purple-700",
    },
    {
      name: "Livestock Insurance",
      icon: PawPrint,
      tag: "Insurance",
      color: "bg-pink-100 text-pink-700",
    },
    {
      name: "Weather Insurance",
      icon: CloudRain,
      tag: "Insurance",
      color: "bg-cyan-100 text-cyan-700",
    },
    {
      name: "DigiLocker",
      icon: FileCheck,
      tag: "KYC",
      color: "bg-indigo-100 text-indigo-700",
    },
    {
      name: "eRupi Vouchers",
      icon: Ticket,
      tag: "Payments",
      color: "bg-orange-100 text-orange-700",
    },
    {
      name: "CRIF Score",
      icon: ShieldCheck,
      tag: "Credit Bureau",
      color: "bg-red-100 text-red-700",
    },
    {
      name: "Commodity Hedging",
      icon: BarChart3,
      tag: "Market Data",
      color: "bg-emerald-100 text-emerald-700",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Globe className="w-6 h-6 text-purple-600" /> Ecosystem Services
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Marketplace, supply chain finance, and partner integrations — Phase 3
        </p>
      </div>

      {/* Feature Status Grid — 5x2 */}
      <div className="grid grid-cols-5 gap-3">
        {features.map((f, i) => {
          const Icon = f.icon;
          return (
            <Card
              key={i}
              className="transition-all hover:shadow-md border-green-200"
            >
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between mb-2">
                  <Icon className="w-5 h-5 text-green-600" />
                  <Badge
                    variant="outline"
                    className={`text-xs ${f.color}`}
                  >
                    {f.tag}
                  </Badge>
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  {f.name}
                </p>
                <Badge
                  variant="default"
                  className="mt-2 text-xs bg-green-100 text-green-700"
                >
                  Active
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Progress value={100} className="w-48 h-2" />
        <span className="font-semibold">10/10 features active</span>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="marketplace" className="space-y-4">
        <TabsList className="bg-slate-100 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="marketplace" className="text-xs">
            Marketplace
          </TabsTrigger>
          <TabsTrigger value="scf" className="text-xs">
            Supply Chain Finance
          </TabsTrigger>
          <TabsTrigger value="warehouse" className="text-xs">
            Warehouse Finance
          </TabsTrigger>
          <TabsTrigger value="fpo" className="text-xs">
            FPO Lending
          </TabsTrigger>
          <TabsTrigger value="livestock" className="text-xs">
            Livestock Insurance
          </TabsTrigger>
          <TabsTrigger value="weather" className="text-xs">
            Weather Insurance
          </TabsTrigger>
          <TabsTrigger value="digilocker" className="text-xs">
            DigiLocker
          </TabsTrigger>
          <TabsTrigger value="erupi" className="text-xs">
            eRupi Vouchers
          </TabsTrigger>
          <TabsTrigger value="crif" className="text-xs">
            CRIF Score
          </TabsTrigger>
          <TabsTrigger value="hedging" className="text-xs">
            Commodity Hedging
          </TabsTrigger>
        </TabsList>

        {/* 1. MARKETPLACE */}
        <TabsContent value="marketplace">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wide flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-green-600" /> Farmer
                Marketplace — Input Sellers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {marketplace.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Seller</TableHead>
                      <TableHead>Input</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Discount</TableHead>
                      <TableHead className="text-right">Rating</TableHead>
                      <TableHead className="text-right">Distance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {marketplace.map((s: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">
                          {s.sellerName || s.name}
                        </TableCell>
                        <TableCell>{s.inputType || s.input}</TableCell>
                        <TableCell>{s.brand || "—"}</TableCell>
                        <TableCell className="text-right font-bold">
                          {formatRupees(s.price || s.pricePerUnit || 0)}
                        </TableCell>
                        <TableCell className="text-right text-green-600 font-semibold">
                          {s.discountPercent || s.discount || 0}%
                        </TableCell>
                        <TableCell className="text-right">
                          {s.rating || "—"}
                        </TableCell>
                        <TableCell className="text-right text-slate-500">
                          {s.distanceKm || s.distance || "—"} km
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-slate-400 text-center py-8">
                  No marketplace data available.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. SUPPLY CHAIN FINANCE */}
        <TabsContent value="scf">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wide flex items-center gap-2">
                <Landmark className="w-4 h-4 text-blue-600" /> Supply Chain
                Finance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {supplyChain ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-xs text-slate-500 uppercase">
                        Max Finance Limit
                      </p>
                      <p className="text-3xl font-extrabold text-blue-700">
                        {formatRupees(
                          supplyChain.maxFinanceLimit ||
                            supplyChain.creditLimit ||
                            0
                        )}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-amber-50 rounded-lg">
                      <p className="text-xs text-slate-500 uppercase">
                        Utilization
                      </p>
                      <p className="text-3xl font-extrabold text-amber-700">
                        {formatRupees(
                          supplyChain.utilized || supplyChain.usedLimit || 0
                        )}
                      </p>
                      <Progress
                        value={
                          supplyChain.utilizationPercent ||
                          ((supplyChain.utilized || 0) /
                            (supplyChain.maxFinanceLimit || 1)) *
                            100
                        }
                        className="mt-2 h-2"
                      />
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-xs text-slate-500 uppercase">
                        Available
                      </p>
                      <p className="text-3xl font-extrabold text-green-700">
                        {formatRupees(
                          supplyChain.available ||
                            (supplyChain.maxFinanceLimit || 0) -
                              (supplyChain.utilized || 0)
                        )}
                      </p>
                    </div>
                  </div>
                  {(supplyChain.invoices || []).length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>Buyer</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {supplyChain.invoices.map((inv: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">
                              {inv.invoiceNumber || inv.id}
                            </TableCell>
                            <TableCell>{inv.buyerName || inv.buyer}</TableCell>
                            <TableCell className="text-right font-bold">
                              {formatRupees(inv.amount || 0)}
                            </TableCell>
                            <TableCell className="text-slate-500">
                              {inv.dueDate || "—"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  inv.status === "paid" || inv.status === "settled"
                                    ? "bg-green-100 text-green-700"
                                    : inv.status === "overdue"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-amber-100 text-amber-700"
                                }
                              >
                                {inv.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              ) : (
                <p className="text-slate-400 text-center py-8">
                  No supply chain finance data available.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. WAREHOUSE FINANCE */}
        <TabsContent value="warehouse">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wide flex items-center gap-2">
                <Warehouse className="w-4 h-4 text-amber-600" /> Warehouse
                Receipt Finance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {warehouseFinance &&
              (warehouseFinance.receipts || []).length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Commodity</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead className="text-right">LTV %</TableHead>
                      <TableHead className="text-right">Max Loan</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {warehouseFinance.receipts.map((r: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">
                          {r.commodity}
                        </TableCell>
                        <TableCell className="text-right">
                          {r.quantity} {r.unit || "MT"}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatRupees(r.value || r.marketValue || 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          {r.ltvPercent || r.ltv || 0}%
                        </TableCell>
                        <TableCell className="text-right font-bold text-green-700">
                          {formatRupees(r.maxLoan || r.eligibleLoan || 0)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              r.status === "active" || r.status === "approved"
                                ? "bg-green-100 text-green-700"
                                : r.status === "expired"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                            }
                          >
                            {r.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-slate-400 text-center py-8">
                  No warehouse receipts available.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. FPO LENDING */}
        <TabsContent value="fpo">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wide flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" /> FPO Lending
                Module
              </CardTitle>
            </CardHeader>
            <CardContent>
              {fpoLending ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <p className="text-xs text-slate-500 uppercase">
                        FPO Name
                      </p>
                      <p className="text-lg font-bold text-purple-700">
                        {fpoLending.fpoName || fpoLending.name || "—"}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-xs text-slate-500 uppercase">
                        Members
                      </p>
                      <p className="text-3xl font-extrabold text-blue-700">
                        {fpoLending.totalMembers || fpoLending.members || 0}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-xs text-slate-500 uppercase">
                        Total Disbursed
                      </p>
                      <p className="text-2xl font-extrabold text-green-700">
                        {formatRupees(
                          fpoLending.totalDisbursed ||
                            fpoLending.disbursedAmount ||
                            0
                        )}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-amber-50 rounded-lg">
                      <p className="text-xs text-slate-500 uppercase">
                        Outstanding
                      </p>
                      <p className="text-2xl font-extrabold text-amber-700">
                        {formatRupees(
                          fpoLending.outstanding ||
                            fpoLending.outstandingAmount ||
                            0
                        )}
                      </p>
                    </div>
                  </div>
                  {(fpoLending.memberLoans || fpoLending.loans || []).length >
                    0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Member</TableHead>
                          <TableHead className="text-right">
                            Loan Amount
                          </TableHead>
                          <TableHead className="text-right">
                            Outstanding
                          </TableHead>
                          <TableHead>Purpose</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(fpoLending.memberLoans || fpoLending.loans || []).map(
                          (l: any, i: number) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">
                                {l.memberName || l.name}
                              </TableCell>
                              <TableCell className="text-right font-bold">
                                {formatRupees(l.loanAmount || l.amount || 0)}
                              </TableCell>
                              <TableCell className="text-right text-amber-600 font-semibold">
                                {formatRupees(l.outstanding || 0)}
                              </TableCell>
                              <TableCell className="text-slate-500">
                                {l.purpose || "—"}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={
                                    l.status === "active" ||
                                    l.status === "current"
                                      ? "bg-green-100 text-green-700"
                                      : l.status === "overdue"
                                      ? "bg-red-100 text-red-700"
                                      : "bg-amber-100 text-amber-700"
                                  }
                                >
                                  {l.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          )
                        )}
                      </TableBody>
                    </Table>
                  )}
                </div>
              ) : (
                <p className="text-slate-400 text-center py-8">
                  No FPO lending data available.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. LIVESTOCK INSURANCE */}
        <TabsContent value="livestock">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wide flex items-center gap-2">
                <PawPrint className="w-4 h-4 text-pink-600" /> Livestock
                Insurance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {livestockInsurance &&
              (livestockInsurance.policies || livestockInsurance.animals || [])
                .length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Animal Type</TableHead>
                      <TableHead>Breed</TableHead>
                      <TableHead>Tag ID</TableHead>
                      <TableHead className="text-right">Sum Insured</TableHead>
                      <TableHead className="text-right">Premium</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(
                      livestockInsurance.policies ||
                      livestockInsurance.animals ||
                      []
                    ).map((p: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">
                          {p.animalType || p.type}
                        </TableCell>
                        <TableCell>{p.breed || "—"}</TableCell>
                        <TableCell className="text-slate-500">
                          {p.tagId || p.earTag || "—"}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatRupees(p.sumInsured || 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatRupees(p.premium || 0)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              p.status === "active"
                                ? "bg-green-100 text-green-700"
                                : p.status === "expired"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                            }
                          >
                            {p.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-slate-400 text-center py-8">
                  No livestock insurance data available.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 6. WEATHER INSURANCE */}
        <TabsContent value="weather">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wide flex items-center gap-2">
                <CloudRain className="w-4 h-4 text-cyan-600" /> Weather
                Insurance Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              {weatherInsurance &&
              (weatherInsurance.products || weatherInsurance || []).length >
                0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Trigger Type</TableHead>
                      <TableHead>Threshold</TableHead>
                      <TableHead className="text-right">Premium</TableHead>
                      <TableHead>Payout Structure</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(
                      weatherInsurance.products ||
                      (Array.isArray(weatherInsurance) ? weatherInsurance : [])
                    ).map((p: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">
                          {p.productName || p.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {p.triggerType || p.trigger}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {p.threshold || p.triggerThreshold || "—"}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatRupees(p.premium || p.premiumAmount || 0)}
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {p.payoutStructure || p.payout || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-slate-400 text-center py-8">
                  No weather insurance products available.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 7. DIGILOCKER */}
        <TabsContent value="digilocker">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wide flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-indigo-600" /> DigiLocker
                Integration
              </CardTitle>
            </CardHeader>
            <CardContent>
              {digiLocker ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-600">
                      Connection Status:
                    </span>
                    <Badge
                      className={
                        digiLocker.connected || digiLocker.status === "linked"
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }
                    >
                      {digiLocker.connected || digiLocker.status === "linked"
                        ? "Connected"
                        : "Not Connected"}
                    </Badge>
                  </div>
                  {(digiLocker.documents || []).length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Document Type</TableHead>
                          <TableHead>Issuer</TableHead>
                          <TableHead>Issue Date</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {digiLocker.documents.map((d: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">
                              {d.documentType || d.type}
                            </TableCell>
                            <TableCell className="text-slate-500">
                              {d.issuer || d.issuedBy || "—"}
                            </TableCell>
                            <TableCell className="text-slate-500">
                              {d.issueDate || d.date || "—"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  d.status === "verified" ||
                                  d.status === "fetched"
                                    ? "bg-green-100 text-green-700"
                                    : d.status === "expired"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-amber-100 text-amber-700"
                                }
                              >
                                {d.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              ) : (
                <p className="text-slate-400 text-center py-8">
                  No DigiLocker data available.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 8. eRUPI VOUCHERS */}
        <TabsContent value="erupi">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wide flex items-center gap-2">
                <Ticket className="w-4 h-4 text-orange-600" /> eRupi Voucher
                Disbursement
              </CardTitle>
            </CardHeader>
            <CardContent>
              {erupiVouchers ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <p className="text-xs text-slate-500 uppercase">
                        Total Vouchers
                      </p>
                      <p className="text-3xl font-extrabold text-orange-700">
                        {erupiVouchers.totalVouchers ||
                          (erupiVouchers.vouchers || []).length ||
                          0}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-xs text-slate-500 uppercase">
                        Redeemed
                      </p>
                      <p className="text-3xl font-extrabold text-green-700">
                        {formatRupees(
                          erupiVouchers.totalRedeemed ||
                            erupiVouchers.redeemedAmount ||
                            0
                        )}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-xs text-slate-500 uppercase">
                        Pending
                      </p>
                      <p className="text-3xl font-extrabold text-blue-700">
                        {formatRupees(
                          erupiVouchers.totalPending ||
                            erupiVouchers.pendingAmount ||
                            0
                        )}
                      </p>
                    </div>
                  </div>
                  {(erupiVouchers.vouchers || []).length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Voucher ID</TableHead>
                          <TableHead>Scheme</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Expiry</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {erupiVouchers.vouchers.map((v: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium font-mono text-xs">
                              {v.voucherId || v.id}
                            </TableCell>
                            <TableCell>{v.scheme || v.schemeName}</TableCell>
                            <TableCell className="text-right font-bold">
                              {formatRupees(v.amount || 0)}
                            </TableCell>
                            <TableCell className="text-slate-500">
                              {v.expiryDate || v.expiry || "—"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  v.status === "redeemed"
                                    ? "bg-green-100 text-green-700"
                                    : v.status === "expired"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-amber-100 text-amber-700"
                                }
                              >
                                {v.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              ) : (
                <p className="text-slate-400 text-center py-8">
                  No eRupi voucher data available.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 9. CRIF SCORE */}
        <TabsContent value="crif">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wide flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-red-600" /> CRIF High Mark
                Credit Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              {crifScore ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-6 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 uppercase">
                        Credit Score
                      </p>
                      <p
                        className={`text-5xl font-extrabold ${
                          (crifScore.score || 0) >= 700
                            ? "text-green-600"
                            : (crifScore.score || 0) >= 500
                            ? "text-amber-600"
                            : "text-red-600"
                        }`}
                      >
                        {crifScore.score || 0}
                      </p>
                      <Progress
                        value={((crifScore.score || 0) / 900) * 100}
                        className="mt-3 h-3"
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        Range: 300 — 900
                      </p>
                    </div>
                    <div className="text-center p-6 bg-blue-50 rounded-lg">
                      <p className="text-xs text-slate-500 uppercase">
                        Rating
                      </p>
                      <p className="text-3xl font-extrabold text-blue-700">
                        {crifScore.rating || crifScore.grade || "—"}
                      </p>
                    </div>
                    <div className="text-center p-6 bg-green-50 rounded-lg">
                      <p className="text-xs text-slate-500 uppercase">
                        Report Date
                      </p>
                      <p className="text-lg font-bold text-green-700">
                        {crifScore.reportDate || crifScore.fetchedAt || "—"}
                      </p>
                    </div>
                  </div>

                  {(crifScore.factors || []).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-500 mb-3">
                        Contributing Factors
                      </p>
                      {crifScore.factors.map((f: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 mb-2">
                          <span className="text-xs w-40 text-slate-600">
                            {f.factor || f.name}
                          </span>
                          <Progress
                            value={f.impact || f.score || 0}
                            className="flex-1 h-2"
                          />
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              (f.impact || f.score || 0) >= 70
                                ? "text-green-600 border-green-200"
                                : (f.impact || f.score || 0) >= 40
                                ? "text-amber-600 border-amber-200"
                                : "text-red-600 border-red-200"
                            }`}
                          >
                            {f.impact || f.score || 0}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  {(crifScore.loanHistory || crifScore.accounts || []).length >
                    0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Lender</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">
                            Outstanding
                          </TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(crifScore.loanHistory || crifScore.accounts || []).map(
                          (l: any, i: number) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">
                                {l.lender || l.institution}
                              </TableCell>
                              <TableCell className="text-slate-500">
                                {l.loanType || l.type}
                              </TableCell>
                              <TableCell className="text-right font-bold">
                                {formatRupees(l.amount || l.sanctioned || 0)}
                              </TableCell>
                              <TableCell className="text-right text-amber-600 font-semibold">
                                {formatRupees(l.outstanding || l.balance || 0)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={
                                    l.status === "closed" ||
                                    l.status === "settled"
                                      ? "bg-green-100 text-green-700"
                                      : l.status === "overdue" ||
                                        l.status === "default"
                                      ? "bg-red-100 text-red-700"
                                      : "bg-amber-100 text-amber-700"
                                  }
                                >
                                  {l.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          )
                        )}
                      </TableBody>
                    </Table>
                  )}
                </div>
              ) : (
                <p className="text-slate-400 text-center py-8">
                  No CRIF score data available.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 10. COMMODITY HEDGING */}
        <TabsContent value="hedging">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wide flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" /> Commodity
                Futures Hedging Advisory
              </CardTitle>
            </CardHeader>
            <CardContent>
              {commodityHedging ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-emerald-50 rounded-lg">
                      <p className="text-xs text-slate-500 uppercase">
                        Spot Price
                      </p>
                      <p className="text-3xl font-extrabold text-emerald-700">
                        {formatRupees(
                          commodityHedging.spotPrice ||
                            commodityHedging.currentPrice ||
                            0
                        )}
                      </p>
                      <p className="text-xs text-slate-400">
                        per {commodityHedging.unit || "quintal"}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-xs text-slate-500 uppercase">
                        Futures Price
                      </p>
                      <p className="text-3xl font-extrabold text-blue-700">
                        {formatRupees(
                          commodityHedging.futuresPrice ||
                            commodityHedging.nearMonthFuture ||
                            0
                        )}
                      </p>
                      <p className="text-xs text-slate-400">
                        {commodityHedging.futuresExpiry ||
                          commodityHedging.expiryMonth ||
                          "Near month"}
                      </p>
                    </div>
                    <div
                      className={`text-center p-4 rounded-lg ${
                        (commodityHedging.basisSpread ||
                          (commodityHedging.futuresPrice || 0) -
                            (commodityHedging.spotPrice || 0)) > 0
                          ? "bg-green-50"
                          : "bg-red-50"
                      }`}
                    >
                      <p className="text-xs text-slate-500 uppercase">
                        Basis Spread
                      </p>
                      <p
                        className={`text-3xl font-extrabold ${
                          (commodityHedging.basisSpread ||
                            (commodityHedging.futuresPrice || 0) -
                              (commodityHedging.spotPrice || 0)) > 0
                            ? "text-green-700"
                            : "text-red-700"
                        }`}
                      >
                        {formatRupees(
                          commodityHedging.basisSpread ||
                            (commodityHedging.futuresPrice || 0) -
                              (commodityHedging.spotPrice || 0)
                        )}
                      </p>
                    </div>
                  </div>

                  {commodityHedging.recommendation && (
                    <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                      <p className="text-xs font-semibold uppercase text-indigo-600 mb-1">
                        Hedge Recommendation
                      </p>
                      <p className="text-sm text-indigo-800 font-medium">
                        {commodityHedging.recommendation}
                      </p>
                      {commodityHedging.hedgePercent && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-slate-500">
                            Suggested Hedge:
                          </span>
                          <Progress
                            value={commodityHedging.hedgePercent}
                            className="w-32 h-2"
                          />
                          <span className="text-xs font-bold">
                            {commodityHedging.hedgePercent}%
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {(commodityHedging.contracts || []).length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Contract</TableHead>
                          <TableHead>Expiry</TableHead>
                          <TableHead className="text-right">
                            Lots
                          </TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead className="text-right">
                            Margin Required
                          </TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {commodityHedging.contracts.map(
                          (c: any, i: number) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">
                                {c.contractName || c.commodity}
                              </TableCell>
                              <TableCell className="text-slate-500">
                                {c.expiry || c.expiryDate}
                              </TableCell>
                              <TableCell className="text-right">
                                {c.lots || c.quantity}
                              </TableCell>
                              <TableCell className="text-right font-bold">
                                {formatRupees(c.price || 0)}
                              </TableCell>
                              <TableCell className="text-right text-amber-600 font-semibold">
                                {formatRupees(c.margin || c.marginRequired || 0)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={
                                    c.status === "active" || c.status === "open"
                                      ? "bg-green-100 text-green-700"
                                      : c.status === "expired"
                                      ? "bg-red-100 text-red-700"
                                      : "bg-amber-100 text-amber-700"
                                  }
                                >
                                  {c.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          )
                        )}
                      </TableBody>
                    </Table>
                  )}
                </div>
              ) : (
                <p className="text-slate-400 text-center py-8">
                  No commodity hedging data available.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
