import { NextRequest } from 'next/server';
import { execute, query } from '@/lib/server/db';
import { getAuthUser } from '@/lib/server/auth';
import { fail, ok } from '@/lib/server/response';
import { applyTradeReadScope, canReviewTradeRecords, getTradeUserContext } from '@/lib/server/trade-access';
import { createUserNotification } from '@/lib/server/notifications';

type Target = 'plan' | 'achievement';
type Action = 'accept' | 'comment' | 'return';

const selectSql = `
  SELECT tvr.* FROM trade_value_chain_records tvr
  INNER JOIN offices o ON o.id = tvr.office_id
  LEFT JOIN directorates d ON d.id = tvr.directorate_id
  LEFT JOIN teams tm ON tm.id = tvr.team_id
`;

async function getContext(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth?.id) return { auth: null, user: null };
  const user = await getTradeUserContext(Number(auth.id));
  return { auth, user };
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { auth, user } = await getContext(request);
  if (!auth || !user) return fail('Unauthenticated', 401);
  if (!canReviewTradeRecords(user, auth.roles ?? [])) return fail('You are not allowed to review Trade records.', 403);

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const target = String(body.target ?? 'plan') as Target;
  const action = String(body.action ?? 'comment') as Action;
  const comment = String(body.comment ?? '').trim() || null;

  if (!['plan', 'achievement'].includes(target)) return fail('Invalid decision target', 422);
  if (!['accept', 'comment', 'return'].includes(action)) return fail('Invalid decision action', 422);
  if ((action === 'comment' || action === 'return') && !comment) return fail('Comment is required.', 422);

  const where = ['tvr.id = ?'];
  const values: unknown[] = [id];
  applyTradeReadScope(where, values, user, auth.roles ?? [], 'tvr');
  const rows = await query<any[]>(`${selectSql} WHERE ${where.join(' AND ')} LIMIT 1`, values);
  const record = rows[0];
  if (!record) return fail('Trade record not found', 404);

  if (target === 'achievement' && record.period_type !== 'monthly') return fail('Achievements can only be reviewed on monthly rows.', 422);

  async function notifyOwner() {
    const ownerId = Number(record.created_by);
    if (!ownerId || ownerId === Number(auth.id)) return;
    const subject = target === 'plan' ? 'Trade plan' : 'Trade achievement';
    const result = action === 'accept' ? 'accepted' : action === 'return' ? 'returned' : 'commented';
    await createUserNotification({
      userId: ownerId,
      title: `${subject} ${result}`,
      message: comment || `Your ${subject.toLowerCase()} was ${result}.`,
      redirectUrl: '/dashboard/trade-records',
      entityType: 'trade_value_chain_record',
      entityId: record.id,
    });
  }

  if (target === 'plan') {
    if (action === 'accept') {
      await execute(
        `UPDATE trade_value_chain_records SET plan_status='accepted', status='accepted', plan_comment=?, plan_accepted_by=?, plan_accepted_at=NOW() WHERE id=?`,
        [comment, auth.id, id],
      );
      await notifyOwner();
      return ok(null, 'Trade plan accepted successfully');
    }
    if (action === 'return') {
      await execute(
        `UPDATE trade_value_chain_records SET plan_status='returned', status='returned', plan_comment=?, plan_accepted_by=?, plan_accepted_at=NOW() WHERE id=?`,
        [comment, auth.id, id],
      );
      await notifyOwner();
      return ok(null, 'Trade plan returned successfully');
    }
    await execute('UPDATE trade_value_chain_records SET plan_comment=? WHERE id=?', [comment, id]);
    await notifyOwner();
    return ok(null, 'Trade plan comment saved successfully');
  }

  if (action === 'accept') {
    await execute(
      `UPDATE trade_value_chain_records SET achievement_status='accepted', achievement_comment=?, achievement_accepted_by=?, achievement_accepted_at=NOW() WHERE id=?`,
      [comment, auth.id, id],
    );
    await notifyOwner();
    return ok(null, 'Trade achievement accepted successfully');
  }
  if (action === 'return') {
    await execute(
      `UPDATE trade_value_chain_records SET achievement_status='returned', achievement_comment=?, achievement_accepted_by=?, achievement_accepted_at=NOW() WHERE id=?`,
      [comment, auth.id, id],
    );
    await notifyOwner();
    return ok(null, 'Trade achievement returned successfully');
  }
  await execute('UPDATE trade_value_chain_records SET achievement_comment=? WHERE id=?', [comment, id]);
  await notifyOwner();
  return ok(null, 'Trade achievement comment saved successfully');
}
