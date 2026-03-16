'use client';

import { Briefcase } from 'lucide-react';
import OpsWorkspace from '../../../components/ops/OpsWorkspace';

export default function HrOnboardingPage() {
  return (
    <OpsWorkspace
      title="Onboarding Workflow"
      subtitle="Create and move onboarding records through submit, review, approval, rejection, and employee mapping."
      listMethod="get_onboardings"
      statsMethod="get_onboarding_stats"
      createMethod="create_onboarding"
      createLabel="Create Onboarding"
      createFields={[
        { name: 'employee_name', label: 'Employee Name', placeholder: 'Full name' },
        { name: 'company', label: 'Company', placeholder: 'Technosys' },
        { name: 'designation', label: 'Designation', placeholder: 'Engineer' },
        { name: 'date_of_joining', label: 'Date of Joining', type: 'date' },
      ]}
      actions={[
        { label: 'Submit', tone: 'primary', buildRequest: (row) => ({ method: 'submit_onboarding', args: { name: row.name } }) },
        { label: 'Review', tone: 'warning', buildRequest: (row) => ({ method: 'review_onboarding', args: { name: row.name } }) },
        { label: 'Approve', tone: 'success', buildRequest: (row) => ({ method: 'approve_onboarding', args: { name: row.name } }) },
        { label: 'Reject', tone: 'danger', buildRequest: (row) => ({ method: 'reject_onboarding', args: { name: row.name } }), prompt: { message: 'Reject reason', field: 'reason' } },
        { label: 'Map Employee', tone: 'success', buildRequest: (row) => ({ method: 'map_onboarding_to_employee', args: { name: row.name } }) },
      ]}
      statsCards={[
        { label: 'Onboardings', path: 'total', hint: 'Total onboarding records', icon: Briefcase, tone: 'blue' },
        { label: 'Approved', path: 'approved', hint: 'Approved onboardings', icon: Briefcase, tone: 'green' },
      ]}
      columns={[
        { key: 'name', label: 'ID', render: (row) => row.name || '-' },
        { key: 'employee_name', label: 'Employee', render: (row) => row.employee_name || '-' },
        { key: 'designation', label: 'Designation', render: (row) => row.designation || '-' },
        { key: 'onboarding_status', label: 'Status', render: (row) => row.onboarding_status || row.status || '-' },
      ]}
      emptyMessage="No onboarding records found"
    />
  );
}
