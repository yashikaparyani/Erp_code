'use client';

import Link from 'next/link';
import { ArrowRight, LucideIcon } from 'lucide-react';

type HubItem = {
  title: string;
  href: string;
  description: string;
  icon: LucideIcon;
};

export default function RouteHubPage({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: HubItem[];
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-3xl border border-orange-100 bg-white/90 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50 text-orange-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-base font-semibold text-gray-900">{item.title}</div>
                    <p className="mt-1 text-sm text-gray-500">{item.description}</p>
                  </div>
                </div>
                <ArrowRight className="mt-1 h-5 w-5 text-gray-300 transition-colors group-hover:text-orange-500" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
