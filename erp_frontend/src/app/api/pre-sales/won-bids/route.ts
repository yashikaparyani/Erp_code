export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { callPresalesMethod } from '../../_lib/frappe';

type BidRow = {
  name: string;
  tender: string;
  bid_date?: string;
  status?: string;
  bid_amount?: number;
  result_date?: string;
  creation?: string;
  loi_decision_status?: string;
  loi_decision_reason?: string;
};

type BidDetail = BidRow & {
  loi_n_expected?: number;
  loi_n_received?: number;
  tender_detail?: {
    name?: string;
    tender_number?: string;
    title?: string;
    client?: string;
    organization?: string;
  };
};

export async function GET(request: NextRequest) {
  try {
    const latestBidResult = await callPresalesMethod<{ data?: BidRow[] }>(
      'get_bids',
      {
        status: 'WON',
        is_latest: '1',
      },
      request,
    );

    const selectedRows = (latestBidResult.data || [])
      .filter((bid) => bid.loi_decision_status !== 'ACCEPTED')
      .sort((a, b) => new Date(b.creation || 0).getTime() - new Date(a.creation || 0).getTime());

    const enrichedRows = await Promise.all(
      selectedRows.map(async (bid) => {
        try {
          const bidDetail = await callPresalesMethod<{ data?: BidDetail }>('get_bid', { name: bid.name }, request);
          const detail: BidDetail = bidDetail.data || bid;
          const tender = detail.tender_detail || {};
          return {
            tender_id: tender.name || bid.tender,
            tender_number: tender.tender_number || bid.tender,
            tender_title: tender.title || '',
            client: tender.client || '',
            organization: tender.organization || '',
            bid_id: detail.name || bid.name,
            bid_date: detail.bid_date || '',
            bid_amount: detail.bid_amount || 0,
            bid_status: detail.status || '',
            result_date: detail.result_date || '',
            loi_n_expected: detail.loi_n_expected || 0,
            loi_n_received: detail.loi_n_received || 0,
            loi_decision_status: detail.loi_decision_status || 'PENDING',
            loi_decision_reason: detail.loi_decision_reason || '',
            has_bid: true,
          };
        } catch {
          return {
            tender_id: bid.tender,
            tender_number: bid.tender,
            tender_title: '',
            client: '',
            organization: '',
            bid_id: bid.name,
            bid_date: bid.bid_date || '',
            bid_amount: bid.bid_amount || 0,
            bid_status: bid.status || '',
            result_date: bid.result_date || '',
            loi_n_expected: 0,
            loi_n_received: 0,
            loi_decision_status: bid.loi_decision_status || 'PENDING',
            loi_decision_reason: bid.loi_decision_reason || '',
            has_bid: true,
          };
        }
      }),
    );

    return NextResponse.json({ success: true, data: enrichedRows });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch won bids',
        data: [],
      },
      { status: 500 },
    );
  }
}
