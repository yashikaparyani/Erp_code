import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../_lib/frappe';

export const dynamic = 'force-dynamic';

/**
 * GET /api/anda?type=integrity|tabs|logs|order&...extra query params
 * Typed wrapper for ANDA import read operations.
 */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const type = sp.get('type') || 'integrity';

    const methodMap: Record<string, string> = {
      integrity: 'check_anda_master_integrity',
      tabs: 'get_anda_import_tabs',
      logs: 'get_anda_import_logs',
      order: 'get_anda_import_order',
      masters: 'load_anda_masters',
    };

    const method = methodMap[type];
    if (!method) {
      return NextResponse.json({ success: false, message: `Invalid type: ${type}` }, { status: 400 });
    }

    // Pass through any extra query params as args
    const args: Record<string, string> = {};
    sp.forEach((v, k) => { if (k !== 'type') args[k] = v; });

    const data = await callFrappeMethod(method, args, request);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return jsonErrorResponse(err, 'ANDA read failed');
  }
}

/**
 * POST /api/anda
 * { action: 'import_single' | 'import_orchestrated' | 'load_masters', ...extra args }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...rest } = body;

    if (!action) {
      return NextResponse.json({ success: false, message: 'action is required' }, { status: 400 });
    }

    const methodMap: Record<string, string> = {
      import_single: 'run_anda_import',
      import_orchestrated: 'run_anda_orchestrated_import',
      load_masters: 'load_anda_masters',
    };

    const method = methodMap[action];
    if (!method) {
      return NextResponse.json({ success: false, message: `Unknown action: ${action}` }, { status: 400 });
    }

    const data = await callFrappeMethod(method, rest, request);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return jsonErrorResponse(err, 'ANDA import failed');
  }
}
