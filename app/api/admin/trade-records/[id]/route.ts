import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/server/auth";
import { query, transaction } from "@/lib/server/db";
import { fail, ok } from "@/lib/server/response";
import { getTradeAccess } from "@/lib/server/trade-access";
import { entryAllowed, fiscalYearAllowed, getPlanningSettings, isSuperAdmin } from "@/lib/server/planning-record-rules";
import { createUserNotification } from "@/lib/server/notifications";

async function getUserContext(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth?.id) return { auth: null, user: null };
  const rows = await query<any[]>(
    `SELECT u.*, o.name AS office_name, d.name AS directorate_name, t.name AS team_name
     FROM users u
     LEFT JOIN offices o ON o.id = u.office_id
     LEFT JOIN directorates d ON d.id = u.directorate_id
     LEFT JOIN teams t ON t.id = u.team_id
     WHERE u.id = ? LIMIT 1`,
    [auth.id]
  );
  return { auth, user: rows[0] ?? null };
}

function numberValue(value: unknown) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { auth, user } = await getUserContext(request);
  if (!auth || !user) return fail("Unauthenticated", 401);

  const rows = await query<any[]>("SELECT * FROM trade_records WHERE id=? LIMIT 1", [id]);
  const record = rows[0];
  if (!record) return fail("Trade record not found", 404);

  const access = getTradeAccess(user, auth.roles);
  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? "");

  if (action === "approve" || action === "comment" || action === "return") {
    if (!access.canApprove) return fail("You do not have permission to review Trade records", 403);
    const status = action === "approve" ? "approved" : action === "return" ? "returned" : "commented";
    await transaction(async (connection) => {
      await connection.execute(
        `UPDATE trade_records SET status=?, review_comment=?, approved_by=?, approved_at=IF(?='approved', NOW(), approved_at) WHERE id=?`,
        [status, body.comment ?? null, auth.id, status, id]
      );
      await connection.execute(
        `INSERT INTO trade_review_history (trade_record_id, action, comment, acted_by) VALUES (?, ?, ?, ?)`,
        [id, action, body.comment ?? null, auth.id]
      );
    });
    const ownerId = Number(record.created_by);
    if (ownerId && ownerId !== Number(auth.id)) {
      await createUserNotification({
        userId: ownerId,
        title: `Trade record ${status}`,
        message: String(body.comment ?? "").trim() || `Your Trade record was ${status}.`,
        redirectUrl: "/dashboard/trade-records",
        entityType: "trade_record",
        entityId: record.id,
      });
    }
    return ok({ id, status }, `Trade record ${status} successfully`);
  }

  if (action === "achievement") {
    if (!access.canUpdate) return fail("You do not have permission to update Trade achievements", 403);
    if (record.period_type !== "monthly") return fail("Achievement is entered only against monthly plans", 422);
    if (record.status === "approved") return fail("Approved records are locked and cannot be edited", 422);

    const settings = await getPlanningSettings();
    if (!fiscalYearAllowed(settings, record.fiscal_year)) {
      return fail(`Trade achievement entry is allowed only for Ethiopian fiscal year ${settings.fiscal_year}`, 422);
    }
    if (!isSuperAdmin(auth.roles) && !entryAllowed(settings, "monthly", true)) {
      return fail("Monthly achievement entry is currently closed by Super Admin", 403);
    }

    const achievementProduct = numberValue(body.achievement_product);
    const achievementPrice = numberValue(body.achievement_price);
    const achievementIncome = body.achievement_income ? numberValue(body.achievement_income) : achievementProduct * achievementPrice;
    await query<any[]>(
      `UPDATE trade_records
       SET achievement_product=?, achievement_price=?, achievement_income=?, employment_male_achievement=?, employment_female_achievement=?, status='submitted'
       WHERE id=?`,
      [
        achievementProduct,
        achievementPrice,
        achievementIncome,
        Number(body.employment_male_achievement ?? 0),
        Number(body.employment_female_achievement ?? 0),
        id,
      ]
    );
    return ok({ id }, "Monthly achievement submitted successfully");
  }

  return fail("Unsupported action", 422);
}
