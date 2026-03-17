'use client';
import { useEffect, useState } from 'react';
import { Plus, HeadphonesIcon, Building2, AlertTriangle, Clock, CheckCircle2, X } from 'lucide-react';

interface Ticket {
  name: string;
  title?: string;
  linked_project?: string;
  linked_site?: string;
  asset_serial_no?: string;
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
  const [busyTicket, setBusyTicket] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [assignModal, setAssignModal] = useState<string | null>(null);
  const [assignTo, setAssignTo] = useState('');
  const [commentModal, setCommentModal] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [createForm, setCreateForm] = useState({
    title: '',
    linked_project: '',
    linked_site: '',
    asset_serial_no: '',
    category: 'OTHER',
    priority: 'MEDIUM',
    description: '',
  });

  const loadTickets = () => {
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
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleCreateTicket = async () => {
    if (!createForm.title.trim()) {
      setCreateError('Title is required.');
      return;
    }

    setCreating(true);
    setCreateError('');
    try {
      const payload = {
        title: createForm.title.trim(),
        linked_project: createForm.linked_project.trim() || undefined,
        linked_site: createForm.linked_site.trim() || undefined,
        asset_serial_no: createForm.asset_serial_no.trim() || undefined,
        category: createForm.category,
        priority: createForm.priority,
        description: createForm.description.trim() || undefined,
      };

      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to create ticket');
      }

      setShowCreateModal(false);
      setCreateForm({
        title: '',
        linked_project: '',
        linked_site: '',
        asset_serial_no: '',
        category: 'OTHER',
        priority: 'MEDIUM',
        description: '',
      });
      await loadTickets();
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Failed to create ticket');
    } finally {
      setCreating(false);
    }
  };

