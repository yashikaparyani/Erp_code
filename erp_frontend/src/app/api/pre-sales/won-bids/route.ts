import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, callPresalesMethod } from '../../_lib/frappe';

type TenderRow = {
  name: string;
  tender_number?: string;
  title?: string;
  client?: string;
  organization?: string;
  status?: string;
};

type BidRow = {
  name: string;
  tender: string;
  bid_date?: string;
  status?: string;
  bid_amount?: number;
  result_date?: string;
  creation?: string;
};

type BidDetail = BidRow & {
  loi_n_expected?: number;
  loi_n_received?: number;
};

export async function GET(request: NextRequest) {
  try {
    const [wonTenderResult, latestBidResult] = await Promise.all([
      callFrappeMethod<{ data?: TenderRow[] }>(
        'get_tenders',
        {
          filters: [['status', '=', 'WON']],
          limit_page_length: 1000,
          limit_start: 0,
        },
        request,
      ),
      callPresalesMethod<{ data?: BidRow[] }>(
        'get_bids',
        {
          is_latest: '1',
        },
        request,
      ),
    ]);

    const wonTenders = wonTenderResult.data || [];
    const latestBids = latestBidResult.data || [];

    const bidsByTender = new Map<string, BidRow[]>();
    for (const bid of latestBids) {
      const current = bidsByTender.get(bid.tender) || [];
      current.push(bid);
      bidsByTender.set(bid.tender, current);
    }

    const selectedRows = wonTenders.map((tender) => {
      const rows = bidsByTender.get(tender.name) || [];
      const selectedBid =
        rows.find((row) => row.status === 'WON') ||
        rows.sort((a, b) => new Date(b.creation || 0).getTime() - new Date(a.creation || 0).getTime())[0] ||
        null;

      return { tender, bid: selectedBid as BidDetail | null };
    });

    const enrichedRows = await Promise.all(
      selectedRows.map(async ({ tender, bid }) => {
        if (!bid?.name) {
          return {
            tender_id: tender.name,
            tender_number: tender.tender_number || tender.name,
            tender_title: tender.title || '',
            client: tender.client || '',
            organization: tender.organization || '',
            bid_id: '',
            bid_date: '',
            bid_amount: 0,
            bid_status: '',
            result_date: '',
            loi_n_expected: 0,
            loi_n_received: 0,
            has_bid: false,
          };
        }

        try {
          const bidDetail = await callPresalesMethod<{ data?: BidDetail }>('get_bid', { name: bid.name }, request);
          const detail = bidDetail.data || bid;
          return {
            tender_id: tender.name,
            tender_number: tender.tender_number || tender.name,
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
            has_bid: true,
          };
        } catch {
          return {
            tender_id: tender.name,
            tender_number: tender.tender_number || tender.name,
            tender_title: tender.title || '',
            client: tender.client || '',
            organization: tender.organization || '',
            bid_id: bid.name,
            bid_date: bid.bid_date || '',
            bid_amount: bid.bid_amount || 0,
            bid_status: bid.status || '',
            result_date: bid.result_date || '',
            loi_n_expected: 0,
            loi_n_received: 0,
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
