'use client';

import Link from 'next/link';
import { BarChart3, CreditCard, TrendingUp, Users2 } from 'lucide-react';
import { DashboardShell, MetricList, SectionCard, StatCard, useApiData } from '../../../../components/dashboards/shared';

export default function MisReportsPage() {
  const sales = useApiData<any[]>('/api/mis/sales', []);
  const finance = useApiData<any[]>('/api/mis/finance', []);
  const login = useApiData<any[]>('/api/mis/login', []);

  const loading = sales.loading || finance.loading || login.loading;
  const error = sales.error || finance.error || login.error;
  const lastUpdated = sales.lastUpdated || finance.lastUpdated || login.lastUpdated;

  return (
    <DashboardShell
      title="MIS Reports"
      subtitle="Central entry point for pre-sales MIS views already available in the system."
      loading={loading}
      error={error}
      lastUpdated={lastUpdated}
      onRetry={() => {
        void sales.refresh();
        void finance.refresh();
        void login.refresh();
      }}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard title="Sales MIS Rows" value={sales.data.length} hint="Current sales MIS output" icon={TrendingUp} tone="blue" />
        <StatCard title="Finance MIS Rows" value={finance.data.length} hint="Current finance MIS output" icon={CreditCard} tone="green" />
        <StatCard title="Login MIS Rows" value={login.data.length} hint="User activity audit rows" icon={Users2} tone="amber" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard title="Available MIS Reports" subtitle="Use these pages for detailed MIS review">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Link href="/pre-sales/mis/sales" className="rounded-xl border border-gray-200 bg-white p-4 hover:border-blue-300 hover:bg-blue-50">
              <div className="text-sm font-semibold text-gray-900">Sales MIS</div>
              <div className="mt-1 text-xs text-gray-500">Pipeline and sales visibility</div>
            </Link>
            <Link href="/pre-sales/mis/finance" className="rounded-xl border border-gray-200 bg-white p-4 hover:border-green-300 hover:bg-green-50">
              <div className="text-sm font-semibold text-gray-900">Finance MIS</div>
              <div className="mt-1 text-xs text-gray-500">EMD/PBG and finance reporting</div>
            </Link>
            <Link href="/pre-sales/mis/login" className="rounded-xl border border-gray-200 bg-white p-4 hover:border-amber-300 hover:bg-amber-50">
              <div className="text-sm font-semibold text-gray-900">Login MIS</div>
              <div className="mt-1 text-xs text-gray-500">Usage and access audit</div>
            </Link>
          </div>
        </SectionCard>

        <SectionCard title="MIS Health" subtitle="Quick row-count snapshot">
          <MetricList
            items={[
              { label: 'Sales MIS rows', value: sales.data.length },
              { label: 'Finance MIS rows', value: finance.data.length },
              { label: 'Login MIS rows', value: login.data.length },
            ]}
          />
        </SectionCard>
      </div>
    </DashboardShell>
  );
}
