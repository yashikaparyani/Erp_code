'use client';
import Link from 'next/link';
import { TrendingUp, TrendingDown, Building2, Camera, Activity, IndianRupee, Target, CheckCircle2 } from 'lucide-react';
import { useRole } from '../context/RoleContext';

// Import role-specific dashboards
import ProjectHeadDashboard from '../components/dashboards/ProjectHeadDashboard';
import PresalesDashboard from '../components/dashboards/PresalesDashboard';
import ProcurementDashboard from '../components/dashboards/ProcurementDashboard';
import StoresDashboard from '../components/dashboards/StoresDashboard';
import ExecutionDashboard from '../components/dashboards/ExecutionDashboard';
import AccountsDashboard from '../components/dashboards/AccountsDashboard';
import OMDashboard from '../components/dashboards/OMDashboard';

export default function Home() {
  const { currentRole } = useRole();

  // Map roles to their personalized dashboards
  const getDashboardByRole = () => {
    switch (currentRole) {
      case 'Project Manager':
        return <ProjectHeadDashboard />;
      case 'Presales Tendering Head':
        return <PresalesDashboard />;
      case 'Purchase':
        return <ProcurementDashboard />;
      case 'Stores Logistics Head':
        return <StoresDashboard />;
      case 'Field Technician':
        return <ExecutionDashboard />;
      case 'Accounts':
        return <AccountsDashboard />;
      case 'OM Operator':
        return <OMDashboard />;
      // Default executive dashboard for Director, Department Head, Engineering Head, Engineer
      default:
        return <DefaultExecutiveDashboard />;
    }
  };

  return getDashboardByRole();
}

