'use client';
import { AlertTriangle } from 'lucide-react';

export default function MissedOpportunityPage() {
  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Missed Opportunity</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">Tenders not bid on, dropped, or lost — learn from what was missed.</p>
      </div>
      <div className="card p-8 text-center">
        <AlertTriangle className="w-12 h-12 mx-auto text-gray-300 mb-4" />
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Coming Soon</h2>
        <p className="text-sm text-gray-500 max-w-md mx-auto">Analysis of missed and dropped tenders with reason breakdowns and revenue impact estimates will be available here once the backend API is implemented.</p>
      </div>
    </div>
  );
}
