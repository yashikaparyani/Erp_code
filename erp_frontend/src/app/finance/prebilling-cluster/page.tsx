'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, CheckSquare, FileText, PieChart, ReceiptText } from 'lucide-react';
import RegisterPage from '@/components/shells/RegisterPage';

type PreBillingTab = 'estimates' | 'proformas' | 'costing' | 'queue';

function ClusterLaunchCard({
  title,
  description,
  href,
  bullets,
}: {
  title: string;
  description: string;
  href: string;
  bullets: string[];
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
        <ul className="space-y-2 text-sm text-slate-600">
          {bullets.map((bullet) => (
            <li key={bullet} className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--brand-orange)]" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
        <Link href={href} className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-strong)]">
          Open Workspace
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

export default function PreBillingClusterPage() {
  const [activeTab, setActiveTab] = useState<PreBillingTab>('estimates');

  const tabs = [
    { key: 'estimates' as PreBillingTab, label: 'Estimates', icon: FileText },
    { key: 'proformas' as PreBillingTab, label: 'Proformas', icon: ReceiptText },
    { key: 'costing' as PreBillingTab, label: 'Costing', icon: PieChart },
    { key: 'queue' as PreBillingTab, label: 'Queue', icon: CheckSquare },
  ];

  return (
    <RegisterPage
      title="Pre-Billing Cluster"
      description="Consolidated estimates, proformas, costing, and approval queue"
      loading={false}
      empty={false}
    >
      {/* Tab buttons */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-200">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition ${
                activeTab === t.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'estimates' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <ClusterLaunchCard
            title="Estimate Workspace"
            description="Use the dedicated estimate register for create, send, approve, and conversion flows."
            href="/finance/estimates"
            bullets={[
              'Customer and project pickers are already wired there.',
              'Estimate actions use the dedicated estimate route layer.',
              'The standalone page is now the source of truth for estimate CRUD.',
            ]}
          />
          <ClusterLaunchCard
            title="What This Cluster Keeps"
            description="This cluster now acts as a clean launch surface instead of embedding a second estimate implementation."
            href="/finance/estimates"
            bullets={[
              'No duplicate OpsWorkspace register to maintain.',
              'No drift between cluster behavior and canonical estimate flows.',
              'Faster path for operators into the real finance workspace.',
            ]}
          />
        </div>
      )}

      {activeTab === 'proformas' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <ClusterLaunchCard
            title="Proforma Workspace"
            description="Open the dedicated proforma register for create, send, approve, and conversion flows."
            href="/finance/proformas"
            bullets={[
              'Estimate linking and project association already live there.',
              'The canonical proforma page uses dedicated proforma routes.',
              'This avoids keeping a second proforma register inside the cluster.',
            ]}
          />
          <ClusterLaunchCard
            title="Recommended Operator Path"
            description="Teams should manage proformas in the standalone workspace and return here only for navigation across the finance cluster."
            href="/finance/proformas"
            bullets={[
              'One source of truth for proforma CRUD.',
              'Cleaner role behavior than the embedded generic path.',
              'Less UX drift between billing and pre-billing surfaces.',
            ]}
          />
        </div>
      )}

      {activeTab === 'costing' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <ClusterLaunchCard
            title="Cost Sheet Workspace"
            description="Open the dedicated costing register for cost sheet creation, submission, approval, and rejection."
            href="/finance/costing"
            bullets={[
              'Project and tender linking already live there.',
              'Cost sheet lifecycle now belongs to the standalone costing page.',
              'Avoids duplicating approval logic inside the cluster.',
            ]}
          />
          <ClusterLaunchCard
            title="Approval Queue"
            description="Use the costing queue when the goal is release, hold, or reject decisions rather than cost-sheet editing."
            href="/finance/costing-queue"
            bullets={[
              'Queue actions belong to the dedicated queue workspace.',
              'Separates costing preparation from finance release decisions.',
              'Keeps this cluster page as navigation, not duplicated workflow code.',
            ]}
          />
        </div>
      )}

      {activeTab === 'queue' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <ClusterLaunchCard
            title="Costing Queue Workspace"
            description="Open the finance queue for release, hold, and rejection actions on queued costing items."
            href="/finance/costing-queue"
            bullets={[
              'Queue actions are already implemented on the standalone queue page.',
              'Role gating is tighter there than in the old embedded cluster flow.',
              'Operators get one clear path into finance approval work.',
            ]}
          />
          <ClusterLaunchCard
            title="Why The Queue Moved"
            description="This cluster no longer embeds a second queue implementation, which keeps queue behavior and permissions from drifting."
            href="/finance/costing-queue"
            bullets={[
              'No duplicate release or hold logic.',
              'No generic ops dependency inside the pre-billing cluster.',
              'Cleaner maintenance path as the finance workflow evolves.',
            ]}
          />
        </div>
      )}
    </RegisterPage>
  );
}
