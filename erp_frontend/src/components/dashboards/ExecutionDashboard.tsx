'use client';
import { Calendar, FileText, Camera, Link2, Users, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock, Target } from 'lucide-react';

export default function ExecutionDashboard() {
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Execution Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Timeline tracking, DPR, site progress & resources • Last updated: Mar 10, 2026 10:45 AM</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        <SummaryCard title="On Schedule" value="68%" change="156 / 230 sites" trend="up" icon={Calendar} color="green" />
        <SummaryCard title="DPR Pending" value="12" change="Submit today" trend="down" icon={FileText} color="orange" />
        <SummaryCard title="Site Photos" value="45" change="Uploaded today" trend="up" icon={Camera} color="blue" />
        <SummaryCard title="Dependencies" value="8" change="Blocking progress" trend="down" icon={Link2} color="red" />
        <SummaryCard title="Manpower" value="342" change="Deployed today" icon={Users} color="purple" />
      </div>

      {/* Timeline vs Actual */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-600" />
            Timeline vs Actual Progress
          </h3>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded"></span> Planned</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded"></span> Actual</span>
          </div>
        </div>
        <div className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase">
                  <th className="pb-3 font-medium">Zone / Activity</th>
                  <th className="pb-3 font-medium">Planned</th>
                  <th className="pb-3 font-medium">Actual</th>
                  <th className="pb-3 font-medium">Variance</th>
                  <th className="pb-3 font-medium w-64">Progress</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {[
                  { zone: 'Zone A - Camera Installation', planned: 85, actual: 82, status: 'On Track' },
                  { zone: 'Zone A - Fiber Laying', planned: 90, actual: 88, status: 'On Track' },
                  { zone: 'Zone B - Civil Works', planned: 70, actual: 55, status: 'Delayed' },
                  { zone: 'Zone B - Camera Installation', planned: 60, actual: 58, status: 'On Track' },
                  { zone: 'Zone C - Site Preparation', planned: 45, actual: 35, status: 'At Risk' },
                  { zone: 'CCC - Infrastructure', planned: 75, actual: 78, status: 'Ahead' },
                  { zone: 'CCC - Integration', planned: 50, actual: 52, status: 'Ahead' },
                ].map((row, idx) => (
                  <tr key={idx} className="border-t border-gray-100">
                    <td className="py-3 font-medium text-gray-900">{row.zone}</td>
                    <td className="py-3 text-blue-600">{row.planned}%</td>
                    <td className="py-3 text-green-600">{row.actual}%</td>
                    <td className={`py-3 font-semibold ${row.actual >= row.planned ? 'text-green-600' : 'text-red-600'}`}>
                      {row.actual >= row.planned ? '+' : ''}{row.actual - row.planned}%
                    </td>
                    <td className="py-3">
                      <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
                        <div className="absolute inset-y-0 left-0 bg-blue-200 rounded-full" style={{ width: `${row.planned}%` }}></div>
                        <div className="absolute inset-y-0 left-0 bg-green-500 rounded-full" style={{ width: `${row.actual}%` }}></div>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        row.status === 'Ahead' ? 'bg-green-100 text-green-600' :
                        row.status === 'On Track' ? 'bg-blue-100 text-blue-600' :
                        row.status === 'Delayed' ? 'bg-red-100 text-red-600' :
                        'bg-orange-100 text-orange-600'
                      }`}>{row.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* DPR Status */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-600" />
              Daily Progress Report (DPR)
            </h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-green-600">18</p>
                <p className="text-xs text-gray-600">Submitted</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-orange-600">12</p>
                <p className="text-xs text-gray-600">Pending</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-red-600">4</p>
                <p className="text-xs text-gray-600">Overdue</p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Pending DPRs:</p>
              {[
                { site: 'Zone B - Junction 5', engineer: 'Amit K.', due: 'Today' },
                { site: 'Zone C - Market Area', engineer: 'Rahul S.', due: 'Today' },
                { site: 'Zone A - Cluster 3', engineer: 'Vikash P.', due: 'Overdue' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <p className="text-sm text-gray-900">{item.site}</p>
                    <p className="text-xs text-gray-500">{item.engineer}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    item.due === 'Overdue' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
                  }`}>{item.due}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Site Photos */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Camera className="w-5 h-5 text-blue-600" />
              Recent Site Photos
            </h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center">
                  <Camera className="w-6 h-6 text-gray-400" />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {[
                { site: 'Zone A - Cluster 2', photos: 12, time: '10:30 AM' },
                { site: 'Zone B - Junction', photos: 8, time: '09:45 AM' },
                { site: 'CCC Building', photos: 15, time: '09:00 AM' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{item.site}</span>
                  <span className="text-gray-500">{item.photos} photos • {item.time}</span>
                </div>
              ))}
            </div>
            <button className="w-full mt-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
              View All Photos →
            </button>
          </div>
        </div>

        {/* Dependencies */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Link2 className="w-5 h-5 text-red-600" />
              Blocking Dependencies
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {[
              { task: 'Power Connection - Site 45', blocking: 'Camera Installation', owner: 'MPEB', eta: 'Mar 12', critical: true },
              { task: 'Civil Work - Junction 8', blocking: 'Fiber Laying', owner: 'Civil Team', eta: 'Mar 14', critical: true },
              { task: 'NOC - Traffic Police', blocking: 'Zone B Work', owner: 'Admin', eta: 'Mar 18', critical: false },
              { task: 'Material Delivery', blocking: 'Zone C Start', owner: 'Procurement', eta: 'Mar 15', critical: false },
            ].map((item, idx) => (
              <div key={idx} className={`p-3 rounded-lg ${item.critical ? 'bg-red-50' : 'bg-orange-50'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">{item.task}</span>
                  {item.critical && <AlertTriangle className="w-4 h-4 text-red-600" />}
                </div>
                <p className="text-xs text-gray-600">Blocking: {item.blocking}</p>
                <div className="flex items-center justify-between mt-2 text-xs">
                  <span className="text-gray-500">Owner: {item.owner}</span>
                  <span className="text-gray-500">ETA: {item.eta}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Manpower Deployed */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            Manpower Deployed Today
          </h3>
          <span className="text-sm text-gray-500">Total: 342 personnel</span>
        </div>
        <div className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase">
                  <th className="pb-3 font-medium">Site / Zone</th>
                  <th className="pb-3 font-medium">Engineers</th>
                  <th className="pb-3 font-medium">Technicians</th>
                  <th className="pb-3 font-medium">Helpers</th>
                  <th className="pb-3 font-medium">Supervisors</th>
                  <th className="pb-3 font-medium">Total</th>
                  <th className="pb-3 font-medium">Required</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {[
                  { site: 'Zone A - All Clusters', eng: 8, tech: 45, help: 60, sup: 4, total: 117, req: 120, status: 'OK' },
                  { site: 'Zone B - Junctions', eng: 5, tech: 32, help: 40, sup: 3, total: 80, req: 85, status: 'OK' },
                  { site: 'Zone C - Markets', eng: 4, tech: 25, help: 35, sup: 2, total: 66, req: 80, status: 'Short' },
                  { site: 'CCC Building', eng: 6, tech: 18, help: 20, sup: 3, total: 47, req: 45, status: 'OK' },
                  { site: 'Fiber Routes', eng: 3, tech: 15, help: 12, sup: 2, total: 32, req: 40, status: 'Short' },
                ].map((row, idx) => (
                  <tr key={idx} className="border-t border-gray-100">
                    <td className="py-3 font-medium text-gray-900">{row.site}</td>
                    <td className="py-3 text-gray-600">{row.eng}</td>
                    <td className="py-3 text-gray-600">{row.tech}</td>
                    <td className="py-3 text-gray-600">{row.help}</td>
                    <td className="py-3 text-gray-600">{row.sup}</td>
                    <td className="py-3 font-semibold text-gray-900">{row.total}</td>
                    <td className="py-3 text-gray-500">{row.req}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        row.status === 'OK' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                      }`}>{row.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, change, trend, icon: Icon, color }: {
  title: string;
  value: string;
  change: string;
  trend?: 'up' | 'down';
  icon: any;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 font-medium">{title}</span>
        <div className={`p-1.5 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
      <div className={`text-xs mt-1 flex items-center gap-1 ${
        trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'
      }`}>
        {trend === 'up' && <TrendingUp className="w-3 h-3" />}
        {trend === 'down' && <TrendingDown className="w-3 h-3" />}
        {change}
      </div>
    </div>
  );
}
