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
	blue: 'bg-[#edf4ff] text-[#5b78ba]',
	green: 'bg-[#eefcf3] text-[#4b8b67]',
	orange: 'bg-[var(--accent-soft)] text-[var(--accent-strong)]',
	purple: 'bg-[#f2efff] text-[#7067c8]',
	red: 'bg-[#fff1f7] text-[#bc6e95]',
	amber: 'bg-[#fff9e7] text-[#b5943e]',
	cyan: 'bg-[#eef7ff] text-[#648fb7]',
	slate: 'bg-[#f4f6fb] text-[#6e7792]',
	teal: 'bg-[#eefbf8] text-[#4f8e84]',
};

const metricToneClasses: Record<ValueTone, string> = {
	default: 'text-[var(--text-main)]',
	positive: 'text-[#4b8b67]',
	negative: 'text-[#bc6e95]',
	warning: 'text-[#b5943e]',
	info: 'text-[#5b78ba]',
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
				<div className="card-body flex items-center justify-center py-16">
					<div className="flex items-center gap-3 text-[var(--text-muted)]">
						<Loader2 className="h-5 w-5 animate-spin" />
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
					<div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--error-bg)] text-[var(--error-border)]">
						<AlertCircle className="h-6 w-6" />
					</div>
					<h1 className="text-xl font-semibold text-[var(--text-main)]">{title}</h1>
					<p className="mt-2 text-sm text-[var(--error-text)]">{error}</p>
					{onRetry ? <button onClick={onRetry} className="btn btn-primary mt-4">Retry</button> : null}
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="workspace-hero">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
					<div className="max-w-3xl">
						<div className="workspace-kicker">Operational Workspace</div>
						<h1 className="mt-2 text-[clamp(1.7rem,2.4vw,2.5rem)] font-semibold tracking-[-0.03em] text-[var(--text-main)]">{title}</h1>
						<p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{subtitle}</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<div className="workspace-chip">Live role-scoped data</div>
						{lastUpdated ? <div className="workspace-chip">Updated {lastUpdated}</div> : null}
					</div>
				</div>
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
				<div className={`flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] ${statToneClasses[tone]}`}>
					<Icon className="h-5 w-5" />
				</div>
			</div>
			<div className="mt-3 text-xs leading-5 text-[var(--text-muted)]">{hint}</div>
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
					<div className="workspace-kicker mb-1">Section</div>
					<h3 className="font-semibold text-[var(--text-main)]">{title}</h3>
					{subtitle ? <p className="mt-1 text-xs text-[var(--text-muted)]">{subtitle}</p> : null}
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
				<div key={item.label} className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-3">
					<span className="text-sm text-[var(--text-muted)]">{item.label}</span>
					<span className={`text-sm font-semibold ${metricToneClasses[item.tone || 'default']}`}>{item.value}</span>
				</div>
			))}
		</div>
	);
}

export function EmptyState({ message }: { message: string }) {
	return <div className="rounded-[22px] border border-dashed border-[var(--border-strong)] bg-[var(--surface-raised)] px-4 py-8 text-center text-sm text-[var(--text-muted)]">{message}</div>;
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
