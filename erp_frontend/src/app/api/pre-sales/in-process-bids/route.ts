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
  loi_decision_status?: string;
};

type BidDetail = BidRow & {
  tender_detail?: {
    name?: string;
    tender_number?: string;
    title?: string;
    client?: string;
    organization?: string;
    tenure_years?: number;
    tenure_end_date?: string;
    closure_letter_received?: number;
    presales_closure_date?: string;
  };
};

const getDaysLeft = (dateText?: string) => {
  if (!dateText) return null;
  const now = new Date();
  const target = new Date(dateText);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

export async function GET(request: NextRequest) {
  try {
    const bidResult = await callPresalesMethod<{ data?: BidRow[] }>(
      'get_bids',
      {
        status: 'WON',
        is_latest: '1',
        loi_decision_status: 'ACCEPTED',
      },
      request,
    );

    const rows = await Promise.all(
      (bidResult.data || []).map(async (bid) => {
        const bidDetail = await callPresalesMethod<{ data?: BidDetail }>('get_bid', { name: bid.name }, request);
        const detail: BidDetail = bidDetail.data || bid;
        const tender = detail.tender_detail || {};
        const daysLeft = getDaysLeft(tender.tenure_end_date);
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
          tenure_years: tender.tenure_years || 0,
          tenure_end_date: tender.tenure_end_date || '',
          closure_letter_received: Boolean(tender.closure_letter_received),
          presales_closure_date: tender.presales_closure_date || '',
          days_left: daysLeft,
          completion_certificate_due: daysLeft !== null && daysLeft <= 90,
        };
      }),
    );

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch in-process bids',
        data: [],
      },
      { status: 500 },
    );
  }
}
