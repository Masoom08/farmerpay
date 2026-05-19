import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function RootsComplianceLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-56 bg-slate-200 rounded animate-pulse" />

      {/* KPI skeletons */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 text-center space-y-2">
              <div className="h-9 w-16 mx-auto bg-slate-200 rounded animate-pulse" />
              <div className="h-3 w-20 mx-auto bg-slate-100 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Distribution chart skeleton */}
      <Card>
        <CardHeader>
          <div className="h-5 w-48 bg-slate-200 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-slate-100 rounded animate-pulse" />
        </CardContent>
      </Card>

      {/* 2-col chart skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-5 w-40 bg-slate-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-slate-100 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table skeletons */}
      {Array.from({ length: 2 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="h-5 w-36 bg-slate-200 rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="flex gap-4">
                  <div className="h-4 flex-1 bg-slate-100 rounded animate-pulse" />
                  <div className="h-4 w-16 bg-slate-100 rounded animate-pulse" />
                  <div className="h-4 w-12 bg-slate-100 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
