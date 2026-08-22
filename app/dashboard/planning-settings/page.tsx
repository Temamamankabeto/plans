"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Loader2, LockKeyhole, Save, Target, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import type { PlanningSettings } from "@/types/location/planning-record.type";

type SettingsForm = Pick<
  PlanningSettings,
  "fiscal_year" | "annual_plan_open" | "monthly_plan_open" | "monthly_achievement_open"
>;

const initialSettings: SettingsForm = {
  fiscal_year: "",
  annual_plan_open: false,
  monthly_plan_open: false,
  monthly_achievement_open: false,
};

function enabled(value: boolean | number) {
  return value === true || value === 1;
}

export default function PlanningSettingsPage() {
  const [form, setForm] = useState<SettingsForm>(initialSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadSettings() {
    setLoading(true);
    try {
      const response = await api.get("/admin/planning-settings");
      const settings = response.data?.data as PlanningSettings;
      setForm({
        fiscal_year: String(settings?.fiscal_year ?? ""),
        annual_plan_open: enabled(settings?.annual_plan_open),
        monthly_plan_open: enabled(settings?.monthly_plan_open),
        monthly_achievement_open: enabled(settings?.monthly_achievement_open),
      });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || "Unable to load planning settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  function updateFlag(
    field: "annual_plan_open" | "monthly_plan_open" | "monthly_achievement_open",
    checked: boolean,
  ) {
    setForm((current) => ({ ...current, [field]: checked }));
  }

  async function saveSettings() {
    const fiscalYear = String(form.fiscal_year).trim();
    if (!/^\d{4}$/.test(fiscalYear) || Number(fiscalYear) < 1900 || Number(fiscalYear) > 2200) {
      toast.error("Enter a valid four-digit Ethiopian fiscal year");
      return;
    }

    setSaving(true);
    try {
      const response = await api.put("/admin/planning-settings", {
        fiscal_year: fiscalYear,
        annual_plan_open: Boolean(form.annual_plan_open),
        monthly_plan_open: Boolean(form.monthly_plan_open),
        monthly_achievement_open: Boolean(form.monthly_achievement_open),
      });
      const settings = response.data?.data as PlanningSettings;
      setForm({
        fiscal_year: String(settings.fiscal_year),
        annual_plan_open: enabled(settings.annual_plan_open),
        monthly_plan_open: enabled(settings.monthly_plan_open),
        monthly_achievement_open: enabled(settings.monthly_achievement_open),
      });
      toast.success("Planning settings updated successfully");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || "Unable to update planning settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading planning settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Planning Settings</h1>
        <p className="text-sm text-muted-foreground">
          Control the active Ethiopian fiscal year and system-wide entry periods.
        </p>
      </div>

      <Alert>
        <LockKeyhole className="h-4 w-4" />
        <AlertTitle>Global planning control</AlertTitle>
        <AlertDescription>
          These settings apply to all offices. Role permissions and access mappings are still required when an
          entry period is open.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Active fiscal year
          </CardTitle>
          <CardDescription>
            New annual plans, monthly plans and achievements can only be saved for this Ethiopian fiscal year.
          </CardDescription>
        </CardHeader>
        <CardContent className="max-w-sm space-y-2">
          <Label htmlFor="fiscal-year">Ethiopian Fiscal Year</Label>
          <Input
            id="fiscal-year"
            inputMode="numeric"
            maxLength={4}
            value={form.fiscal_year}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                fiscal_year: event.target.value.replace(/\D/g, "").slice(0, 4),
              }))
            }
            placeholder="2018"
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <PeriodControl
          title="Annual Plan Entry"
          description="Allow authorized users to create and update annual plans."
          checked={Boolean(form.annual_plan_open)}
          onCheckedChange={(checked) => updateFlag("annual_plan_open", checked)}
          icon={Target}
        />
        <PeriodControl
          title="Monthly Plan Entry"
          description="Allow authorized users to divide approved annual plans into monthly targets."
          checked={Boolean(form.monthly_plan_open)}
          onCheckedChange={(checked) => updateFlag("monthly_plan_open", checked)}
          icon={CalendarClock}
        />
        <PeriodControl
          title="Monthly Achievement Entry"
          description="Allow authorized users to record achievements against monthly plans."
          checked={Boolean(form.monthly_achievement_open)}
          onCheckedChange={(checked) => updateFlag("monthly_achievement_open", checked)}
          icon={TrendingUp}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={loadSettings} disabled={saving}>
          Cancel changes
        </Button>
        <Button type="button" onClick={saveSettings} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Settings
        </Button>
      </div>
    </div>
  );
}

function PeriodControl({
  title,
  description,
  checked,
  onCheckedChange,
  icon: Icon,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  icon: typeof Target;
}) {
  return (
    <Card className={checked ? "border-primary/40" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3 text-base">
          <span className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            {title}
          </span>
          <Checkbox
            checked={checked}
            onCheckedChange={(value) => onCheckedChange(value === true)}
            aria-label={title}
          />
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <span className={checked ? "text-sm font-medium text-emerald-600" : "text-sm font-medium text-destructive"}>
          {checked ? "Open" : "Closed"}
        </span>
      </CardContent>
    </Card>
  );
}
