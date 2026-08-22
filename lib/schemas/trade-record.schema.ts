import type { TradeRecordFormInput } from '@/types/location/trade-record.type';

function text(value: unknown) {
  return String(value ?? '').trim();
}

function nullableText(value: unknown) {
  const trimmed = text(value);
  return trimmed ? trimmed : null;
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function intOrNull(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

export function validateTradeRecordInput(body: unknown): { valid: true; data: TradeRecordFormInput } | { valid: false; errors: Record<string, string> } {
  const input = (body ?? {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const periodType = text(input.period_type) as 'annual' | 'monthly';
  const commodityGroup = text(input.commodity_group);
  const commodity = text(input.commodity);
  const fiscalYear = text(input.fiscal_year);
  const month = intOrNull(input.month);

  if (!['annual', 'monthly'].includes(periodType)) errors.period_type = 'Period type must be annual or monthly.';
  if (!commodityGroup) errors.commodity_group = 'Commodity group is required.';
  if (!commodity) errors.commodity = 'Commodity is required.';
  if (!fiscalYear) errors.fiscal_year = 'Fiscal year is required.';
  if (periodType === 'monthly' && (!month || month < 1 || month > 13)) errors.month = 'Ethiopian month is required for monthly records.';
  if (periodType === 'annual' && month) errors.month = 'Month must be empty for annual plan.';
  if (periodType === 'monthly' && !intOrNull(input.annual_plan_id)) errors.annual_plan_id = 'Annual plan is required before monthly planning.';

  if (Object.keys(errors).length) return { valid: false, errors };

  const data: TradeRecordFormInput = {
    annual_plan_id: intOrNull(input.annual_plan_id),
    commodity_group: commodityGroup,
    commodity,
    specification: nullableText(input.specification),
    fiscal_year: fiscalYear,
    month: periodType === 'monthly' ? month : null,
    period_type: periodType,
    procurement_plan: numberValue(input.procurement_plan),
    domestic_market_plan: numberValue(input.domestic_market_plan),
    international_market_plan: numberValue(input.international_market_plan),
    export_quantity_plan: numberValue(input.export_quantity_plan),
    foreign_currency_plan: numberValue(input.foreign_currency_plan),
    employment_male_plan: Math.floor(numberValue(input.employment_male_plan)),
    employment_female_plan: Math.floor(numberValue(input.employment_female_plan)),
    employment_total_plan: Math.floor(numberValue(input.employment_total_plan)),
    procurement_achievement: numberValue(input.procurement_achievement),
    domestic_market_achievement: numberValue(input.domestic_market_achievement),
    international_market_achievement: numberValue(input.international_market_achievement),
    export_quantity_achievement: numberValue(input.export_quantity_achievement),
    foreign_currency_achievement: numberValue(input.foreign_currency_achievement),
    employment_male_achievement: Math.floor(numberValue(input.employment_male_achievement)),
    employment_female_achievement: Math.floor(numberValue(input.employment_female_achievement)),
    employment_total_achievement: Math.floor(numberValue(input.employment_total_achievement)),
    unit: text(input.unit) || 'Qt',
    currency_unit: text(input.currency_unit) || 'USD',
    status: ['draft', 'submitted', 'accepted', 'returned'].includes(text(input.status)) ? (text(input.status) as any) : 'draft',
  };

  data.employment_total_plan = data.employment_total_plan || ((data.employment_male_plan ?? 0) + (data.employment_female_plan ?? 0));
  data.employment_total_achievement = data.employment_total_achievement || ((data.employment_male_achievement ?? 0) + (data.employment_female_achievement ?? 0));

  return { valid: true, data };
}