  const handleConvertToRMA = async (ticket: Ticket) => {
    setBusyTicket(ticket.name);
    try {
      const response = await fetch(`/api/tickets/${encodeURIComponent(ticket.name)}/convert-rma`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linked_project: ticket.linked_project || '',
          asset_serial_number: ticket.asset_serial_no || '',
          failure_reason: ticket.title || '',
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || 'Failed to convert ticket to RMA');
      }
      await loadTickets();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to convert ticket to RMA');
    } finally {
      setBusyTicket(null);
    }
  };

  const handleTicketAction = async (ticketName: string, method: string) => {
    setBusyTicket(ticketName);
    try {
      await fetch('/api/ops', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ method, args: { name: ticketName } }) });
      await loadTickets();
    } catch (e) { console.error(method, 'failed:', e); }
    setBusyTicket(null);
  };

  const handleAssign = async () => {
    if (!assignModal || !assignTo.trim()) return;
    setBusyTicket(assignModal);
    try {
      await fetch('/api/ops', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ method: 'assign_ticket', args: { name: assignModal, assigned_to: assignTo.trim() } }) });
      setAssignModal(null); setAssignTo(''); await loadTickets();
    } catch (e) { console.error('assign failed:', e); }
    setBusyTicket(null);
  };

  const handleAddComment = async () => {
    if (!commentModal || !commentText.trim()) return;
    setBusyTicket(commentModal);
    try {
      await fetch('/api/ops', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ method: 'add_ticket_comment', args: { name: commentModal, comment: commentText.trim() } }) });
      setCommentModal(null); setCommentText('');
    } catch (e) { console.error('comment failed:', e); }
    setBusyTicket(null);
  };

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
        <button className="btn btn-primary w-full sm:w-auto" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4" />
          Create Ticket
        </button>
      </div>

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Create Ticket</h2>
              <button className="p-2 rounded-lg hover:bg-gray-100" onClick={() => setShowCreateModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input className="input" value={createForm.title} onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select className="input" value={createForm.category} onChange={(e) => setCreateForm((p) => ({ ...p, category: e.target.value }))}>
                  <option value="HARDWARE_ISSUE">HARDWARE_ISSUE</option>
                  <option value="SOFTWARE_ISSUE">SOFTWARE_ISSUE</option>
                  <option value="NETWORK_ISSUE">NETWORK_ISSUE</option>
                  <option value="PERFORMANCE">PERFORMANCE</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority *</label>
                <select className="input" value={createForm.priority} onChange={(e) => setCreateForm((p) => ({ ...p, priority: e.target.value }))}>
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Linked Project</label>
                <input className="input" value={createForm.linked_project} onChange={(e) => setCreateForm((p) => ({ ...p, linked_project: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Linked Site</label>
                <input className="input" value={createForm.linked_site} onChange={(e) => setCreateForm((p) => ({ ...p, linked_site: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Asset Serial No</label>
                <input className="input" value={createForm.asset_serial_no} onChange={(e) => setCreateForm((p) => ({ ...p, asset_serial_no: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea className="input min-h-24" value={createForm.description} onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))} />
              </div>
            </div>
            {createError ? <p className="px-6 pb-2 text-sm text-red-600">{createError}</p> : null}
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateTicket} disabled={creating}>{creating ? 'Creating...' : 'Create Ticket'}</button>
            </div>
          </div>
        </div>
      ) : null}

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
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-gray-500">No tickets found</td></tr>
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
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {ticket.is_rma ? (
                        <span className="badge badge-success">RMA</span>
                      ) : (
                        <button onClick={() => handleConvertToRMA(ticket)} disabled={busyTicket === ticket.name} className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 disabled:opacity-50">RMA</button>
                      )}
                      {ticket.status === 'NEW' && (
                        <>
                          <button onClick={() => { setAssignModal(ticket.name); setAssignTo(ticket.assigned_to || ''); }} className="px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 rounded hover:bg-purple-100">Assign</button>
                          <button onClick={() => handleTicketAction(ticket.name, 'start_ticket')} disabled={busyTicket === ticket.name} className="px-2 py-1 text-xs font-medium text-green-700 bg-green-50 rounded hover:bg-green-100 disabled:opacity-50">Start</button>
                        </>
                      )}
                      {ticket.status === 'ASSIGNED' && (
                        <button onClick={() => handleTicketAction(ticket.name, 'start_ticket')} disabled={busyTicket === ticket.name} className="px-2 py-1 text-xs font-medium text-green-700 bg-green-50 rounded hover:bg-green-100 disabled:opacity-50">Start</button>
                      )}
                      {ticket.status === 'IN_PROGRESS' && (
                        <>
                          <button onClick={() => handleTicketAction(ticket.name, 'pause_ticket')} disabled={busyTicket === ticket.name} className="px-2 py-1 text-xs font-medium text-yellow-700 bg-yellow-50 rounded hover:bg-yellow-100 disabled:opacity-50">Pause</button>
                          <button onClick={() => handleTicketAction(ticket.name, 'resolve_ticket')} disabled={busyTicket === ticket.name} className="px-2 py-1 text-xs font-medium text-green-700 bg-green-50 rounded hover:bg-green-100 disabled:opacity-50">Resolve</button>
                        </>
                      )}
                      {ticket.status === 'ON_HOLD' && (
                        <button onClick={() => handleTicketAction(ticket.name, 'resume_ticket')} disabled={busyTicket === ticket.name} className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 disabled:opacity-50">Resume</button>
                      )}
                      {ticket.status === 'RESOLVED' && (
                        <button onClick={() => handleTicketAction(ticket.name, 'close_ticket')} disabled={busyTicket === ticket.name} className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50">Close</button>
                      )}
                      {ticket.status !== 'CLOSED' && (
                        <>
                          <button onClick={() => handleTicketAction(ticket.name, 'escalate_ticket')} disabled={busyTicket === ticket.name} className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 disabled:opacity-50">Escalate</button>
                          <button onClick={() => { setCommentModal(ticket.name); setCommentText(''); }} className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-50 rounded hover:bg-gray-100">Comment</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Modal */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Assign Ticket</h3>
              <button onClick={() => setAssignModal(null)} className="p-1 text-gray-500 hover:text-gray-700 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Assign To (email)</label>
              <input type="text" value={assignTo} onChange={(e) => setAssignTo(e.target.value)} placeholder="user@technosys.local" className="input w-full" />
            </div>
            <div className="flex justify-end gap-3 px-4 py-3 border-t border-gray-200">
              <button onClick={() => setAssignModal(null)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleAssign} disabled={busyTicket === assignModal} className="btn btn-primary">{busyTicket === assignModal ? 'Assigning...' : 'Assign'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Comment Modal */}
      {commentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Add Comment</h3>
              <button onClick={() => setCommentModal(null)} className="p-1 text-gray-500 hover:text-gray-700 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4">
              <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Enter comment..." className="input w-full min-h-[100px]" />
            </div>
            <div className="flex justify-end gap-3 px-4 py-3 border-t border-gray-200">
              <button onClick={() => setCommentModal(null)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleAddComment} disabled={busyTicket === commentModal} className="btn btn-primary">{busyTicket === commentModal ? 'Sending...' : 'Add Comment'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
