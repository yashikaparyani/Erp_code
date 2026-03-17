'use client';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, ChevronsLeft, ChevronsRight, X, Eye, EyeOff, Loader2 } from 'lucide-react';

interface UserData {
  name: string;
  full_name: string;
  username: string;
  email: string;
  enabled: number;
  phone: string;
  mobile_no: string;
  department: string;
  designation: string;
  roles: string[];
}

interface DeptOption { name: string; department_name: string; }
interface DesigOption { name: string; designation_name: string; }

export default function UserManagementPage() {
  const [data, setData] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<DeptOption[]>([]);
  const [designations, setDesignations] = useState<DesigOption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '', username: '', password: '', email: '', contact_no: '', department: '', designation: '',
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/users-list');
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (e) { console.error('Failed to fetch users:', e); }
    finally { setLoading(false); }
  }, []);

  const fetchOptions = useCallback(async () => {
    try {
      const [dRes, desRes] = await Promise.all([fetch('/api/departments'), fetch('/api/designations')]);
      const [dJson, desJson] = await Promise.all([dRes.json(), desRes.json()]);
      if (dJson.success) setDepartments(dJson.data);
      if (desJson.success) setDesignations(desJson.data);
    } catch (e) { console.error('Failed to fetch options:', e); }
  }, []);

  useEffect(() => { fetchData(); fetchOptions(); }, [fetchData, fetchOptions]);

  const filteredData = data.filter(item =>
    item.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;

  const handleCreate = async () => {
    if (formData.name.trim() && formData.email.trim()) {
      try {
        const res = await fetch('/api/users-list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            first_name: formData.name,
            email: formData.email,
            username: formData.username,
            password: formData.password,
            contact_no: formData.contact_no,
          }),
        });
        const json = await res.json();
        if (json.success) {
          setFormData({ name: '', username: '', password: '', email: '', contact_no: '', department: '', designation: '' });
          setShowModal(false);
          fetchData();
        }
      } catch (e) { console.error('Failed to create user:', e); }
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">User Management</h1>
        <p className="text-gray-500 text-xs sm:text-sm mt-1">Manage system users and their access</p>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div></div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-[#1e6b87] text-white rounded-lg hover:bg-[#185a73] transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Create User
          </button>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-48"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#1e6b87] text-white">
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider w-16">#</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Login User ID</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Email ID</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Contact No</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Department</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Designation</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider w-28">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No data found.
                  </td>
                </tr>
              ) : (
                filteredData.map((row, index) => (
                  <tr key={row.name} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 text-center">{index + 1}</td>
                    <td className="px-4 py-3 text-sm text-blue-600 text-center font-medium">{row.full_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-center">{row.username}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-center">{row.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-center">{row.mobile_no || row.phone}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-center">{row.department}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-center">{row.designation}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Show</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>Page {currentPage} of {totalPages}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed">
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="px-2 py-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed text-sm">
              Prev
            </button>
            <span className="px-3 py-1 bg-[#1e6b87] text-white rounded text-sm font-medium">{currentPage}</span>
            <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="px-2 py-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed text-sm">
              Next
            </button>
            <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed">
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold text-gray-800">Create User</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter full name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Login User ID <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Enter login user ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter password"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email ID <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact No</label>
                <input
                  type="tel"
                  value={formData.contact_no}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact_no: e.target.value }))}
                  placeholder="Enter contact number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Department</option>
                    {departments.map(d => (
                      <option key={d.name} value={d.department_name}>{d.department_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                  <select
                    value={formData.designation}
                    onChange={(e) => setFormData(prev => ({ ...prev, designation: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Designation</option>
                    {designations.map(d => (
                      <option key={d.name} value={d.designation_name}>{d.designation_name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-gray-200 sticky bottom-0 bg-white">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm font-medium">Cancel</button>
              <button onClick={handleCreate} className="px-4 py-2 bg-[#1e6b87] text-white rounded-lg hover:bg-[#185a73] text-sm font-medium">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
