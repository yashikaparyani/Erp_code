import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const attendanceDate = params.get('attendanceDate') || undefined;
    const department = params.get('department') || undefined;

    const [whoIsIn, muster, swipeInfo, attendanceStats] = await Promise.all([
      callFrappeMethod('get_who_is_in', { attendance_date: attendanceDate, department }, request),
      callFrappeMethod('get_attendance_muster', { attendance_date: attendanceDate, department }, request),
      callFrappeMethod('get_swipe_ingestion_placeholder', undefined, request),
      callFrappeMethod('get_attendance_stats', undefined, request),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        whoIsIn: whoIsIn.data,
        muster: muster.data,
        swipeInfo: swipeInfo.data,
        attendanceStats: attendanceStats.data,
      },
    });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to load attendance overview');
  }
}
