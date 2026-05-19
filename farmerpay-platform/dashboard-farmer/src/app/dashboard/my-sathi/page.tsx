"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  HandHelping, Phone, MapPin, Star, MessageCircle, RefreshCw, Shield,
} from "lucide-react";

export default function MySathiPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">My Sathi</h1>

      {/* Current Sathi card */}
      <Card className="border-l-4 border-l-emerald-500">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-2xl font-bold text-emerald-700">
              PS
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold">Priya Sharma</h2>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Bank Sakhi</Badge>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> 9999000001</span>
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Kothapally, Rangareddy</span>
                <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-500" /> 4.6 / 5.0</span>
              </div>
              <p className="text-sm text-slate-600 mt-3">
                Priya has been helping farmers in Kothapally village for 3 years. She specializes in crop loans, PMFBY insurance, and KYC verification.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="outline" className="text-xs">Loans</Badge>
                <Badge variant="outline" className="text-xs">Insurance</Badge>
                <Badge variant="outline" className="text-xs">KYC Help</Badge>
                <Badge variant="outline" className="text-xs">Data Entry</Badge>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Phone className="h-4 w-4 mr-2" /> Call Sathi
            </Button>
            <Button variant="outline">
              <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
            </Button>
            <Button variant="outline" className="text-amber-700 border-amber-300 hover:bg-amber-50">
              <Star className="h-4 w-4 mr-2" /> Rate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Services provided */}
      <Card>
        <CardHeader><CardTitle className="text-base">What your Sathi helps with</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50/50">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center"><HandHelping className="h-4 w-4 text-blue-600" /></div>
              <div>
                <p className="text-sm font-medium">Loan Application</p>
                <p className="text-xs text-slate-500">Fill forms, gather documents, submit to bank</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-50/50">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center"><Shield className="h-4 w-4 text-purple-600" /></div>
              <div>
                <p className="text-sm font-medium">Insurance Enrollment</p>
                <p className="text-xs text-slate-500">PMFBY, livestock, health policy signup</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50/50">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center"><RefreshCw className="h-4 w-4 text-green-600" /></div>
              <div>
                <p className="text-sm font-medium">Data Entry & Updates</p>
                <p className="text-xs text-slate-500">Profile updates, activity logging, KYC refresh</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50/50">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center"><MessageCircle className="h-4 w-4 text-amber-600" /></div>
              <div>
                <p className="text-sm font-medium">Issue Resolution</p>
                <p className="text-xs text-slate-500">Flag problems to banker, follow up on claims</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent interactions */}
      <Card>
        <CardHeader><CardTitle className="text-base">Recent Interactions</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { date: "2026-04-08", action: "Sent repayment reminder for Apr EMI", type: "nudge" },
              { date: "2026-04-05", action: "Helped fill PMFBY claim form for crop damage", type: "assist" },
              { date: "2026-03-28", action: "Updated bank passbook details in profile", type: "data_entry" },
              { date: "2026-03-15", action: "Facilitated loan disbursement verification", type: "verification" },
              { date: "2026-02-28", action: "Helped submit KCC crop loan application", type: "loan" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                <span className="text-xs text-slate-400 w-20">{item.date}</span>
                <span className="text-sm text-slate-700">{item.action}</span>
                <Badge variant="outline" className="text-[10px] ml-auto">{item.type.replace("_", " ")}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Change request */}
      <Card className="bg-slate-50">
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Want a different Sathi?</p>
            <p className="text-xs text-slate-500">You can request a change if your needs have changed.</p>
          </div>
          <Button variant="outline" size="sm">Request Change</Button>
        </CardContent>
      </Card>
    </div>
  );
}
