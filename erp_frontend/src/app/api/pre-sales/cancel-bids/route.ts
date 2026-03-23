import { NextRequest, NextResponse } from 'next/server';
import { callPresalesMethod } from '../../_lib/frappe';

type BidRow = {
  name: string;
  tender: string;
  bid_date?: string;
  bid_amount?: number;
  result_date?: string;
  cancel_reason?: string;
  loi_decision_reason?: string;
};

type BidDetail = BidRow & {
  tender_detail?: {
    name?: string;
    tender_number?: string;
    title?: string;
    client?: string;
    organization?: string;
    bid_denied_reason?: string;
  };
};

export async function GET(request: NextRequest) {
  try {
    const bidResult = await callPresalesMethod<{ data?: BidRow[] }>(
      'get_bids',
      {
        status: 'CANCEL',
        is_latest: '1',
      },
      request,
    );

    const rows = await Promise.all(
      (bidResult.data || []).map(async (bid) => {
        const bidDetail = await callPresalesMethod<{ data?: BidDetail }>('get_bid', { name: bid.name }, request);
        const detail: BidDetail = bidDetail.data || bid;
        const tender = detail.tender_detail || {};
        return {
          bid_id: detail.name || bid.name,
          tender_id: tender.name || bid.tender,
          tender_number: tender.tender_number || bid.tender,
          tender_title: tender.title || '',
          client: tender.client || '',
          organization: tender.organization || '',
          bid_amount: detail.bid_amount || 0,
          bid_date: detail.bid_date || '',
          result_date: detail.result_date || '',
          cancel_reason: detail.cancel_reason || detail.loi_decision_reason || tender.bid_denied_reason || '',
        };
      }),
    );

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch cancelled bids',
        data: [],
      },
      { status: 500 },
    );
  }
}
