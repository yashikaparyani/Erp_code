import Link from 'next/link';
import HRDashboard from '../../components/dashboards/HRDashboard';

export default function HRPage() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Link href="/hr/onboarding" className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 hover:border-blue-300 hover:bg-blue-50">Manage Onboarding</Link>
        <Link href="/hr/attendance" className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 hover:border-blue-300 hover:bg-blue-50">Manage Attendance</Link>
        <Link href="/hr/travel-logs" className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 hover:border-blue-300 hover:bg-blue-50">Manage Travel Logs</Link>
        <Link href="/hr/overtime" className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 hover:border-blue-300 hover:bg-blue-50">Manage Overtime</Link>
        <Link href="/hr/technician-visits" className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 hover:border-blue-300 hover:bg-blue-50">Manage Technician Visits</Link>
      </div>
      <HRDashboard />
    </div>
  );
}
