'use client';

import { Mail, ShieldCheck, User2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function ProfilePage() {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return (
      <div className="rounded-3xl border border-orange-100 bg-white p-8 text-sm text-gray-500">
        No active user session found.
      </div>
    );
  }

  const roles = currentUser.roles?.length ? currentUser.roles.join(', ') : currentUser.role;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="mt-1 text-sm text-gray-500">Your current ERP access and account summary.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
            <User2 className="h-5 w-5" />
          </div>
          <div className="mt-4 text-sm text-gray-500">Name</div>
          <div className="text-lg font-semibold text-gray-900">{currentUser.name}</div>
        </div>
        <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
            <Mail className="h-5 w-5" />
          </div>
          <div className="mt-4 text-sm text-gray-500">Email</div>
          <div className="text-lg font-semibold text-gray-900 break-all">{currentUser.email}</div>
        </div>
        <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="mt-4 text-sm text-gray-500">Role Access</div>
          <div className="text-lg font-semibold text-gray-900">{roles}</div>
        </div>
      </div>
    </div>
  );
}
