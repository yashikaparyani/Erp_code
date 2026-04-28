import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../../../api/_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const [
      onboardingStats,
      attendanceStats,
      travelStats,
      statutoryStats,
      visitStats,
      onboardings,
      attendanceLogs,
      travelLogs,
      statutoryLedgers,
      technicianVisits,
    ] = await Promise.all([
      callFrappeMethod('get_onboarding_stats', undefined, request),
      callFrappeMethod('get_attendance_stats', undefined, request),
      callFrappeMethod('get_travel_log_stats', undefined, request),
      callFrappeMethod('get_statutory_ledger_stats', undefined, request),
      callFrappeMethod('get_technician_visit_stats', undefined, request),
      callFrappeMethod('get_onboardings', undefined, request),
      callFrappeMethod('get_attendance_logs', undefined, request),
      callFrappeMethod('get_travel_logs', undefined, request),
      callFrappeMethod('get_statutory_ledgers', undefined, request),
      callFrappeMethod('get_technician_visit_logs', undefined, request),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          onboarding: onboardingStats.data || {},
          attendance: attendanceStats.data || {},
          travel: travelStats.data || {},
          statutory: statutoryStats.data || {},
          visits: visitStats.data || {},
        },
        recent: {
          onboardings: (onboardings.data || []).slice(0, 5),
          attendance: (attendanceLogs.data || []).slice(0, 5),
          travel: (travelLogs.data || []).slice(0, 5),
          statutory: (statutoryLedgers.data || []).slice(0, 5),
          visits: (technicianVisits.data || []).slice(0, 5),
        },
      },
    });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to fetch HR dashboard data', {
      data: {
        stats: {},
        recent: {
          onboardings: [],
          attendance: [],
          travel: [],
          statutory: [],
          visits: [],
        },
      },
    });
  }
}
