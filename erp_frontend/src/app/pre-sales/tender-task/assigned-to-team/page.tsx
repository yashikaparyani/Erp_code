'use client';
import { useState } from 'react';
import { Search, Filter, Download, ChevronDown, Calendar, Eye, Edit2, MoreVertical, Users, Clock, User, Mail, Phone } from 'lucide-react';

interface TeamAssignment {
  id: string;
  tenderNo: string;
  title: string;
  client: string;
  submissionDate: string;
  daysLeft: number;
  team: {
    name: string;
    members: { name: string; role: string; avatar?: string }[];
  };
  value: number;
  status: 'ACTIVE' | 'PENDING' | 'COMPLETED';
}

const mockAssignments: TeamAssignment[] = [
  {
    id: '1',
    tenderNo: 'TEN-2026-001',
    title: 'Smart City Surveillance System - Phase II',
    client: 'Indore Municipal Corporation',
    submissionDate: '2026-03-25',
    daysLeft: 16,
    team: {
      name: 'Technical Team A',
      members: [
        { name: 'Rahul Sharma', role: 'Lead Engineer' },
        { name: 'Priya Singh', role: 'Solution Architect' },
        { name: 'Amit Kumar', role: 'Technical Writer' },
      ],
    },
    value: 45000000,
    status: 'ACTIVE',
  },
  {
    id: '2',
    tenderNo: 'TEN-2026-004',
    title: 'Highway Toll Management System',
    client: 'NHAI',
    submissionDate: '2026-03-30',
    daysLeft: 21,
    team: {
      name: 'Project Team B',
      members: [
        { name: 'Vikram Desai', role: 'Project Manager' },
        { name: 'Neha Gupta', role: 'Business Analyst' },
      ],
    },
    value: 82000000,
    status: 'PENDING',
  },
  {
    id: '3',
    tenderNo: 'TEN-2026-005',
    title: 'Enterprise Resource Planning Implementation',
    client: 'ONGC',
    submissionDate: '2026-04-05',
    daysLeft: 27,
    team: {
      name: 'ERP Team',
      members: [
        { name: 'Suresh Patel', role: 'ERP Consultant' },
        { name: 'Meera Joshi', role: 'Functional Lead' },
        { name: 'Karan Malhotra', role: 'Technical Lead' },
        { name: 'Anita Rao', role: 'Documentation' },
      ],
    },
    value: 35000000,
    status: 'ACTIVE',
  },
];

export default function AssignedToTeamPage() {
  const [activeTab, setActiveTab] = useState<'New' | 'Live' | 'Archive'>('Live');
  const [showFilters, setShowFilters] = useState(false);

  const tabs = [
    { name: 'New', count: 2 },
    { name: 'Live', count: 6 },
    { name: 'Archive', count: 18 },
  ];

  const getStatusBadge = (status: TeamAssignment['status']) => {
    const styles = {
      ACTIVE: 'bg-green-100 text-green-700',
      PENDING: 'bg-yellow-100 text-yellow-700',
      COMPLETED: 'bg-blue-100 text-blue-700',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {status}
      </span>
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getDaysLeftColor = (days: number) => {
    if (days <= 7) return 'text-red-600 bg-red-50';
    if (days <= 14) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Assigned To Team</h1>
        <p className="text-gray-500 text-xs sm:text-sm mt-1">Tenders assigned to various teams</p>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
        >
          <div className="flex items-center gap-2 text-gray-600">
            <Search className="w-4 h-4" />
            <span>Tender Filter</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
        
        {showFilters && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tender No</label>
                <input
                  type="text"
                  placeholder="Search tender number..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Team</label>
                <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">All Teams</option>
                  <option value="team-a">Technical Team A</option>
                  <option value="team-b">Project Team B</option>
                  <option value="erp">ERP Team</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Status</label>
                <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Due Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end mt-4 gap-2">
              <button className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                Clear Filters
              </button>
              <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Apply Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Export Button */}
      <div className="flex justify-end mb-4">
        <button className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm">
          <Download className="w-4 h-4" />
          Export To Excel
        </button>
      </div>

      {/* Tabs and Sort */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name as typeof activeTab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.name
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.name} ({tab.count})
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-2">
          <select className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none">
            <option value="value">Value</option>
            <option value="date">Date</option>
            <option value="team">Team</option>
          </select>
          <button className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">
            <Filter className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Assignment List */}
      <div className="space-y-4">
        {mockAssignments.map((assignment) => (
          <div key={assignment.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-medium text-blue-600">{assignment.tenderNo}</span>
                    {getStatusBadge(assignment.status)}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getDaysLeftColor(assignment.daysLeft)}`}>
                      {assignment.daysLeft} days left
                    </span>
                  </div>
                  <h3 className="text-gray-800 font-medium mb-1">{assignment.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      {assignment.client}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Due: {formatDate(assignment.submissionDate)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Estimated Value</p>
                  <p className="text-lg font-semibold text-gray-800">{formatCurrency(assignment.value)}</p>
                </div>
              </div>
            </div>
            
            {/* Team Section */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{assignment.team.name}</p>
                    <p className="text-xs text-gray-500">{assignment.team.members.length} members</p>
                  </div>
                </div>
                <div className="flex items-center">
                  {/* Team Member Avatars */}
                  <div className="flex -space-x-2">
                    {assignment.team.members.slice(0, 4).map((member, index) => (
                      <div
                        key={index}
                        className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 border-2 border-white flex items-center justify-center text-white text-xs font-medium"
                        title={`${member.name} - ${member.role}`}
                      >
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </div>
                    ))}
                    {assignment.team.members.length > 4 && (
                      <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-gray-600 text-xs font-medium">
                        +{assignment.team.members.length - 4}
                      </div>
                    )}
                  </div>
                  <button className="ml-4 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg">
                    View Team
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