function DefaultExecutiveDashboard() {
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Executive Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Indore Smart City Surveillance Phase II • Last updated: Mar 10, 2026 10:45 AM</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <SummaryCard 
          title="Total Projects" 
          value="12" 
          change="+2 this month" 
          trend="up"
          href="/pre-sales" 
        />
        <SummaryCard 
          title="Active Sites" 
          value="356" 
          change="+18 last week" 
          trend="up"
          href="/execution" 
        />
        <SummaryCard 
          title="Budget Utilization" 
          value="82%" 
          change="₹68.88 Cr / ₹84 Cr" 
          href="/finance" 
        />
        <SummaryCard 
          title="SLA Compliance" 
          value="98.7%" 
          change="+0.3% this week" 
          trend="up"
          href="/om-helpdesk" 
        />
        <SummaryCard 
          title="Critical Tickets" 
          value="6" 
          change="Requires attention" 
          trend="down"
          href="/om-helpdesk" 
        />
        <SummaryCard 
          title="Pending Approvals" 
          value="14" 
          change="Across all modules" 
          href="/reports" 
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
        {/* Budget vs Actual */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900">Budget vs Actual (₹ Crores)</h3>
          </div>
          <div className="card-body">
            <BudgetChart />
            <div className="flex gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500"></div>
                <span className="text-sm text-gray-600">Budget</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-orange-400"></div>
                <span className="text-sm text-gray-600">Actual</span>
              </div>
            </div>
          </div>
        </div>

        {/* Physical vs Financial Progress */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900">Physical vs Financial Progress (%)</h3>
          </div>
          <div className="card-body">
            <ProgressChart />
            <div className="flex gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-500"></div>
                <span className="text-sm text-gray-600">Physical</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-cyan-500"></div>
                <span className="text-sm text-gray-600">Financial</span>
              </div>
            </div>
          </div>
        </div>

        {/* SLA Breach Trend */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900">SLA Breach Trend (Weekly)</h3>
          </div>
          <div className="card-body">
            <SLAChart />
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vendor Performance */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900">Vendor Performance Rating</h3>
          </div>
          <div className="card-body">
            <VendorRatings />
          </div>
        </div>

        {/* Project Overview */}
        <div className="card lg:col-span-2">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900">Indore Smart City Surveillance Phase II - Project Overview</h3>
          </div>
          <div className="card-body">
            <ProjectOverview />
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, change, trend, href }: { 
  title: string; 
  value: string; 
  change: string; 
  trend?: 'up' | 'down';
  href: string;
}) {
  return (
    <Link href={href} className="stat-card hover:shadow-md transition-shadow cursor-pointer">
      <div className="stat-label">{title}</div>
      <div className="stat-value mt-1">{value}</div>
      <div className={`stat-change flex items-center gap-1 ${trend === 'up' ? 'positive' : trend === 'down' ? 'negative' : 'text-gray-500'}`}>
        {trend === 'up' && <TrendingUp className="w-3 h-3" />}
        {trend === 'down' && <TrendingDown className="w-3 h-3" />}
        {change}
      </div>
    </Link>
  );
}

function BudgetChart() {
  const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
  const budget = [20, 35, 50, 60, 70, 80, 90, 100];
  const actual = [0, 10, 25, 40, 50, 60, 70, 82];
  
  return (
    <div className="h-48">
      <div className="flex items-end justify-between h-40 gap-2">
        {months.map((month, i) => (
          <div key={month} className="flex-1 flex flex-col items-center gap-1">
            <div className="flex items-end gap-1 h-32 w-full justify-center">
              <div 
                className="w-3 bg-blue-500 rounded-t transition-all" 
                style={{ height: `${budget[i]}%` }}
              ></div>
              <div 
                className="w-3 bg-orange-400 rounded-t transition-all" 
                style={{ height: `${actual[i]}%` }}
              ></div>
            </div>
            <span className="text-xs text-gray-500">{month}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgressChart() {
  const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
  const physical = [0, 10, 25, 45, 55, 65, 75, 85];
  const financial = [0, 8, 20, 35, 50, 60, 72, 80];
  
  return (
    <div className="h-48">
      <div className="flex items-end justify-between h-40 gap-2">
        {months.map((month, i) => (
          <div key={month} className="flex-1 flex flex-col items-center gap-1">
            <div className="flex items-end gap-1 h-32 w-full justify-center">
              <div 
                className="w-3 bg-green-500 rounded-t transition-all" 
                style={{ height: `${physical[i]}%` }}
              ></div>
              <div 
                className="w-3 bg-cyan-500 rounded-t transition-all" 
                style={{ height: `${financial[i]}%` }}
              ></div>
            </div>
            <span className="text-xs text-gray-500">{month}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SLAChart() {
  const weeks = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'];
  const data = [2, 4, 3, 5, 6, 4, 7, 8];
  const maxVal = Math.max(...data);
  
  return (
    <div className="h-48">
      <svg className="w-full h-40" viewBox="0 0 320 160">
        {/* Grid lines */}
        {[0, 40, 80, 120, 160].map((y, i) => (
          <g key={i}>
            <line x1="0" y1={y} x2="320" y2={y} stroke="#e5e7eb" strokeWidth="1" />
            <text x="-5" y={160 - y + 4} fontSize="10" fill="#9ca3af" textAnchor="end">{i * 2}</text>
          </g>
        ))}
        {/* Line chart */}
        <polyline
          fill="none"
          stroke="#ef4444"
          strokeWidth="2"
          points={data.map((d, i) => `${i * 40 + 20},${160 - (d / maxVal) * 140}`).join(' ')}
        />
        {/* Dots */}
        {data.map((d, i) => (
          <circle
            key={i}
            cx={i * 40 + 20}
            cy={160 - (d / maxVal) * 140}
            r="4"
            fill="#ef4444"
          />
        ))}
      </svg>
      <div className="flex justify-between px-2 mt-1">
        {weeks.map(w => (
          <span key={w} className="text-xs text-gray-500">{w}</span>
        ))}
      </div>
    </div>
  );
}

function VendorRatings() {
  const vendors = [
    { name: 'Vendor A', orders: 24, rating: 4.8 },
    { name: 'Vendor B', orders: 18, rating: 4.5 },
    { name: 'Vendor C', orders: 15, rating: 4.2 },
    { name: 'Vendor D', orders: 12, rating: 4.0 },
  ];
  
  return (
    <div className="space-y-4">
      {vendors.map(v => (
        <div key={v.name} className="flex items-center justify-between">
          <div>
            <span className="font-medium text-gray-900">{v.name}</span>
            <span className="ml-2 text-sm text-gray-500">{v.orders} orders</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map(star => (
                <svg 
                  key={star} 
                  className={`w-4 h-4 ${star <= Math.floor(v.rating) ? 'text-yellow-400' : 'text-gray-200'}`} 
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="font-semibold text-gray-900">{v.rating}/5.0</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProjectOverview() {
  const stats = [
    { icon: Building2, label: 'Total Sites', value: '356' },
    { icon: Camera, label: 'Total Cameras', value: '1,248' },
    { icon: Activity, label: 'Fiber Length', value: '72 KM' },
    { icon: IndianRupee, label: 'Total Budget', value: '₹84 Cr' },
    { icon: Target, label: 'Target SLA', value: '99.5%' },
    { icon: CheckCircle2, label: 'Completion', value: '85%' },
  ];
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map(stat => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className="bg-blue-50 rounded-lg p-4 text-center">
            <Icon className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <div className="text-xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-xs text-gray-600">{stat.label}</div>
          </div>
        );
      })}
    </div>
  );
}
