import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '@/app/api/_lib/frappe';

const ALLOWED_ACTIONS: Record<string, string> = {
  submit: 'submit_overtime_entry',
  approve: 'approve_overtime_entry',
  reject: 'reject_overtime_entry',
};

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const name = decodeURIComponent(params.id);
  const cookie = request.headers.get('cookie') || '';
  try {
    const body = await request.json();
    const { action, ...extra } = body;
    const method = ALLOWED_ACTIONS[action];
    if (!method) return NextResponse.json({ success: false, message: `Unknown action: ${action}` }, { status: 400 });
    const result = await callFrappeMethod(method, { name, ...extra }, cookie);
    return NextResponse.json({ success: true, data: result, message: `${action} completed` });
  } catch (err) {
    return NextResponse.json({ success: false, message: err instanceof Error ? err.message : 'Action failed' }, { status: 500 });
  }
}
