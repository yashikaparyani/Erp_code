'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  Briefcase,
  Loader2,
  MapPinned,
  RefreshCcw,
  ShieldCheck,
  Users,
} from 'lucide-react';

type Filters = {
  attendanceDate: string;
  project: string;
  projects: Array<{ name: string; label: string }>;
};

type Summary = {
  projects: number;
  sites: number;
  active_assignments: number;
  attendance_marked: number;
  present_today: number;
  active_deployments: number;
  expiring_documents: number;
  compliance_attention: number;
};

type ProjectStaffingRow = {
  project: string;
  project_id: string;
  stage: string;
  sites: number;
  active_assignments: number;
  attendance_marked: number;
  present_today: number;
  travel_expense: number;
  technician_visits: number;
  expiring_documents: number;
  document_count: number;
  progress_pct: number;
};

type SiteAttendanceRow = {
  site: string;
  site_code: string;
  project: string;
  status: string;
  present_count: number;
  absent_count: number;
  total_attendance: number;
  active_technicians: number;
  documents: number;
};

type TechnicianDeploymentRow = {
  employee?: string;
  visit_date?: string;
  visit_status?: string;
  linked_project?: string;
  linked_site?: string;
  customer_location?: string;
};

type TravelLinkRow = {
  employee?: string;
  travel_date?: string;
  travel_status?: string;
  from_location?: string;
  to_location?: string;
  linked_project?: string;
  linked_site?: string;
  expense_amount?: number;
};

type GovernanceRow = {
  project: string;
  project_id: string;
  total_documents: number;
  expiring_documents: number;
  site_coverage: number;
  categories: number;
};

type ExpiringDocumentRow = {
  name: string;
  document_name?: string;
  linked_project?: string;
  linked_site?: string;
  category?: string;
  expiry_date?: string;
  days_until_expiry?: number;
};

type ComplianceSummary = {
  total_records: number;
  pending: number;
  hold: number;
  paid: number;
  employee_contribution: number;
  employer_contribution: number;
};

type ComplianceRow = {
  ledger_type: string;
  total: number;
  pending: number;
  hold: number;
  paid: number;
  employee_contribution: number;
  employer_contribution: number;
};

type OperationsData = {
  filters: Filters;
  summary: Summary;
  project_staffing: ProjectStaffingRow[];
  site_attendance: SiteAttendanceRow[];
  technician_deployments: TechnicianDeploymentRow[];
  travel_links: TravelLinkRow[];
  document_governance: GovernanceRow[];
  expiring_documents: ExpiringDocumentRow[];
  compliance: {
    summary: ComplianceSummary;
    rows: ComplianceRow[];
  };
};

