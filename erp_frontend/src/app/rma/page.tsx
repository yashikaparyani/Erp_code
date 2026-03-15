'use client';
import { useEffect, useState } from 'react';
import { AlertTriangle, FileCheck2, Plus, RefreshCcw, ShieldCheck, Truck, Wrench, X } from 'lucide-react';

interface RMATracker {
  name: string;
  linked_ticket?: string;
  linked_project?: string;
  item_link?: string;
  asset_serial_number?: string;
  qty?: number;
  faulty_date?: string;
  dispatch_destination?: string;
  service_partner_name?: string;
  warranty_status?: string;
  repairability_status?: string;
  rma_reference_no?: string;
  approval_status?: string;
  rma_purchase_order_no?: string;
  repairing_status?: string;
  aging_days?: number;
  rma_status?: string;
  repair_cost?: number;
}

interface TicketOption {
  name: string;
  title?: string;
  linked_project?: string;
  asset_serial_no?: string;
  is_rma?: boolean;
}

interface RMAStats {
  total?: number;
  pending?: number;
  in_transit?: number;
  under_repair?: number;
  repaired?: number;
  rejected?: number;
  under_warranty?: number;
  non_warranty?: number;
  repairable?: number;
  non_repairable?: number;
  awaiting_approval?: number;
}

type RMAFormData = {
  linked_ticket: string;
  linked_project: string;
  item_link: string;
  asset_serial_number: string;
  qty: number;
  faulty_date: string;
  failure_reason: string;
  field_rca: string;
  dispatch_destination: string;
  service_partner_name: string;
  warranty_status: string;
  repairability_status: string;
};

const initialFormData: RMAFormData = {
  linked_ticket: '',
  linked_project: '',
  item_link: '',
  asset_serial_number: '',
  qty: 1,
  faulty_date: '',
  failure_reason: '',
  field_rca: '',
  dispatch_destination: 'OEM',
  service_partner_name: '',
  warranty_status: 'UNDER_WARRANTY',
  repairability_status: 'REPAIRABLE',
};

function formatCurrency(value?: number) {
  if (!value) return 'Rs 0';
  return `Rs ${value.toLocaleString('en-IN')}`;
}

