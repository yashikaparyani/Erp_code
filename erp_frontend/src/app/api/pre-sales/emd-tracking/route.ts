export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, callPresalesMethod } from '../../_lib/frappe';

type TenderRow = {
  name: string;
  tender_number?: string;
  title?: string;
  client?: string;
  organization?: string;
  submission_date?: string;
  status?: string;
  emd_required?: number;
  emd_amount?: number;
};

type InstrumentRow = {
  name: string;
  instrument_type: string;
  linked_tender: string;
  instrument_number?: string;
  amount?: number;
  status?: string;
  bank_name?: string;
  issue_date?: string;
  expiry_date?: string;
  remarks?: string;
  refund_status?: string;
  refund_date?: string;
  refund_reference?: string;
  refund_remarks?: string;
  creation?: string;
  modified?: string;
};

type BidRow = {
  name: string;
  tender: string;
  result_date?: string;
  bid_date?: string;
  status?: string;
};

const addDays = (dateText?: string, days = 30) => {
  if (!dateText) return '';
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const normalizeRefundStatus = (status?: string) => {
  const value = (status || '').toUpperCase();
  if (!value) return 'Not Initiated';
  if (value === 'NOT_DUE') return 'Not Required';
  if (value === 'PENDING') return 'Pending';
  if (value === 'INITIATED') return 'Submitted';
  if (value === 'REFUNDED') return 'Released';
  if (value === 'NOT_REFUNDABLE') return 'Forfeited';
  return status || 'Not Initiated';
};

export async function GET(request: NextRequest) {
  try {
    const [tenderResult, instrumentResult, bidResult] = await Promise.all([
      callFrappeMethod<{ data?: TenderRow[] }>(
        'get_tenders',
        {
          filters: [['emd_required', '=', 1]],
          limit_page_length: 1000,
          limit_start: 0,
        },
        request,
      ),
      callFrappeMethod<{ data?: InstrumentRow[] }>(
        'get_emd_pbg_instruments',
        {
          instrument_type: 'EMD',
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

    const tenders = tenderResult.data || [];
    const instruments = (instrumentResult.data || []).filter((row) => row.instrument_type === 'EMD');
    const bids = bidResult.data || [];

    const latestInstrumentByTender = new Map<string, InstrumentRow>();
    for (const instrument of instruments) {
      const current = latestInstrumentByTender.get(instrument.linked_tender);
      const instrumentTime = new Date(instrument.modified || instrument.creation || 0).getTime();
      const currentTime = new Date(current?.modified || current?.creation || 0).getTime();
      if (!current || instrumentTime >= currentTime) {
        latestInstrumentByTender.set(instrument.linked_tender, instrument);
      }
    }

    const latestBidByTender = new Map<string, BidRow>();
    for (const bid of bids) {
      latestBidByTender.set(bid.tender, bid);
    }

    const rows = tenders
      .map((tender) => {
        const instrument = latestInstrumentByTender.get(tender.name);
        const bid = latestBidByTender.get(tender.name);
        const tenderStatus = (tender.status || bid?.status || '').trim().toUpperCase();
        const hasBidContext = Boolean(bid);
        const hasTrackingContext = Boolean(instrument || hasBidContext || tender.emd_required);
        const expectedRefundDate =
          instrument?.expiry_date ||
          ((tenderStatus === 'LOST' || tenderStatus === 'WON' || tenderStatus === 'CANCEL')
            ? addDays(bid?.result_date || bid?.bid_date || tender.submission_date, 30)
            : '');

        const refundStatus = !tender.emd_required
          ? 'Not Required'
          : instrument?.refund_status
            ? normalizeRefundStatus(instrument.refund_status)
            : tenderStatus === 'LOST'
              ? 'Not Initiated'
              : hasBidContext
                ? 'Bid Created'
                : 'Not Initiated';

        if (!hasTrackingContext) {
          return null;
        }

        return {
          tender_id: tender.name,
          tender_number: tender.tender_number || tender.name,
          title: tender.title || '',
          client: tender.client || '',
          organization: tender.organization || '',
          submission_date: tender.submission_date || '',
          lost_date: bid?.result_date || bid?.bid_date || '',
          emd_required: Boolean(tender.emd_required),
          emd_amount: Number(instrument?.amount || tender.emd_amount || 0),
          refund_status: refundStatus,
          expected_refund_date: refundStatus === 'Not Required' ? '' : expectedRefundDate,
          instrument_number: instrument?.instrument_number || '',
          instrument_name: instrument?.name || '',
          bank_name: instrument?.bank_name || '',
          issue_date: instrument?.issue_date || '',
          expiry_date: instrument?.expiry_date || '',
          remarks: instrument?.remarks || '',
          has_instrument: Boolean(instrument),
          bid_status: bid?.status || '',
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .sort((a, b) => {
        const aTime = new Date(b.lost_date || b.submission_date || 0).getTime();
        const bTime = new Date(a.lost_date || a.submission_date || 0).getTime();
        return aTime - bTime;
      });

    const summary = {
      total_lost_tenders: rows.length,
      emd_required_count: rows.filter((row) => row.emd_required).length,
      pending_refund_count: rows.filter((row) => row.emd_required && ['Pending', 'Submitted', 'Not Initiated', 'Bid Created'].includes(row.refund_status)).length,
      released_count: rows.filter((row) => row.refund_status === 'Released').length,
      forfeited_count: rows.filter((row) => row.refund_status === 'Forfeited').length,
    };

    return NextResponse.json({
      success: true,
      data: rows,
      summary,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch EMD tracking data',
        data: [],
        summary: {
          total_lost_tenders: 0,
          emd_required_count: 0,
          pending_refund_count: 0,
          released_count: 0,
          forfeited_count: 0,
        },
      },
      { status: 500 },
    );
  }
}