function formatCurrency(value?: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function SummaryCard({ label, value, hint, icon: Icon }: { label: string; value: string | number; hint: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</div>
          <div className="mt-2 text-2xl font-semibold text-slate-950">{value}</div>
          <div className="mt-1 text-xs text-slate-500">{hint}</div>
        </div>
        <div className="rounded-xl bg-slate-100 p-2 text-slate-700"><Icon className="h-5 w-5" /></div>
      </div>
    </div>
  );
}

export default function HrOperationsPage() {
  const [project, setProject] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<OperationsData>({
    filters: { attendanceDate, project: 'all', projects: [] },
    summary: { projects: 0, sites: 0, active_assignments: 0, attendance_marked: 0, present_today: 0, active_deployments: 0, expiring_documents: 0, compliance_attention: 0 },
    project_staffing: [],
    site_attendance: [],
    technician_deployments: [],
    travel_links: [],
    document_governance: [],
    expiring_documents: [],
    compliance: { summary: { total_records: 0, pending: 0, hold: 0, paid: 0, employee_contribution: 0, employer_contribution: 0 }, rows: [] },
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (project) params.set('project', project);
      if (attendanceDate) params.set('attendanceDate', attendanceDate);
      const res = await fetch(`/api/hr/operations?${params.toString()}`, { cache: 'no-store' });
      const payload = await res.json();
      if (!res.ok || payload.success === false) throw new Error(payload.message || 'Failed to load HR operations');
      setData(payload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load HR operations');
    } finally {
      setLoading(false);
    }
  }, [attendanceDate, project]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#f6fbff_0%,#fdfbf3_48%,#f4fbf7_100%)] p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">Phase 6 <span className="h-1 w-1 rounded-full bg-sky-600" /> Original ERP Strengthening</div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">HR Operations Cockpit</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">Project staffing, site-linked attendance, technician deployment, project-aware travel, DMS governance, and compliance visibility in one operational surface.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/hr" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">HR Dashboard</Link>
            <button onClick={() => void loadData()} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-700"><RefreshCcw className="h-4 w-4" /> Refresh</button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <select value={project} onChange={(event) => setProject(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200">
            <option value="">All Projects</option>
            {data.filters.projects.map((option) => <option key={option.name} value={option.name}>{option.label}</option>)}
          </select>
          <input type="date" value={attendanceDate} onChange={(event) => setAttendanceDate(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200" />
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">Attendance date drives the site manpower and deployment view.</div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-24 text-sm text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading HR operations...</div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-700">{error}</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Projects" value={data.summary.projects} hint="Operational projects in scope" icon={Briefcase} />
            <SummaryCard label="Sites" value={data.summary.sites} hint="Linked sites tracked in cockpit" icon={MapPinned} />
            <SummaryCard label="Staffing" value={data.summary.active_assignments} hint={`${data.summary.present_today} present or on duty on selected date`} icon={Users} />
            <SummaryCard label="Compliance Attention" value={data.summary.compliance_attention} hint={`${data.summary.expiring_documents} documents expiring`} icon={ShieldCheck} />
          </div>

          <SectionCard title="Project Staffing View" subtitle="Staffing, site attendance, travel cost, technician movement, and document coverage by project.">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-slate-400">
                  <tr>
                    <th className="px-3 py-3 font-medium">Project</th>
                    <th className="px-3 py-3 font-medium">Stage</th>
                    <th className="px-3 py-3 font-medium">Sites</th>
                    <th className="px-3 py-3 font-medium">Assignments</th>
                    <th className="px-3 py-3 font-medium">Present</th>
                    <th className="px-3 py-3 font-medium">Travel</th>
                    <th className="px-3 py-3 font-medium">Docs</th>
                    <th className="px-3 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.project_staffing.map((row) => (
                    <tr key={row.project_id}>
                      <td className="px-3 py-3"><div className="font-medium text-slate-900">{row.project}</div><div className="text-xs text-slate-500">{row.project_id}</div></td>
                      <td className="px-3 py-3 text-slate-600">{row.stage.replaceAll('_', ' ')}</td>
                      <td className="px-3 py-3 text-slate-600">{row.sites}</td>
                      <td className="px-3 py-3 text-slate-600">{row.active_assignments}</td>
                      <td className="px-3 py-3 text-slate-600">{row.present_today} / {row.attendance_marked}</td>
                      <td className="px-3 py-3 text-slate-600">{formatCurrency(row.travel_expense)}</td>
                      <td className="px-3 py-3 text-slate-600">{row.document_count} total / {row.expiring_documents} expiring</td>
                      <td className="px-3 py-3"><Link href={`/hr/projects/${encodeURIComponent(row.project_id)}`} className="text-sm font-medium text-sky-700 hover:text-sky-800">Project workspace</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <div className="grid gap-6 xl:grid-cols-2">
            <SectionCard title="Site-Linked Attendance Analysis" subtitle="Attendance, technician activity, and document footprint by site.">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-200 text-slate-400">
                    <tr>
                      <th className="px-3 py-3 font-medium">Site</th>
                      <th className="px-3 py-3 font-medium">Project</th>
                      <th className="px-3 py-3 font-medium">Present</th>
                      <th className="px-3 py-3 font-medium">Absent</th>
                      <th className="px-3 py-3 font-medium">Techs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.site_attendance.slice(0, 12).map((row) => (
                      <tr key={row.site_code}>
                        <td className="px-3 py-3"><div className="font-medium text-slate-900">{row.site}</div><div className="text-xs text-slate-500">{row.site_code}</div></td>
                        <td className="px-3 py-3 text-slate-600">{row.project}</td>
                        <td className="px-3 py-3 text-slate-600">{row.present_count}</td>
                        <td className="px-3 py-3 text-slate-600">{row.absent_count}</td>
                        <td className="px-3 py-3 text-slate-600">{row.active_technicians}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <SectionCard title="Technician Deployment Visibility" subtitle="Recent field movement with project and site context preserved.">
              <div className="space-y-3">
                {data.technician_deployments.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">No technician deployments in the current scope.</div>
                ) : data.technician_deployments.map((row, index) => (
                  <div key={`${row.employee || 'visit'}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-slate-900">{row.employee || '-'}</div>
                        <div className="mt-1 text-xs text-slate-500">{row.linked_project || '-'} / {row.linked_site || row.customer_location || '-'}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-slate-700">{row.visit_status || '-'}</div>
                        <div className="mt-1 text-xs text-slate-500">{formatDate(row.visit_date)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          <div className="grid gap-6">
            <SectionCard title="Travel Linked To Project And Site" subtitle="Travel remains operational, not just reimbursement-only.">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-200 text-slate-400">
                    <tr>
                      <th className="px-3 py-3 font-medium">Employee</th>
                      <th className="px-3 py-3 font-medium">Date</th>
                      <th className="px-3 py-3 font-medium">Route</th>
                      <th className="px-3 py-3 font-medium">Project / Site</th>
                      <th className="px-3 py-3 font-medium">Expense</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.travel_links.map((row, index) => (
                      <tr key={`${row.employee || 'travel'}-${index}`}>
                        <td className="px-3 py-3 text-slate-700">{row.employee || '-'}</td>
                        <td className="px-3 py-3 text-slate-600">{formatDate(row.travel_date)}</td>
                        <td className="px-3 py-3 text-slate-600">{row.from_location || '-'} to {row.to_location || '-'}</td>
                        <td className="px-3 py-3 text-slate-600">{row.linked_project || '-'} / {row.linked_site || '-'}</td>
                        <td className="px-3 py-3 text-slate-600">{formatCurrency(row.expense_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4"><Link href="/hr/travel-logs" className="text-sm font-medium text-sky-700 hover:text-sky-800">Open travel workspace</Link></div>
            </SectionCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <SectionCard title="HR Document Governance Through DMS" subtitle="Project documents, site coverage, and expiry risk surfaced as an HR operational concern.">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-200 text-slate-400">
                    <tr>
                      <th className="px-3 py-3 font-medium">Project</th>
                      <th className="px-3 py-3 font-medium">Documents</th>
                      <th className="px-3 py-3 font-medium">Expiring</th>
                      <th className="px-3 py-3 font-medium">Sites Covered</th>
                      <th className="px-3 py-3 font-medium">Categories</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.document_governance.map((row) => (
                      <tr key={row.project_id}>
                        <td className="px-3 py-3"><div className="font-medium text-slate-900">{row.project}</div><div className="text-xs text-slate-500">{row.project_id}</div></td>
                        <td className="px-3 py-3 text-slate-600">{row.total_documents}</td>
                        <td className="px-3 py-3 text-slate-600">{row.expiring_documents}</td>
                        <td className="px-3 py-3 text-slate-600">{row.site_coverage}</td>
                        <td className="px-3 py-3 text-slate-600">{row.categories}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 space-y-2">
                {data.expiring_documents.map((row) => (
                  <div key={row.name} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                    <div>
                      <div className="font-medium text-slate-900">{row.document_name || row.name}</div>
                      <div className="mt-1 text-xs text-slate-500">{row.linked_project || '-'} / {row.linked_site || '-'} / {row.category || '-'}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-amber-700">{row.days_until_expiry ?? '-'} days</div>
                      <div className="mt-1 text-xs text-slate-500">{formatDate(row.expiry_date)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Compliance Dashboard Tied To Operations" subtitle="Statutory exposure and document expiry appear alongside project execution signals.">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4"><div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Pending</div><div className="mt-2 text-2xl font-semibold text-slate-950">{data.compliance.summary.pending}</div></div>
                <div className="rounded-xl bg-slate-50 p-4"><div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Hold</div><div className="mt-2 text-2xl font-semibold text-slate-950">{data.compliance.summary.hold}</div></div>
                <div className="rounded-xl bg-slate-50 p-4"><div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Employee Contribution</div><div className="mt-2 text-lg font-semibold text-slate-950">{formatCurrency(data.compliance.summary.employee_contribution)}</div></div>
                <div className="rounded-xl bg-slate-50 p-4"><div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Employer Contribution</div><div className="mt-2 text-lg font-semibold text-slate-950">{formatCurrency(data.compliance.summary.employer_contribution)}</div></div>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-200 text-slate-400">
                    <tr>
                      <th className="px-3 py-3 font-medium">Ledger</th>
                      <th className="px-3 py-3 font-medium">Total</th>
                      <th className="px-3 py-3 font-medium">Pending</th>
                      <th className="px-3 py-3 font-medium">Hold</th>
                      <th className="px-3 py-3 font-medium">Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.compliance.rows.map((row) => (
                      <tr key={row.ledger_type}>
                        <td className="px-3 py-3 font-medium text-slate-900">{row.ledger_type}</td>
                        <td className="px-3 py-3 text-slate-600">{row.total}</td>
                        <td className="px-3 py-3 text-slate-600">{row.pending}</td>
                        <td className="px-3 py-3 text-slate-600">{row.hold}</td>
                        <td className="px-3 py-3 text-slate-600">{row.paid}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}
