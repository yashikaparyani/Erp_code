'use client';
import { useEffect, useState } from 'react';
import { PieChart, DollarSign, Users, Clock } from 'lucide-react';

type Tab = 'finance' | 'sales' | 'login';

export default function MISReportsPage() {
  const [tab, setTab] = useState<Tab>('finance');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTab = async (t: Tab) => {
    setLoading(true);
    const endpoints: Record<Tab, string> = {
      finance: '/api/ops',
      sales: '/api/ops',
      login: '/api/ops',
    };
    const methods: Record<Tab, string> = { finance: 'get_finance_mis', sales: 'get_sales_mis', login: 'get_login_mis' };
    try {
      const res = await fetch(endpoints[t], { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ method: methods[t], args: {} }) });
      const payload = await res.json().catch(() => ({}));
      setData(payload.data || []);
    } catch { setData([]); }
    setLoading(false);
  };

  useEffect(() => { loadTab(tab); }, [tab]);

  const tabClass = (t: Tab) => tab === t ? 'border-b-2 border-blue-600 text-blue-600 pb-2 px-4 font-medium text-sm' : 'pb-2 px-4 text-gray-500 hover:text-gray-700 text-sm cursor-pointer';

  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">MIS Reports</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">Management Information System — Finance, Sales, and Login activity.</p>
      </div>

      <div className="flex gap-2 border-b border-gray-200 mb-4">
        <button className={tabClass('finance')} onClick={() => setTab('finance')}><DollarSign className="w-4 h-4 inline mr-1" />Finance MIS</button>
        <button className={tabClass('sales')} onClick={() => setTab('sales')}><Users className="w-4 h-4 inline mr-1" />Sales MIS</button>
        <button className={tabClass('login')} onClick={() => setTab('login')}><Clock className="w-4 h-4 inline mr-1" />Login MIS</button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>
      ) : (
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">{tab === 'finance' ? 'Finance MIS' : tab === 'sales' ? 'Sales MIS' : 'Login Activity'}</h3></div>
          <div className="overflow-x-auto">
            {tab === 'finance' && (
              <table className="data-table">
                <thead><tr><th>Tender</th><th>Status</th><th>Instrument Type</th><th>Amount</th><th>Date</th></tr></thead>
                <tbody>
                  {data.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-gray-500">No finance MIS data</td></tr> : data.map((r, i) => (
                    <tr key={i}><td className="text-sm">{r.tender || r.name || '-'}</td><td className="text-sm">{r.status || '-'}</td><td className="text-sm">{r.instrument_type || '-'}</td><td className="text-sm font-medium">₹ {(r.amount || 0).toLocaleString('en-IN')}</td><td className="text-sm">{r.date || r.creation || '-'}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
            {tab === 'sales' && (
              <table className="data-table">
                <thead><tr><th>User</th><th>Assigned</th><th>In Process</th><th>Submitted</th><th>Awarded</th><th>Lost</th><th>Total</th></tr></thead>
                <tbody>
                  {data.length === 0 ? <tr><td colSpan={7} className="text-center py-8 text-gray-500">No sales MIS data</td></tr> : data.map((r, i) => (
                    <tr key={i}><td className="text-sm font-medium">{r.user || '-'}</td><td className="text-sm">{r.assigned ?? 0}</td><td className="text-sm">{r.in_process ?? 0}</td><td className="text-sm">{r.submitted ?? 0}</td><td className="text-sm text-green-700 font-medium">{r.awarded ?? 0}</td><td className="text-sm text-red-700">{r.lost ?? 0}</td><td className="text-sm font-medium">{r.total ?? 0}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
            {tab === 'login' && (
              <table className="data-table">
                <thead><tr><th>User</th><th>Full Name</th><th>Operation</th><th>IP Address</th><th>Time</th></tr></thead>
                <tbody>
                  {data.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-gray-500">No login activity data</td></tr> : data.map((r, i) => (
                    <tr key={i}><td className="text-sm font-medium">{r.user || '-'}</td><td className="text-sm">{r.full_name || '-'}</td><td className="text-sm"><span className={`badge ${r.operation === 'Login' ? 'badge-green' : 'badge-yellow'}`}>{r.operation || '-'}</span></td><td className="text-sm text-gray-700">{r.ip_address || '-'}</td><td className="text-sm">{r.creation || '-'}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
