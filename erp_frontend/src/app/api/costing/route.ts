import { NextRequest, NextResponse } from 'next/server';
import { FRAPPE_URL, callFrappeMethod, jsonErrorResponse } from '../_lib/frappe';

export const dynamic = 'force-dynamic';

async function assertCostingQueueAccess(request: NextRequest) {
  if (!request.cookies.get('sid')?.value) {
    throw new Error('Authentication required.');
  }

  const response = await fetch(`${FRAPPE_URL}/api/method/gov_erp.api.get_session_context`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: request.headers.get('cookie') || '',
      'X-Frappe-CSRF-Token': request.cookies.get('frappe_csrf_token')?.value || '',
    },
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.message || payload?.exception || 'Authentication required.');
  }

  const data = (payload?.message ?? payload)?.data || {};
  const roleSet = new Set<string>(Array.isArray(data.roles) ? data.roles : []);
  const primaryRole = String(data.primary_role || '');
  const allowed = primaryRole === 'Director' || primaryRole === 'Accounts' || roleSet.has('System Manager');

  if (!allowed) {
    throw new Error('Not permitted to access costing queue.');
  }
}

/**
 * GET /api/costing?status=...&source_type=...
 * GET /api/costing?name=...  (single item detail)
 * Typed wrapper for costing queue reads.
 */
export async function GET(request: NextRequest) {
  try {
    await assertCostingQueueAccess(request);
    const sp = request.nextUrl.searchParams;
    const name = sp.get('name');

    if (name) {
      // Single item detail
      const data = await callFrappeMethod('get_costing_queue_item', { name }, request);
      return NextResponse.json({ success: true, data });
    }

    // Queue list
    const args: Record<string, string> = {};
    if (sp.get('status')) args.status = sp.get('status')!;
    if (sp.get('source_type')) args.source_type = sp.get('source_type')!;

    const data = await callFrappeMethod('get_costing_queue', args, request);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return jsonErrorResponse(err, 'Failed to load costing queue');
  }
}

/**
 * POST /api/costing
 * { action: 'release' | 'hold' | 'reject', name: string, remarks?: string }
 */
export async function POST(request: NextRequest) {
  try {
    await assertCostingQueueAccess(request);
    const body = await request.json();
    const { action, name, remarks } = body;

    if (!action || !name) {
      return NextResponse.json({ success: false, message: 'action and name are required' }, { status: 400 });
    }

    const methodMap: Record<string, string> = {
      release: 'costing_release_item',
      hold: 'costing_hold_item',
      reject: 'costing_reject_item',
    };

    const method = methodMap[action];
    if (!method) {
      return NextResponse.json({ success: false, message: `Unknown action: ${action}` }, { status: 400 });
    }

    const data = await callFrappeMethod(method, { name, remarks: remarks || '' }, request);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return jsonErrorResponse(err, 'Costing action failed');
  }
}
