'use client';

import { useCallback, useEffect, useState } from 'react';
import RegisterPage from '@/components/shells/RegisterPage';

interface WhoIsInRow {
  employee: string;
  employee_name?: string;
  department?: string;
  status?: string;
  check_in?: string;
  location?: string;
}

export default function WhoIsInPage() {
  const [items, setItems] = useState<WhoIsInRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/hr/who-is-in');
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.message || 'Failed to load');
      setItems(Array.isArray(payload.data) ? payload.data : []);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const present = items.filter(i => i.status === 'Present' || i.status === 'In').length;
  const absent = items.length - present;

  return (
    <RegisterPage
      title="Who Is In"
      description="Real-time view of employee presence for today."
      loading={loading}
      error={error}
      onRetry={load}
      empty={!loading && items.length === 0}
      emptyTitle="No attendance data"
      emptyDescription="No check-in records for today."
      stats={[
        { label: 'Total', value: items.length },
        { label: 'Present', value: present, variant: 'success' },
        { label: 'Absent', value: absent, variant: absent > 0 ? 'error' : 'default' },
      ]}
    >
      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">Today&apos;s Attendance</h3></div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Employee</th><th>Name</th><th>Department</th><th>Status</th><th>Check-In</th><th>Location</th></tr></thead>
            <tbody>
              {items.length === 0
                ? <tr><td colSpan={6} className="text-center py-8 text-gray-500">No records</td></tr>
                : items.map((row, i) => (
                  <tr key={row.employee || i}>
                    <td className="font-medium text-gray-900">{row.employee || '-'}</td>
                    <td>{row.employee_name || '-'}</td>
                    <td>{row.department || '-'}</td>
                    <td><span className={`badge ${row.status === 'Present' || row.status === 'In' ? 'badge-green' : 'badge-red'}`}>{row.status || '-'}</span></td>
                    <td className="text-sm text-gray-700">{row.check_in || '-'}</td>
                    <td className="text-sm text-gray-700">{row.location || '-'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </RegisterPage>
  );
}
