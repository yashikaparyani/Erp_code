export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../_lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const project = searchParams.get('project') || '';
    const target_stage = searchParams.get('target_stage') || '';
    const site = searchParams.get('site') || '';

    const result = await callFrappeMethod(
      'check_progression_gate',
      { project, target_stage, ...(site ? { site } : {}) },
      request,
    );
    return NextResponse.json({ success: true, data: result.data || result });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to load progression gate' },
      { status: 500 },
    );
  }
}
