'use client';
import { Users } from 'lucide-react';

export default function CompareBiddersPage() {
  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Compare Bidders</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">Side-by-side comparison of bidder pricing and qualifications.</p>
      </div>
      <div className="card p-8 text-center">
        <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Coming Soon</h2>
        <p className="text-sm text-gray-500 max-w-md mx-auto">Bidder comparison tool with head-to-head pricing analysis and qualification scoring will be available here once the backend API is implemented.</p>
      </div>
    </div>
  );
}