export default function RMAPage() {
  const [items, setItems] = useState<RMATracker[]>([]);
  const [tickets, setTickets] = useState<TicketOption[]>([]);
  const [stats, setStats] = useState<RMAStats>({});
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState<RMAFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    const [listResponse, statsResponse, ticketResponse] = await Promise.all([
      fetch('/api/rma-trackers').then((response) => response.json()).catch(() => ({ data: [] })),
      fetch('/api/rma-trackers/stats').then((response) => response.json()).catch(() => ({ data: {} })),
      fetch('/api/tickets').then((response) => response.json()).catch(() => ({ data: [] })),
    ]);
    setItems(listResponse.data || []);
    setStats(statsResponse.data || {});
    setTickets((ticketResponse.data || []).filter((ticket: TicketOption) => !ticket.is_rma));
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const onTicketChange = (ticketName: string) => {
    const selectedTicket = tickets.find((ticket) => ticket.name === ticketName);
    setFormData((current) => ({
      ...current,
      linked_ticket: ticketName,
      linked_project: selectedTicket?.linked_project || current.linked_project,
      asset_serial_number: selectedTicket?.asset_serial_no || current.asset_serial_number,
      failure_reason: selectedTicket?.title || current.failure_reason,
    }));
  };

  const handleCreate = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/rma-trackers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || 'Failed to create RMA');
      }
      setShowCreateModal(false);
      setFormData(initialFormData);
      await loadData();
    } catch (creationError) {
      setError(creationError instanceof Error ? creationError.message : 'Failed to create RMA');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">RMA Department</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Field fault to dispatch, RCA, warranty approval, repair, and return-to-location tracking.
          </p>
        </div>
        <button className="btn btn-primary w-full sm:w-auto" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4" />
          Create RMA
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <StatCard icon={RefreshCcw} color="blue" label="Total RMA" value={stats.total ?? items.length} hint={`${stats.pending ?? 0} pending`} />
        <StatCard icon={Truck} color="amber" label="In Transit" value={stats.in_transit ?? 0} hint={`${stats.under_repair ?? 0} under repair`} />
        <StatCard icon={ShieldCheck} color="green" label="Warranty" value={stats.under_warranty ?? 0} hint={`${stats.non_warranty ?? 0} non warranty`} />
        <StatCard icon={Wrench} color="violet" label="Repairability" value={stats.repairable ?? 0} hint={`${stats.non_repairable ?? 0} non repairable`} />
        <StatCard icon={FileCheck2} color="rose" label="Awaiting Approval" value={stats.awaiting_approval ?? 0} hint={`${stats.repaired ?? 0} repaired`} />
        <StatCard icon={AlertTriangle} color="slate" label="Rejected" value={stats.rejected ?? 0} hint="Scrap or rejected cases" />
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900">RMA Tracker</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>RMA ID</th>
                <th>Project / Ticket</th>
                <th>Item / Serial</th>
                <th>Destination</th>
                <th>Warranty</th>
                <th>Repairability</th>
                <th>Approval / PO</th>
                <th>Repair Status</th>
                <th>Aging</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-gray-500">No RMA records found</td>
                </tr>
              ) : items.map((item) => (
                <tr key={item.name}>
                  <td>
                    <div className="font-medium text-gray-900">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.rma_reference_no || '-'}</div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-900">{item.linked_project || '-'}</div>
                    <div className="text-xs text-gray-500">{item.linked_ticket || '-'}</div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-900">{item.item_link || '-'}</div>
                    <div className="text-xs text-gray-500">{item.asset_serial_number || '-'}</div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-900">{item.dispatch_destination || '-'}</div>
                    <div className="text-xs text-gray-500">{item.service_partner_name || '-'}</div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-900">{item.warranty_status || '-'}</div>
                    <div className="text-xs text-gray-500">{formatCurrency(item.repair_cost)}</div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-900">{item.repairability_status || '-'}</div>
                    <div className="text-xs text-gray-500">Qty {item.qty ?? 1}</div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-900">{item.approval_status || '-'}</div>
                    <div className="text-xs text-gray-500">{item.rma_purchase_order_no || '-'}</div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-900">{item.repairing_status || item.rma_status || '-'}</div>
                    <div className="text-xs text-gray-500">{item.faulty_date || '-'}</div>
                  </td>
                  <td>
                    <div className="font-medium text-gray-900">{item.aging_days ?? 0} days</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Create RMA</h2>
                <p className="text-sm text-gray-500 mt-1">Raise a fresh RMA record or link it to an existing helpdesk ticket.</p>
              </div>
              <button className="p-2 rounded-lg hover:bg-gray-100" onClick={() => setShowCreateModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Linked Ticket">
                <select
                  className="input"
                  value={formData.linked_ticket}
                  onChange={(event) => onTicketChange(event.target.value)}
                >
                  <option value="">Select ticket</option>
                  {tickets.map((ticket) => (
                    <option key={ticket.name} value={ticket.name}>
                      {ticket.name} - {ticket.title || 'Untitled'}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Project">
                <input className="input" value={formData.linked_project} onChange={(event) => setFormData({ ...formData, linked_project: event.target.value })} />
              </Field>
              <Field label="Item">
                <input className="input" value={formData.item_link} onChange={(event) => setFormData({ ...formData, item_link: event.target.value })} />
              </Field>
              <Field label="Asset Serial">
                <input className="input" value={formData.asset_serial_number} onChange={(event) => setFormData({ ...formData, asset_serial_number: event.target.value })} />
              </Field>
              <Field label="Qty">
                <input className="input" type="number" min="1" value={formData.qty} onChange={(event) => setFormData({ ...formData, qty: Number(event.target.value || 1) })} />
              </Field>
              <Field label="Faulty Date">
                <input className="input" type="date" value={formData.faulty_date} onChange={(event) => setFormData({ ...formData, faulty_date: event.target.value })} />
              </Field>
              <Field label="Dispatch Destination">
                <select className="input" value={formData.dispatch_destination} onChange={(event) => setFormData({ ...formData, dispatch_destination: event.target.value })}>
                  <option value="OEM">OEM</option>
                  <option value="VENDOR">Vendor</option>
                  <option value="HEAD_OFFICE">Head Office</option>
                  <option value="CENTRAL_TEAM">Central Team</option>
                  <option value="THIRD_PARTY_REPAIR">Third Party Repair</option>
                </select>
              </Field>
              <Field label="Partner Name">
                <input className="input" value={formData.service_partner_name} onChange={(event) => setFormData({ ...formData, service_partner_name: event.target.value })} />
              </Field>
              <Field label="Warranty Status">
                <select className="input" value={formData.warranty_status} onChange={(event) => setFormData({ ...formData, warranty_status: event.target.value })}>
                  <option value="UNDER_WARRANTY">Under Warranty</option>
                  <option value="NON_WARRANTY">Non Warranty</option>
                </select>
              </Field>
              <Field label="Repairability">
                <select className="input" value={formData.repairability_status} onChange={(event) => setFormData({ ...formData, repairability_status: event.target.value })}>
                  <option value="REPAIRABLE">Repairable</option>
                  <option value="NON_REPAIRABLE">Non Repairable</option>
                </select>
              </Field>
              <Field label="Failure Reason" full>
                <textarea className="input min-h-[88px]" value={formData.failure_reason} onChange={(event) => setFormData({ ...formData, failure_reason: event.target.value })} />
              </Field>
              <Field label="Field RCA" full>
                <textarea className="input min-h-[88px]" value={formData.field_rca} onChange={(event) => setFormData({ ...formData, field_rca: event.target.value })} />
              </Field>
            </div>

            <div className="px-6 pb-6">
              {error ? <div className="mb-4 text-sm text-red-600">{error}</div> : null}
              <div className="flex justify-end gap-3">
                <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleCreate} disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create RMA'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  color,
  label,
  value,
  hint,
}: {
  icon: any;
  color: 'blue' | 'amber' | 'green' | 'violet' | 'rose' | 'slate';
  label: string;
  value: number;
  hint: string;
}) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    amber: 'bg-amber-100 text-amber-600',
    green: 'bg-green-100 text-green-600',
    violet: 'bg-violet-100 text-violet-600',
    rose: 'bg-rose-100 text-rose-600',
    slate: 'bg-slate-100 text-slate-600',
  };

  return (
    <div className="stat-card">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="stat-value">{value}</div>
          <div className="stat-label">{label}</div>
        </div>
      </div>
      <div className="text-xs text-gray-500 mt-2">{hint}</div>
    </div>
  );
}

function Field({
  label,
  children,
  full = false,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <label className={full ? 'md:col-span-2' : ''}>
      <div className="text-sm font-medium text-gray-700 mb-2">{label}</div>
      {children}
    </label>
  );
}
