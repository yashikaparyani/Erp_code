'use client';
import { useState } from 'react';
import { Plus, Search, Edit2, Trash2, ChevronsLeft, ChevronsRight, X, Eye, EyeOff } from 'lucide-react';

interface UserData {
  id: number;
  name: string;
  loginUserId: string;
  emailId: string;
  contactNo: string;
  department: string;
  designation: string;
}

const mockUsers: UserData[] = [
  { id: 1, name: 'Rahul Sharma', loginUserId: 'rahul.sharma', emailId: 'rahul.sharma@company.com', contactNo: '9876543210', department: 'Technical', designation: 'Manager' },
  { id: 2, name: 'Priya Singh', loginUserId: 'priya.singh', emailId: 'priya.singh@company.com', contactNo: '9876543211', department: 'Pre-Sales', designation: 'Associate' },
  { id: 3, name: 'Amit Kumar', loginUserId: 'amit.kumar', emailId: 'amit.kumar@company.com', contactNo: '9876543212', department: 'Finance', designation: 'Chief' },
  { id: 4, name: 'Neha Gupta', loginUserId: 'neha.gupta', emailId: 'neha.gupta@company.com', contactNo: '9876543213', department: 'Human Resource', designation: 'Director' },
  { id: 5, name: 'Vikash Patel', loginUserId: 'vikash.patel', emailId: 'vikash.patel@company.com', contactNo: '9876543214', department: 'Software', designation: 'Manager' },
];

export default function UserManagementPage() {
  const [data, setData] = useState<UserData[]>(mockUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    loginUserId: '',
    password: '',
    emailId: '',
    contactNo: '',
    department: '',
    designation: '',
  });

  const totalPages = Math.ceil(data.length / itemsPerPage) || 1;

  const filteredData = data.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.loginUserId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.emailId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = () => {
    if (formData.name.trim() && formData.loginUserId.trim()) {
      const newItem: UserData = {
        id: data.length + 1,
        ...formData,
      };
      setData(prev => [...prev, newItem]);
      setFormData({
        name: '',
        loginUserId: '',
        password: '',
        emailId: '',
        contactNo: '',
        department: '',
        designation: '',
      });
      setShowModal(false);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this user?')) {
      setData(prev => prev.filter(item => item.id !== id));
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
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No data found.
                  </td>
                </tr>
              ) : (
                filteredData.map((row, index) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 text-center">{index + 1}</td>
                    <td className="px-4 py-3 text-sm text-blue-600 text-center font-medium">{row.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-center">{row.loginUserId}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-center">{row.emailId}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-center">{row.contactNo}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-center">{row.department}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-center">{row.designation}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(row.id)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
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
                  value={formData.loginUserId}
                  onChange={(e) => setFormData(prev => ({ ...prev, loginUserId: e.target.value }))}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Email ID</label>
                <input
                  type="email"
                  value={formData.emailId}
                  onChange={(e) => setFormData(prev => ({ ...prev, emailId: e.target.value }))}
                  placeholder="Enter email address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact No</label>
                <input
                  type="tel"
                  value={formData.contactNo}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactNo: e.target.value }))}
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
                    <option value="Technical">Technical</option>
                    <option value="Finance">Finance</option>
                    <option value="Human Resource">Human Resource</option>
                    <option value="Pre-Sales">Pre-Sales</option>
                    <option value="Software">Software</option>
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
                    <option value="Associate">Associate</option>
                    <option value="Manager">Manager</option>
                    <option value="Chief">Chief</option>
                    <option value="Director">Director</option>
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
