'use client';
import { Plus, HeadphonesIcon, Building2, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';

const tickets = [
  {
    id: 'TKT-001',
    site: 'SITE-001',
    issue: 'Camera 3 - Video Feed Intermittent',
    category: 'Hardware Issue',
    priority: 'High',
    assignedTo: 'Vikram Singh',
    sla: '4 hrs remaining',
    status: 'In Progress',
  },
  {
    id: 'TKT-002',
    site: 'SITE-001',
    issue: 'Network Switch - Port 12 Not Responding',
    category: 'Network Issue',
    priority: 'Critical',
    assignedTo: 'Suresh Kumar',
    sla: '2 hrs overdue',
    status: 'Open',
  },
  {
    id: 'TKT-003',
    site: 'SITE-002',
    issue: 'PTZ Camera - Pan Function Not Working',
    category: 'Hardware Issue',
    priority: 'Medium',
    assignedTo: 'Vikram Singh',
    sla: 'Within SLA',
    status: 'Pending',
  },
];

export default function OMHelpdeskPage() {
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
              <div className="stat-value">3</div>
              <div className="stat-label">Total Sites</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">Under O&M</div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="stat-value">1</div>
              <div className="stat-label">Active Sites</div>
            </div>
          </div>
          <div className="text-xs text-green-600 mt-2">33.3% uptime</div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="stat-value">1</div>
              <div className="stat-label">Open Tickets</div>
            </div>
          </div>
          <div className="text-xs text-red-600 mt-2">1 critical</div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="stat-value">1</div>
              <div className="stat-label">In Progress</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">Being worked on</div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <HeadphonesIcon className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <div className="stat-value">0</div>
              <div className="stat-label">Resolved</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">This month</div>
        </div>
      </div>

      {/* Active Tickets Table */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Active Tickets</h3>
          <span className="badge badge-error">1 Critical</span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Site</th>
                <th>Issue</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Assigned To</th>
                <th>SLA Status</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map(ticket => (
                <tr key={ticket.id}>
                  <td>
                    <div className="font-medium text-gray-900">{ticket.id}</div>
                  </td>
                  <td>
                    <div className="text-gray-600">{ticket.site}</div>
                  </td>
                  <td>
                    <div className="font-medium text-gray-900 max-w-xs">{ticket.issue}</div>
                  </td>
                  <td>
                    <span className="badge badge-info">{ticket.category}</span>
                  </td>
                  <td>
                    <span className={`badge ${
                      ticket.priority === 'Critical' ? 'badge-error' : 
                      ticket.priority === 'High' ? 'badge-warning' : 
                      'badge-gray'
                    }`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td>
                    <div className="text-gray-900">{ticket.assignedTo}</div>
                  </td>
                  <td>
                    <div className={`text-sm font-medium ${
                      ticket.sla.includes('overdue') ? 'text-red-600' : 
                      ticket.sla.includes('remaining') ? 'text-yellow-600' : 
                      'text-green-600'
                    }`}>
                      {ticket.sla}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${
                      ticket.status === 'Open' ? 'badge-error' : 
                      ticket.status === 'In Progress' ? 'badge-info' :
                      ticket.status === 'Pending' ? 'badge-warning' : 
                      'badge-success'
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