"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SathiDrishtiHub() {
  const [farmerId, setFarmerId] = useState("");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">DRISHTI — Sathi Field Tool</h1>
        <p className="text-sm text-slate-500">Guided scenario builder for farmer visits — collect household data, run simulations, share results</p>
      </div>

      {/* Farmer Lookup */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Select Farmer</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3">
            <Input placeholder="Enter Farmer ID" value={farmerId} onChange={(e) => setFarmerId(e.target.value)} className="max-w-xs" />
          </div>
          {farmerId && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
              <Link href={`/dashboard/sathi/drishti/household/${farmerId}`}>
                <Card className="cursor-pointer hover:shadow-md border-l-4 border-l-green-500">
                  <CardContent className="pt-4 pb-3">
                    <p className="font-bold">🏠 Household Data Collection</p>
                    <p className="text-xs text-slate-500 mt-1">Collect income sources & expenses, then run portfolio optimizer</p>
                  </CardContent>
                </Card>
              </Link>
              <Link href={`/dashboard/sathi/drishti/insurance/${farmerId}`}>
                <Card className="cursor-pointer hover:shadow-md border-l-4 border-l-purple-500">
                  <CardContent className="pt-4 pb-3">
                    <p className="font-bold">🛡️ Insurance Advisor</p>
                    <p className="text-xs text-slate-500 mt-1">Help farmer decide on PMFBY / livestock insurance</p>
                  </CardContent>
                </Card>
              </Link>
              <Link href={`/dashboard/drishti/farmer-risk/${farmerId}`}>
                <Card className="cursor-pointer hover:shadow-md border-l-4 border-l-blue-500">
                  <CardContent className="pt-4 pb-3">
                    <p className="font-bold">📊 Full Risk Profile</p>
                    <p className="text-xs text-slate-500 mt-1">View all DRISHTI scenarios and risk scores for this farmer</p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Guide */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Field Visit Workflow</CardTitle></CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm text-slate-600">
            <li className="flex gap-2"><span className="font-bold text-green-600">1.</span> Enter farmer ID and select "Household Data Collection"</li>
            <li className="flex gap-2"><span className="font-bold text-green-600">2.</span> Record all income sources (SHG, wage, pension, remittance, etc.)</li>
            <li className="flex gap-2"><span className="font-bold text-green-600">3.</span> Record monthly expenses by category</li>
            <li className="flex gap-2"><span className="font-bold text-green-600">4.</span> Run the Portfolio Optimizer to see the household financial picture</li>
            <li className="flex gap-2"><span className="font-bold text-green-600">5.</span> Share results with farmer via WhatsApp</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
