import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const result = await callFrappeMethod('get_tender_stats', undefined, request);

    return NextResponse.json({
      success: true,
      data: {
        total_pipeline: result.data?.total_pipeline || 0,
        total_count: result.data?.total || 0,
        won_count: result.data?.won || 0,
        submitted_count: result.data?.submitted || 0,
        draft_count: result.data?.draft || 0
      }
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch tender stats',
        data: {
          total_pipeline: 0,
          total_count: 0,
          won_count: 0,
          submitted_count: 0,
          draft_count: 0
        }
      },
      { status: 500 }
    );
  }
}
