'use client';
import { useEffect, useState } from 'react';
import { Plus, HeadphonesIcon, Building2, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';

interface Ticket {
  name: string;
  title?: string;
  linked_project?: string;
  linked_site?: string;
  category?: string;
  priority?: string;
  status?: string;
  raised_by?: string;
  raised_on?: string;
  assigned_to?: string;
  resolved_on?: string;
  is_rma?: boolean;
  sla_profile?: string;
}

interface TicketStats {
  total?: number;
  new?: number;
  assigned?: number;
  in_progress?: number;
  on_hold?: number;
  resolved?: number;
  closed?: number;
  critical?: number;
  high?: number;
  rma_count?: number;
}

export default function OMHelpdeskPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<TicketStats>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/tickets').then(r => r.json()).catch(() => ({ data: [] })),
    ]).then(([ticketsRes]) => {
      const data: Ticket[] = ticketsRes.data || [];
      setTickets(data);
      // Derive stats from data
      setStats({
        total: data.length,
        new: data.filter(t => t.status === 'NEW').length,
        assigned: data.filter(t => t.status === 'ASSIGNED').length,
        in_progress: data.filter(t => t.status === 'IN_PROGRESS').length,
        on_hold: data.filter(t => t.status === 'ON_HOLD').length,
        resolved: data.filter(t => t.status === 'RESOLVED').length,
        closed: data.filter(t => t.status === 'CLOSED').length,
        critical: data.filter(t => t.priority === 'CRITICAL').length,
        high: data.filter(t => t.priority === 'HIGH').length,
        rma_count: data.filter(t => t.is_rma).length,
      });
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const openCount = (stats.new ?? 0) + (stats.assigned ?? 0);
  const activeCount = (stats.in_progress ?? 0) + (stats.on_hold ?? 0);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">O&M & Helpdesk</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Operations, maintenance, and ticket management</p>
        </div>
        <button className="btn btn-primary w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          Create Ticket
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="stat-value">{stats.total ?? tickets.length}</div>
              <div className="stat-label">Total Tickets</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">{stats.rma_count ?? 0} RMA</div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="stat-value">{openCount}</div>
              <div className="stat-label">Open</div>
            </div>
          </div>
          <div className="text-xs text-red-600 mt-2">{stats.critical ?? 0} critical</div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="stat-value">{activeCount}</div>
              <div className="stat-label">In Progress</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">{stats.on_hold ?? 0} on hold</div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="stat-value">{stats.resolved ?? 0}</div>
              <div className="stat-label">Resolved</div>
            </div>
          </div>
          <div className="text-xs text-green-600 mt-2">{stats.closed ?? 0} closed</div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <HeadphonesIcon className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <div className="stat-value">{stats.high ?? 0}</div>
              <div className="stat-label">High Priority</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">Needs attention</div>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Tickets</h3>
          {(stats.critical ?? 0) > 0 && <span className="badge badge-error">{stats.critical} Critical</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Title</th>
                <th>Site</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Assigned To</th>
                <th>Raised On</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-500">No tickets found</td></tr>
              ) : tickets.map(ticket => (
                <tr key={ticket.name}>
                  <td>
                    <div className="font-medium text-gray-900">{ticket.name}</div>
                  </td>
                  <td>
                    <div className="font-medium text-gray-900 max-w-xs">{ticket.title || '-'}</div>
                  </td>
                  <td>
                    <div className="text-gray-600">{ticket.linked_site || '-'}</div>
                  </td>
                  <td>
                    <span className="badge badge-info">{ticket.category || '-'}</span>
                  </td>
                  <td>
                    <span className={`badge ${
                      ticket.priority === 'CRITICAL' ? 'badge-error' : 
                      ticket.priority === 'HIGH' ? 'badge-warning' : 
                      'badge-gray'
                    }`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td>
                    <div className="text-gray-900">{ticket.assigned_to || '-'}</div>
                  </td>
                  <td>
                    <div className="text-gray-600">{ticket.raised_on || '-'}</div>
                  </td>
                  <td>
                    <span className={`badge ${
                      ticket.status === 'NEW' || ticket.status === 'ASSIGNED' ? 'badge-error' : 
                      ticket.status === 'IN_PROGRESS' ? 'badge-info' :
                      ticket.status === 'ON_HOLD' ? 'badge-warning' : 
                      ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' ? 'badge-success' :
                      'badge-gray'
                    }`}>
                      {ticket.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}