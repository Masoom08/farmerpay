"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Bell, CheckCircle, Clock } from "lucide-react";

const DEMO_NUDGES = [
  { id: 1, farmer: "Venkat Rao", type: "repayment_due", channel: "sms", sentAt: "2026-04-10", actionTaken: false, status: "delivered" },
  { id: 2, farmer: "Suresh Reddy", type: "repayment_due", channel: "whatsapp", sentAt: "2026-04-09", actionTaken: true, status: "delivered" },
  { id: 3, farmer: "Padma Bai", type: "policy_renewal", channel: "sms", sentAt: "2026-04-08", actionTaken: true, status: "delivered" },
  { id: 4, farmer: "Ramesh Kumar", type: "kyc_refresh", channel: "push", sentAt: "2026-04-07", actionTaken: false, status: "sent" },
  { id: 5, farmer: "Sita Devi", type: "subsidy_claim", channel: "ivr", sentAt: "2026-04-06", actionTaken: true, status: "acknowledged" },
  { id: 6, farmer: "Kiran Kumar", type: "repayment_due", channel: "whatsapp", sentAt: "2026-04-05", actionTaken: false, status: "delivered" },
  { id: 7, farmer: "Anjali Kumari", type: "policy_renewal", channel: "sms", sentAt: "2026-04-04", actionTaken: true, status: "delivered" },
  { id: 8, farmer: "Lakshmi Devi", type: "repayment_due", channel: "whatsapp", sentAt: "2026-04-03", actionTaken: true, status: "acknowledged" },
];

export default function SathiNudgesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemo = searchParams.has("demo");
  const [nudges, setNudges] = useState(isDemo ? DEMO_NUDGES : []);
  const [loading, setLoading] = useState(!isDemo);

  useEffect(() => {
    if (isDemo) return;
    const token = localStorage.getItem("sathi_token");
    if (!token) { router.push("/login"); return; }
    apiGet("/sathi/nudges", token)
      .then((r) => { if (Array.isArray(r.data)) setNudges(r.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isDemo, router]);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading nudges...</div>;

  const actionCount = nudges.filter((n) => n.actionTaken).length;
  const pendingCount = nudges.filter((n) => !n.actionTaken).length;
  const conversionRate = nudges.length ? Math.round((actionCount / nudges.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Nudges</h1>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold">{nudges.length}</p>
          <p className="text-xs text-slate-500">Total Sent</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-green-700">{actionCount}</p>
          <p className="text-xs text-green-600">Action Taken</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-amber-700">{pendingCount}</p>
          <p className="text-xs text-amber-600">Pending</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-emerald-700">{conversionRate}%</p>
          <p className="text-xs text-emerald-600">Conversion Rate</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" /> Nudge History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Farmer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Action Taken</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nudges.map((n) => (
                <TableRow key={n.id}>
                  <TableCell className="font-medium">{n.farmer}</TableCell>
                  <TableCell className="text-xs">{n.type.replace(/_/g, " ")}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{n.channel}</Badge></TableCell>
                  <TableCell className="text-xs text-slate-500">{n.sentAt}</TableCell>
                  <TableCell>
                    {n.actionTaken
                      ? <CheckCircle className="h-4 w-4 text-green-500" />
                      : <Clock className="h-4 w-4 text-slate-300" />
                    }
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">{n.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
