'use client';
import { Upload, FolderOpen, MapPin, Settings, ShoppingCart, Wrench, HeadphonesIcon, IndianRupee, FileText, Eye, Shield, GitBranch, History } from 'lucide-react';

const projectFolders = [
  { name: 'Survey', files: 356, icon: MapPin, color: 'text-blue-600', bg: 'bg-blue-100' },
  { name: 'Engineering', files: 428, icon: Settings, color: 'text-purple-600', bg: 'bg-purple-100' },
  { name: 'Procurement', files: 612, icon: ShoppingCart, color: 'text-green-600', bg: 'bg-green-100' },
  { name: 'Execution', files: 892, icon: Wrench, color: 'text-orange-600', bg: 'bg-orange-100' },
  { name: 'O&M', files: 245, icon: HeadphonesIcon, color: 'text-red-600', bg: 'bg-red-100' },
  { name: 'Finance', files: 156, icon: IndianRupee, color: 'text-cyan-600', bg: 'bg-cyan-100' },
];

const recentDocuments = [
  {
    name: 'Site_Survey_Rajwada_v2.pdf',
    icon: FileText,
    category: 'Survey',
    uploadedBy: 'Amit Patel',
    date: 'Feb 12, 2026',
    size: '2.4 MB',
    version: 'v2.0',
  },
  {
    name: 'BOM_Treasure_Island_v1.1.xlsx',
    icon: FileText,
    category: 'Engineering',
    uploadedBy: 'Dr. Anjali Patel',
    date: 'Feb 12, 2026',
    size: '384 KB',
    version: 'v1.1',
  },
  {
    name: 'PO_2026_145_Hikvision.pdf',
    icon: FileText,
    category: 'Procurement',
    uploadedBy: 'Priya Sharma',
    date: 'Feb 11, 2026',
    size: '856 KB',
    version: 'v1.0',
  },
  {
    name: 'Invoice_INV_2026_042.pdf',
    icon: FileText,
    category: 'Finance',
    uploadedBy: 'Suresh Kumar',
    date: 'Feb 10, 2026',
    size: '512 KB',
    version: 'v1.0',
  },
];

const accessFeatures = [
  {
    icon: Shield,
    title: 'Role-Based Access',
    description: 'Documents are accessible based on user role and permissions',
  },
  {
    icon: GitBranch,
    title: 'Version Control',
    description: 'Automatic versioning with complete change history',
  },
  {
    icon: History,
    title: 'Audit Trail',
    description: 'Track all document access and modifications',
  },
];

export default function DocumentsPage() {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Document Management</h1>
          <p className="text-sm text-gray-500 mt-1">Centralized document repository with version control</p>
        </div>
        <button className="btn btn-primary">
          <Upload className="w-4 h-4" />
          Upload Document
        </button>
      </div>

      {/* Project Folders */}
      <div className="card mb-6">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900">Project Folders</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {projectFolders.map((folder, idx) => {
              const Icon = folder.icon;
              return (
                <div key={idx} className="flex flex-col items-center p-4 border border-gray-100 rounded-lg hover:border-blue-200 hover:bg-blue-50 transition-colors cursor-pointer">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${folder.bg} mb-3`}>
                    <Icon className={`w-6 h-6 ${folder.color}`} />
                  </div>
                  <div className="font-medium text-gray-900 text-center">{folder.name}</div>
                  <div className="text-xs text-gray-500">{folder.files} files</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Documents */}
      <div className="card mb-6">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900">Recent Documents</h3>
        </div>
        <div className="card-body">
          <div className="space-y-3">
            {recentDocuments.map((doc, idx) => {
              const Icon = doc.icon;
              return (
                <div key={idx} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-200">
                    <Icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{doc.name}</div>
                    <div className="text-xs text-gray-500">
                      <span className="text-blue-600">{doc.category}</span> • {doc.uploadedBy} • {doc.date}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">{doc.size}</div>
                    <div className="text-xs text-gray-400">{doc.version}</div>
                  </div>
                  <button className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Document Access Control */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900">Document Access Control</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {accessFeatures.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div key={idx} className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{feature.title}</div>
                    <div className="text-sm text-gray-500">{feature.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}