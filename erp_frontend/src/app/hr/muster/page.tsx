'use client';

import { useCallback, useEffect, useState } from 'react';
import RegisterPage from '@/components/shells/RegisterPage';

interface MusterRow {
  employee: string;
  employee_name?: string;
  department?: string;
  date?: string;
  status?: string;
  total_hours?: number;
}

export default function AttendanceMusterPage() {
  const [items, setItems] = useState<MusterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'get_attendance_muster', args: { month } }),
      });
      const payload = await res.json();
      setItems(Array.isArray(payload.data) ? payload.data : []);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load'); }
    finally { setLoading(false); }
  }, [month]);

  useEffect(() => { load(); }, [load]);

  return (
    <RegisterPage
      title="Attendance Muster"
      description="Monthly attendance muster for all employees."
      loading={loading}
      error={error}
      onRetry={load}
      empty={!loading && items.length === 0}
      emptyTitle="No muster data"
      emptyDescription="No attendance data for the selected month."
      stats={[{ label: 'Records', value: items.length }]}
      filterBar={
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Month:</label>
          <input type="month" className="input w-44" value={month} onChange={e => setMonth(e.target.value)} />
        </div>
      }
    >
      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">Muster Report — {month}</h3></div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Employee</th><th>Name</th><th>Department</th><th>Date</th><th>Status</th><th>Hours</th></tr></thead>
            <tbody>
              {items.length === 0
                ? <tr><td colSpan={6} className="text-center py-8 text-gray-500">No records</td></tr>
                : items.map((row, i) => (
                  <tr key={`${row.employee}-${row.date}-${i}`}>
                    <td className="font-medium text-gray-900">{row.employee || '-'}</td>
                    <td>{row.employee_name || '-'}</td>
                    <td>{row.department || '-'}</td>
                    <td className="text-sm text-gray-700">{row.date || '-'}</td>
                    <td><span className={`badge ${row.status === 'Present' ? 'badge-green' : row.status === 'Absent' ? 'badge-red' : 'badge-gray'}`}>{row.status || '-'}</span></td>
                    <td className="text-sm text-gray-700">{row.total_hours ?? '-'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </RegisterPage>
  );
}
