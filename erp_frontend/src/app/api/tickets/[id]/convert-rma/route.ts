import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod } from '../../../_lib/frappe';

export const dynamic = 'force-dynamic';

type Params = {
  params: {
    id: string;
  };
};

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const data = await request.json().catch(() => ({}));
    const result = await callFrappeMethod(
      'convert_ticket_to_rma',
      {
        ticket_name: decodeURIComponent(params.id),
        data: JSON.stringify(data || {}),
      },
      request,
    );

    return NextResponse.json({
      success: true,
      data: result.data,
      message: result.message || 'Ticket converted to RMA',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to convert ticket to RMA' },
      { status: 500 },
    );
  }
}
