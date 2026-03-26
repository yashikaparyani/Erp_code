'use client';

import Link from 'next/link';
import { ArrowUpRight, Boxes, ClipboardList, FileText, MapPinned, Send, Wallet } from 'lucide-react';
import { DashboardShell, MetricList, SectionCard, StatCard } from './shared';

const quickLinks = [
  { label: 'Submit Survey', href: '/survey', helper: 'Push fresh survey truth to Engineering.' },
  { label: 'Project Inventory / GRN', href: '/project-manager/inventory', helper: 'Maintain project-side receiving and consumption without opening HQ inventory.' },
  { label: 'Project Petty Cash', href: '/project-manager/petty-cash', helper: 'Keep petty cash entries tied to assigned projects only.' },
  { label: 'DPR / Progress', href: '/project-manager/dpr', helper: 'Submit project progress upward without opening shared execution command pages.' },
];

export default function ProjectManagerDashboard() {
  return (
    <DashboardShell
      title="Project Manager Coordination Dashboard"
      subtitle="Client-side project cockpit for survey submission, project-side receiving, inventory follow-through, DPR reporting, and escalation to Project Head."
      loading={false}
      error=""
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard title="Survey to Engineering" value="Submit" hint="Capture site truth and send it upstream for BOQ / design action." icon={MapPinned} tone="blue" />
        <StatCard title="Project GRN Updates" value="Track" hint="Confirm delivery, receipt, and on-ground receiving status for your project." icon={Boxes} tone="green" />
        <StatCard title="Material Consumption" value="Maintain" hint="Keep project-side inventory movement and consumption evidence current." icon={ClipboardList} tone="orange" />
        <StatCard title="DPR to Project Head" value="Report" hint="Send progress, blockers, and execution reality upward." icon={FileText} tone="purple" />
        <StatCard title="Requests to PH" value="Escalate" hint="Use formal requests for timeline, staffing, petty cash exception, hold, or escalation." icon={Send} tone="red" />
        <StatCard title="Petty Cash" value="Track" hint="Maintain project-only petty cash and push exceptions upward to Project Head." icon={Wallet} tone="amber" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <SectionCard title="What PM Owns" subtitle="The Project Manager is a coordinator, not the central back-office owner">
          <MetricList
            items={[
              { label: 'Survey submission for Engineering', value: 'Owned', tone: 'positive' },
              { label: 'Project-side GRN / receipt update', value: 'Owned', tone: 'positive' },
              { label: 'Material issuance / consumption follow-through', value: 'Owned', tone: 'positive' },
              { label: 'DPR / project progress reporting', value: 'Owned', tone: 'positive' },
              { label: 'Escalation and approval requests to PH', value: 'Owned', tone: 'positive' },
            ]}
          />
        </SectionCard>

        <SectionCard title="What Stays Central" subtitle="These remain specialist team workflows outside PM command">
          <MetricList
            items={[
              { label: 'BOQ preparation and engineering working docs', value: 'Central Team', tone: 'info' },
              { label: 'Vendor comparison / PO / commercial procurement', value: 'Central Team', tone: 'info' },
              { label: 'HQ bookkeeping and finance approvals', value: 'Central Team', tone: 'info' },
              { label: 'Department manpower administration', value: 'Central Team', tone: 'info' },
            ]}
          />
        </SectionCard>

        <SectionCard title="What PH Governs" subtitle="Project Head remains the approval and exception layer above PMs">
          <MetricList
            items={[
              { label: 'Deadline setting and change approval', value: 'PH', tone: 'warning' },
              { label: 'Timeline extension requests', value: 'PH', tone: 'warning' },
              { label: 'Staffing escalation / exception review', value: 'PH', tone: 'warning' },
              { label: 'Major blocker and hold decisions', value: 'PH', tone: 'warning' },
            ]}
          />
        </SectionCard>
      </div>

      <div className="mt-6 card">
        <div className="card-header">
          <div>
            <div className="workspace-kicker mb-1">Quick Actions</div>
            <h3 className="font-semibold text-[var(--text-main)]">Open The Right Project-Side Surface</h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">These are the only direct work lanes the PM should need day to day.</p>
          </div>
        </div>
        <div className="card-body grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-4 transition hover:-translate-y-0.5 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[var(--text-main)]">{link.label}</div>
                  <div className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{link.helper}</div>
                </div>
                <ArrowUpRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--text-muted)] transition group-hover:text-[var(--accent)]" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
