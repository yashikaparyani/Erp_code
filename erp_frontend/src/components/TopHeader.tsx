'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Bell, Search, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getRoleInitials } from '../context/RoleContext';

const projects = [
  'Indore Smart City Surveillance Phase II',
  'Bhopal Traffic Management System',
  'Gwalior Police Surveillance Network',
];

export default function TopHeader() {
  const { currentUser, logout } = useAuth();
  const router = useRouter();
  const [currentProject, setCurrentProject] = useState('Indore Smart City Surveillance Phase II');
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  if (!currentUser) return null;

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 shadow-sm">
      {/* Left section - Project */}
      <div className="flex items-center gap-2 lg:gap-6 min-w-0 flex-1">
        {/* Project Dropdown */}
        <div className="relative min-w-0 flex-shrink">
          <button
            onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
            className="flex items-center gap-2 px-2 lg:px-4 py-2 hover:bg-orange-50 rounded-full transition-colors min-w-0 border border-transparent"
          >
            <span className="text-sm text-gray-700 max-w-[140px] sm:max-w-[240px] lg:max-w-[360px] truncate">
              {currentProject}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
          </button>

          {projectDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              {projects.map(project => (
                <button
                  key={project}
                  onClick={() => { setCurrentProject(project); setProjectDropdownOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                    currentProject === project ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                  }`}
                >
                  {project}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2 lg:gap-4 flex-shrink-0">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            className="pl-10 pr-4 py-2 w-40 lg:w-64 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white"
          />
        </div>

        {/* Notifications */}
        <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0">
          <Bell className="w-5 h-5 text-gray-600" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User Menu */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 lg:gap-3 pl-2 lg:pl-4 border-l border-gray-200 hover:bg-gray-50 rounded-full px-2 py-1.5 transition-colors"
          >
            <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-semibold"
                 style={{ backgroundColor: 'var(--brand-orange)' }}>
              {getRoleInitials(currentUser.role)}
            </div>
            <div className="text-left min-w-0 hidden sm:block">
              <div className="text-sm font-medium text-gray-900 truncate max-w-[90px] lg:max-w-[130px]">
                {currentUser.name}
              </div>
              <div className="text-xs text-gray-500 truncate max-w-[90px] lg:max-w-[130px]">
                {currentUser.role}
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
          </button>

          {userMenuOpen && (
            <div className="absolute top-full right-0 mt-1 w-60 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              {/* User info header */}
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                       style={{ backgroundColor: 'var(--brand-orange)' }}>
                    {getRoleInitials(currentUser.role)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">{currentUser.name}</div>
                    <div className="text-xs text-gray-500 truncate">{currentUser.email}</div>
                  </div>
                </div>
                <div className="mt-2.5 px-2 py-0.5 bg-orange-50 rounded text-xs text-orange-700 font-medium inline-block">
                  {currentUser.role}
                </div>
              </div>

              {/* Profile placeholder */}
              <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                View Profile
              </button>

              {/* Logout */}
              <div className="border-t border-gray-100 mt-1 pt-1">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
