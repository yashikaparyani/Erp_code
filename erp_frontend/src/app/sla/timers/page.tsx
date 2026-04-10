'use client';

import { Timer, Pause, Play, XCircle } from 'lucide-react';
import OpsWorkspace from '../../../components/ops/OpsWorkspace';

export default function SlaTimersPage() {
  const isPaused = (row: any) => {
    try {
      const intervals = JSON.parse(row.paused_intervals || '[]');
      return intervals.length > 0 && !intervals[intervals.length - 1].resumed_at;
    } catch { return false; }
  };

  return (
    <OpsWorkspace
      title="SLA Timers"
      subtitle="Active and closed SLA timers linked to helpdesk tickets."
      listMethod="get_sla_timers"
      createMethod="create_sla_timer"
      createLabel="Create SLA Timer"
      createFields={[
        { name: 'linked_ticket', label: 'Ticket', placeholder: 'Ticket name/ID' },
        { name: 'sla_profile', label: 'SLA Profile', placeholder: 'SLA profile name' },
        { name: 'started_on', label: 'Started On', type: 'text', placeholder: 'YYYY-MM-DD HH:MM' },
      ]}
      actions={[
        {
          label: 'Pause',
          tone: 'warning',
          visible: (row) => !row.closed_on && !isPaused(row),
          buildRequest: (row) => ({ method: 'pause_sla_timer', args: { name: row.name } }),
          confirmMessage: 'Pause this SLA timer?',
        },
        {
          label: 'Resume',
          tone: 'success',
          visible: (row) => !row.closed_on && isPaused(row),
          buildRequest: (row) => ({ method: 'resume_sla_timer', args: { name: row.name } }),
          confirmMessage: 'Resume this SLA timer?',
        },
        {
          label: 'Close',
          tone: 'danger',
          visible: (row) => !row.closed_on,
          buildRequest: (row) => ({ method: 'close_sla_timer', args: { name: row.name, response_met: 1, resolution_met: 1 } }),
          confirmMessage: 'Close this SLA timer and mark SLAs as met?',
        },
      ]}
      statsCards={[
        { label: 'Total Timers', path: 'length', hint: 'All SLA timers', icon: Timer, tone: 'blue' },
      ]}
      columns={[
        { key: 'name', label: 'Timer', render: (row) => row.name || '-' },
        { key: 'linked_ticket', label: 'Ticket', render: (row) => row.linked_ticket || '-' },
        { key: 'sla_profile', label: 'Profile', render: (row) => row.sla_profile || '-' },
        { key: 'started_on', label: 'Started', render: (row) => row.started_on ? new Date(row.started_on).toLocaleString() : '-' },
        { key: 'response_deadline', label: 'Response Due', render: (row) => row.response_deadline ? new Date(row.response_deadline).toLocaleString() : '-' },
        { key: 'resolution_deadline', label: 'Resolution Due', render: (row) => row.resolution_deadline ? new Date(row.resolution_deadline).toLocaleString() : '-' },
        { key: 'status', label: 'Status', render: (row) => {
          if (row.closed_on) return <span className="text-gray-500">Closed</span>;
          if (isPaused(row)) return <span className="text-yellow-600 font-medium">Paused</span>;
          return <span className="text-green-600 font-medium">Running</span>;
        }},
        { key: 'elapsed', label: 'Elapsed (min)', render: (row) => row.current_elapsed_minutes ?? '-' },
        { key: 'response_met', label: 'Resp Met', render: (row) => row.closed_on ? (row.response_sla_met ? '✓' : '✗') : '-' },
        { key: 'resolution_met', label: 'Resol Met', render: (row) => row.closed_on ? (row.resolution_sla_met ? '✓' : '✗') : '-' },
      ]}
      emptyMessage="No SLA timers found"
    />
  );
}
