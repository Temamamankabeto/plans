import { Suspense } from "react";
import { PlanningReportPage } from "@/components/planning-records/PlanningReportPage";

export default function PlanningRecordsReportRoute() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading report...</div>}>
      <PlanningReportPage />
    </Suspense>
  );
}
