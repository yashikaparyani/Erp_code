'use client';

import { AlertCircle, Loader2, type LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

type FetchState<T> = {
	data: T;
	loading: boolean;
	error: string;
	lastUpdated: string;
	refresh: () => Promise<void>;
};

type ApiResponse<T> = {
	success?: boolean;
	data?: T;
	message?: string;
};

type StatTone = 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'amber' | 'cyan' | 'slate' | 'teal';
type ValueTone = 'default' | 'positive' | 'negative' | 'warning' | 'info';

const statToneClasses: Record<StatTone, string> = {
	blue: 'bg-blue-50 text-blue-700',
	green: 'bg-green-50 text-green-700',
	orange: 'bg-orange-50 text-orange-700',
	purple: 'bg-purple-50 text-purple-700',
	red: 'bg-red-50 text-red-700',
	amber: 'bg-amber-50 text-amber-700',
	cyan: 'bg-cyan-50 text-cyan-700',
	slate: 'bg-slate-100 text-slate-700',
	teal: 'bg-teal-50 text-teal-700',
};

const metricToneClasses: Record<ValueTone, string> = {
	default: 'text-gray-900',
	positive: 'text-green-700',
	negative: 'text-red-700',
	warning: 'text-amber-700',
	info: 'text-blue-700',
};

function buildTimestamp() {
	return new Date().toLocaleString('en-IN', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

export function useApiData<T>(url: string, initialData: T): FetchState<T> {
	const initialDataRef = useRef(initialData);
	const [data, setData] = useState<T>(initialData);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [lastUpdated, setLastUpdated] = useState('');

	const refresh = useCallback(async () => {
		setLoading(true);
		setError('');

		try {
			const response = await fetch(url, { cache: 'no-store' });
			const payload: ApiResponse<T> = await response.json().catch(() => ({}));
			if (!response.ok || payload.success === false) {
				throw new Error(payload.message || 'Failed to load data');
			}
			setData((payload.data ?? initialDataRef.current) as T);
			setLastUpdated(buildTimestamp());
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load data');
		} finally {
			setLoading(false);
		}
	}, [url]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	return { data, loading, error, lastUpdated, refresh };
}

export function DashboardShell({
	title,
	subtitle,
	loading,
	error,
	lastUpdated,
	onRetry,
	children,
}: {
	title: string;
	subtitle: string;
	loading: boolean;
	error: string;
	lastUpdated?: string;
	onRetry?: () => void;
	children: ReactNode;
}) {
	if (loading) {
		return (
			<div className="card">
				<div className="card-body py-16 flex items-center justify-center">
					<div className="flex items-center gap-3 text-gray-600">
						<Loader2 className="w-5 h-5 animate-spin" />
						<span className="text-sm">Loading live dashboard data...</span>
					</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="card">
				<div className="card-body py-12 text-center">
					<div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
						<AlertCircle className="h-6 w-6" />
					</div>
					<h1 className="text-xl font-semibold text-gray-900">{title}</h1>
					<p className="mt-2 text-sm text-red-600">{error}</p>
					{onRetry ? (
						<button
							onClick={onRetry}
							className="mt-4 rounded-lg bg-[#1e6b87] px-4 py-2 text-sm font-medium text-white hover:bg-[#185a73]"
						>
							Retry
						</button>
					) : null}
				</div>
			</div>
		);
	}

	return (
		<div>
			<div className="mb-6">
				<h1 className="text-2xl font-bold text-gray-900">{title}</h1>
				<p className="mt-1 text-sm text-gray-500">
					{subtitle}
					{lastUpdated ? ` • Last updated: ${lastUpdated}` : ''}
				</p>
			</div>
			{children}
		</div>
	);
}

export function StatCard({
	title,
	value,
	hint,
	icon: Icon,
	tone,
}: {
	title: string;
	value: string | number;
	hint: string;
	icon: LucideIcon;
	tone: StatTone;
}) {
	return (
		<div className="stat-card">
			<div className="flex items-center justify-between gap-3">
				<div>
					<div className="stat-label">{title}</div>
					<div className="stat-value mt-1">{value}</div>
				</div>
				<div className={`flex h-10 w-10 items-center justify-center rounded-lg ${statToneClasses[tone]}`}>
					<Icon className="h-5 w-5" />
				</div>
			</div>
			<div className="mt-2 text-xs text-gray-500">{hint}</div>
		</div>
	);
}

export function SectionCard({
	title,
	subtitle,
	children,
}: {
	title: string;
	subtitle?: string;
	children: ReactNode;
}) {
	return (
		<div className="card">
			<div className="card-header">
				<div>
					<h3 className="font-semibold text-gray-900">{title}</h3>
					{subtitle ? <p className="mt-1 text-xs text-gray-500">{subtitle}</p> : null}
				</div>
			</div>
			<div className="card-body">{children}</div>
		</div>
	);
}

export function MetricList({
	items,
	emptyMessage = 'No data available.',
}: {
	items: Array<{ label: string; value: ReactNode; tone?: ValueTone }>;
	emptyMessage?: string;
}) {
	if (!items.length) {
		return <EmptyState message={emptyMessage} />;
	}

	return (
		<div className="space-y-3">
			{items.map((item) => (
				<div key={item.label} className="flex items-center justify-between gap-4 rounded-lg bg-gray-50 px-3 py-2">
					<span className="text-sm text-gray-600">{item.label}</span>
					<span className={`text-sm font-semibold ${metricToneClasses[item.tone || 'default']}`}>{item.value}</span>
				</div>
			))}
		</div>
	);
}

export function EmptyState({ message }: { message: string }) {
	return <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">{message}</div>;
}

export function formatCurrency(value?: number) {
	const amount = Number(value || 0);
	return new Intl.NumberFormat('en-IN', {
		style: 'currency',
		currency: 'INR',
		maximumFractionDigits: 0,
	}).format(amount);
}

export function formatNumber(value?: number) {
	return new Intl.NumberFormat('en-IN', {
		maximumFractionDigits: 0,
	}).format(Number(value || 0));
}

export function formatPercent(value?: number) {
	return `${Number(value || 0).toFixed(2)}%`;
}

export function formatMinutes(value?: number) {
	const minutes = Number(value || 0);
	if (minutes >= 60) {
		const hours = Math.floor(minutes / 60);
		const remainder = Math.round(minutes % 60);
		return `${hours}h ${remainder}m`;
	}
	return `${Math.round(minutes)}m`;
}

export function formatDateTime(value?: string) {
	if (!value) return '-';
	return new Date(value).toLocaleString('en-IN', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}