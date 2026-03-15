import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../_lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const result = await callFrappeMethod('get_pending_approvals', {}, request);
    return NextResponse.json({ success: true, data: result.data || [] });
  } catch (error) {
    console.error('Error fetching approvals:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch approvals', data: [] },
      { status: 500 }
    );
  }
}
