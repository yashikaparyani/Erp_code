'use client';

import { useState } from 'react';
import { Play, Clock, Bell, AlertTriangle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';

interface JobResult {
  success: boolean;
  created?: number;
  processed?: number;
  message?: string;
}

interface JobRun {
  action: string;
  label: string;
  result: JobResult | null;
  error: string | null;
  ranAt: string;
}

async function runReminderAction(action: string): Promise<JobResult> {
  const res = await fetch('/api/system/reminders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
  const payload = await res.json();
  if (!res.ok || !payload.success) throw new Error(payload.message || `Action "${action}" failed`);
  return payload;
}

export default function OperationsConsolePage() {
  const [history, setHistory] = useState<JobRun[]>([]);
  const [running, setRunning] = useState<string | null>(null);

  const execute = async (action: string, label: string) => {
    setRunning(action);
    const ranAt = new Date().toLocaleTimeString();
    try {
      const result = await runReminderAction(action);
      setHistory(h => [{ action, label, result, error: null, ranAt }, ...h]);
    } catch (e) {
      setHistory(h => [{ action, label, result: null, error: e instanceof Error ? e.message : 'Unknown error', ranAt }, ...h]);
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">System Operations</h1>
        <p className="text-sm text-gray-500 mt-1">Trigger and inspect background maintenance jobs. Restricted to Director / System Manager.</p>
      </div>

      {/* Job Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <JobCard
          icon={<Bell className="h-5 w-5 text-blue-600" />}
          title="Generate System Reminders"
          description="Scans milestones due within 3 days, expiring documents (7 days), and stale approvals (3+ days pending). Creates reminders for each. Idempotent — won't duplicate existing active reminders."
          action="generate"
          running={running === 'generate'}
          onRun={() => execute('generate', 'Generate System Reminders')}
        />
        <JobCard
          icon={<RefreshCw className="h-5 w-5 text-emerald-600" />}
          title="Process Due Reminders"
          description="Finds active unsent reminders that have reached their scheduled time and dispatches alert notifications. Processes up to 50 per batch."
          action="process_due"
          running={running === 'process_due'}
          onRun={() => execute('process_due', 'Process Due Reminders')}
        />
      </div>

      {/* Run History */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Clock className="h-4 w-4" /> Run History</h2>
          <p className="text-xs text-gray-500 mt-1">Results from this session (most recent first).</p>
        </div>
        <div className="overflow-x-auto">
          {history.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">No jobs have been run yet this session.</div>
          ) : (
            <table className="data-table text-sm">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Job</th>
                  <th>Status</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {history.map((run, i) => (
                  <tr key={i}>
                    <td className="font-mono text-xs text-gray-500 whitespace-nowrap">{run.ranAt}</td>
                    <td className="font-medium text-gray-900">{run.label}</td>
                    <td>
                      {run.error ? (
                        <span className="badge badge-error flex items-center gap-1 w-fit"><AlertTriangle className="h-3 w-3" /> Error</span>
                      ) : (
                        <span className="badge badge-success flex items-center gap-1 w-fit"><CheckCircle2 className="h-3 w-3" /> Success</span>
                      )}
                    </td>
                    <td className="text-gray-700">
                      {run.error ? (
                        <span className="text-rose-600 text-xs">{run.error}</span>
                      ) : run.result ? (
                        <span className="text-xs">
                          {run.result.created !== undefined && <span className="mr-3">Created: <strong>{run.result.created}</strong></span>}
                          {run.result.processed !== undefined && <span className="mr-3">Processed: <strong>{run.result.processed}</strong></span>}
                          {run.result.message && <span className="text-gray-500">{run.result.message}</span>}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Job Card ───────────────────────────────────────────────────────── */

function JobCard({ icon, title, description, action, running, onRun }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: string;
  running: boolean;
  onRun: () => void;
}) {
  return (
    <div className="card">
      <div className="card-body space-y-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{icon}</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{description}</p>
          </div>
        </div>
        <button
          className="btn btn-primary w-full justify-center"
          onClick={onRun}
          disabled={running}
        >
          {running ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Running…</>
          ) : (
            <><Play className="h-4 w-4" /> Run Now</>
          )}
        </button>
      </div>
    </div>
  );
}
