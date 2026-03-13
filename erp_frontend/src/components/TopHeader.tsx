'use client';
import { useState } from 'react';
import { ChevronDown, Bell, Search, User } from 'lucide-react';
import { useRole, roles, getRoleInitials, Role } from '../context/RoleContext';

const projects = [
  'Indore Smart City Surveillance Phase II',
  'Bhopal Traffic Management System',
  'Gwalior Police Surveillance Network'
];

export default function TopHeader() {
  const { currentRole, setCurrentRole } = useRole();
  const [currentProject, setCurrentProject] = useState('Indore Smart City Surveillance Phase II');
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);

  const handleRoleChange = (role: Role) => {
    setCurrentRole(role);
    setRoleDropdownOpen(false);
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
      {/* Left section - Project & Role */}
      <div className="flex items-center gap-2 lg:gap-6 min-w-0 flex-1">
        {/* Current Role Dropdown */}
        <div className="relative flex-shrink-0">
          <button 
            onClick={() => {setRoleDropdownOpen(!roleDropdownOpen); setProjectDropdownOpen(false);}}
            className="flex items-center gap-2 px-2 lg:px-4 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors min-w-0"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-semibold">
              {getRoleInitials(currentRole)}
            </div>
            <div className="text-left min-w-0 max-w-[80px] lg:max-w-[120px] hidden sm:block">
              <div className="text-xs text-gray-500">Current Role</div>
              <div className="text-sm font-medium text-gray-900 truncate">{currentRole}</div>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
          </button>
          
          {roleDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              {roles.map(role => (
                <button
                  key={role}
                  onClick={() => handleRoleChange(role)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-3 ${
                    currentRole === role ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                    currentRole === role ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {getRoleInitials(role)}
                  </div>
                  {role}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Project Dropdown */}
        <div className="relative min-w-0 flex-shrink">
          <button 
            onClick={() => {setProjectDropdownOpen(!projectDropdownOpen); setRoleDropdownOpen(false);}}
            className="flex items-center gap-2 px-2 lg:px-4 py-2 hover:bg-slate-100 rounded-lg transition-colors min-w-0"
          >
            <span className="text-sm text-gray-700 max-w-[120px] sm:max-w-[180px] lg:max-w-[300px] truncate">{currentProject}</span>
            <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
          </button>
          
          {projectDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              {projects.map(project => (
                <button
                  key={project}
                  onClick={() => {setCurrentProject(project); setProjectDropdownOpen(false);}}
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

      {/* Right section - Search, Notifications, User */}
      <div className="flex items-center gap-2 lg:gap-4 flex-shrink-0">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="pl-10 pr-4 py-2 w-40 lg:w-64 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>
        
        {/* Notifications */}
        <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0">
          <Bell className="w-5 h-5 text-gray-600" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        
        {/* User Menu */}
        <div className="flex items-center gap-2 lg:gap-3 pl-2 lg:pl-4 border-l border-gray-200 flex-shrink-0">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex-shrink-0 flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="text-right min-w-0 hidden sm:block">
            <div className="text-sm font-medium text-gray-900 truncate max-w-[80px] lg:max-w-[100px]">Admin User</div>
            <div className="text-xs text-gray-500 truncate max-w-[80px] lg:max-w-[100px]">{currentRole}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
