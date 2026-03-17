'use client';

import { BarChart3, Building2, FileBarChart2, LineChart, SearchCheck, Trophy } from 'lucide-react';
import RouteHubPage from '@/components/navigation/RouteHubPage';

export default function PreSalesAnalyticsHubPage() {
  return (
    <RouteHubPage
      title="Pre-Sales Analytics"
      subtitle="Open the analytics workspace you need without hitting a dead parent route."
      items={[
        { title: 'Company Profile', href: '/pre-sales/analytics/company-profile', description: 'Business profile and market snapshot from ERP activity.', icon: Building2 },
        { title: 'Competitors', href: '/pre-sales/analytics/competitors', description: 'Review competitor participation and trends.', icon: SearchCheck },
        { title: 'Tender Results', href: '/pre-sales/analytics/tender-results', description: 'Track wins, losses, and result timelines.', icon: Trophy },
        { title: 'MIS Reports', href: '/pre-sales/analytics/mis-reports', description: 'Open consolidated management reports.', icon: FileBarChart2 },
        { title: 'Compare Bidders', href: '/pre-sales/analytics/compare-bidders', description: 'Benchmark bidder positioning across tenders.', icon: BarChart3 },
        { title: 'Missed Opportunity', href: '/pre-sales/analytics/missed-opportunity', description: 'Review dropped or missed business opportunities.', icon: LineChart },
      ]}
    />
  );
}
