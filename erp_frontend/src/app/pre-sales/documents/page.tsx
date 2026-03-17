'use client';

import { Briefcase, FolderOpen } from 'lucide-react';
import RouteHubPage from '@/components/navigation/RouteHubPage';

export default function PreSalesDocumentsHubPage() {
  return (
    <RouteHubPage
      title="Pre-Sales Documents"
      subtitle="Open document workspaces directly from this parent landing page."
      items={[
        { title: 'Document Brief Case', href: '/pre-sales/documents/briefcase', description: 'Quick access to document handoff and working sets.', icon: Briefcase },
        { title: 'Folders', href: '/pre-sales/documents/folders', description: 'Browse and manage the document folder structure.', icon: FolderOpen },
      ]}
    />
  );
}
