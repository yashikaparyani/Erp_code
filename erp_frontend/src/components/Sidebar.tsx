'use client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  MapPin,
  Settings,
  ShoppingCart,
  Package,
  Wrench,
  HeadphonesIcon,
  DollarSign,
  BarChart3,
  FolderOpen,
  Database,
  ChevronRight,
  ChevronDown,
  CreditCard,
  PieChart,
  CheckSquare,
  Cog,
  Users2,
  RefreshCcw,
  AlertTriangle,
  GitBranch,
  FolderTree,
  Cpu,
  ClipboardList,
  Briefcase,
  CalendarCheck2,
  Plane,
  Clock,
  Flag,
  ShieldCheck,
  Layers3,
  Lock,
  Shield,
  Eye,
  ScrollText,
  BookOpen,
  ListChecks,
  Banknote,
  CheckCircle2,
  Camera,
  Send,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRole, type Role, PROJECT_SIDE_ROLES } from '../context/RoleContext';

interface SubMenuItem {
  name: string;
  href: string;
  icon?: LucideIcon;
  children?: SubMenuItem[];
}

interface NavLink {
  name: string;
  href: string;
  icon: LucideIcon;
  children?: SubMenuItem[];
}

const SIDEBAR_EXPANDED_STORAGE_KEY = 'erp.sidebar.expanded.v1';
const SIDEBAR_SCROLL_STORAGE_KEY = 'erp.sidebar.scroll.v1';

const matchesPath = (pathname: string, href: string) => pathname === href || pathname.startsWith(href + '/');

const isItemActive = (pathname: string, item: SubMenuItem) => {
  if (matchesPath(pathname, item.href)) {
    return true;
  }

  return item.children?.some((child) => isItemActive(pathname, child)) ?? false;
};

const isRoleAllowedForItem = (item: Pick<SubMenuItem, 'href'>, role: Role) => {
  if (item.href === '/pre-sales/approvals') {
    return role === 'Director';
  }

  return true;
};

const filterAccessibleItems = (items: SubMenuItem[], hasAccess: (path: string) => boolean, role: Role): SubMenuItem[] => {
  return items.reduce<SubMenuItem[]>((visibleItems, item) => {
    const visibleChildren = item.children ? filterAccessibleItems(item.children, hasAccess, role) : undefined;

    if (isRoleAllowedForItem(item, role) && (hasAccess(item.href) || (visibleChildren?.length ?? 0) > 0)) {
      visibleItems.push({
        ...item,
        children: visibleChildren,
      });
    }

    return visibleItems;
  }, []);
};

const filterAccessibleNavLinks = (links: NavLink[], hasAccess: (path: string) => boolean, role: Role): NavLink[] => {
  return links.reduce<NavLink[]>((visibleLinks, link) => {
    const visibleChildren = link.children ? filterAccessibleItems(link.children, hasAccess, role) : undefined;

    if (hasAccess(link.href) || (visibleChildren?.length ?? 0) > 0) {
      visibleLinks.push({
        ...link,
        children: visibleChildren,
      });
    }

    return visibleLinks;
  }, []);
};

const shouldShowNavLinkForRole = (link: NavLink, role: Role, isPermissionLoaded: boolean) => {
  if (isPermissionLoaded) return true;

  if (link.name === 'Projects') {
    return PROJECT_SIDE_ROLES.includes(role);
  }

  if (link.name === 'Project Head') {
    return role === 'Project Head' || role === 'Director';
  }

  return true;
};

const navLinks: NavLink[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  {
    name: 'Pre-Sales & Budgeting',
    href: '/pre-sales/dashboard',
    icon: FileText,
    children: [
      { name: 'Bids', href: '/pre-sales/bids', icon: ListChecks },
      { name: 'Won Bids & LOI', href: '/pre-sales/won-bids', icon: Banknote },
      { name: 'In Process Bid', href: '/pre-sales/in-process-bid', icon: Clock },
      { name: 'Cancel Bid', href: '/pre-sales/cancel-bid', icon: AlertTriangle },
      { name: 'EMD Tracking', href: '/pre-sales/emd-tracking', icon: CreditCard },
      { name: 'Approvals', href: '/pre-sales/approvals', icon: CheckSquare },
    ],
  },
  { name: 'Projects', href: '/projects', icon: Layers3 },
  {
    name: 'Project Head',
    href: '/project-head/letter-of-completion',
    icon: Briefcase,
    children: [
      { name: 'Project Workspace', href: '/projects', icon: Layers3 },
      { name: 'Requests from PM', href: '/project-manager/requests', icon: Send },
      { name: 'Communication Log', href: '/comm-logs', icon: ClipboardList },
      { name: 'Approval', href: '/project-head/approval', icon: CheckSquare },
      { name: 'Letter of Completion', href: '/project-head/letter-of-completion', icon: ScrollText },
    ],
  },
  {
    name: 'Engineering',
    href: '/engineering',
    icon: Settings,
    children: [
      { name: 'Project Workspace', href: '/engineering/projects', icon: Layers3 },
      { name: 'Survey', href: '/survey', icon: MapPin },
      { name: 'BOQ', href: '/engineering/boq', icon: FileText },
      { name: 'Drawings', href: '/engineering/drawings', icon: FileText },
      { name: 'Change Requests', href: '/engineering/change-requests', icon: RefreshCcw },
      { name: 'Technical Deviations', href: '/engineering/deviations', icon: AlertTriangle },
    ],
  },
  {
    name: 'Procurement',
    href: '/procurement',
    icon: ShoppingCart,
    children: [
      { name: 'Project Workspace', href: '/procurement/projects', icon: Layers3 },
      { name: 'Vendor Comparisons', href: '/vendor-comparisons', icon: ClipboardList },
      { name: 'Indents', href: '/indents', icon: FileText },
      { name: 'Purchase Orders', href: '/purchase-orders', icon: ShoppingCart },
    ],
  },
  {
    name: 'Inventory',
    href: '/inventory',
    icon: Package,
    children: [
      { name: 'GRNs', href: '/grns', icon: Package },
      { name: 'Dispatch Challans', href: '/dispatch-challans', icon: Send },
      { name: 'Stock Position', href: '/stock-position', icon: Database },
      { name: 'Stock Aging', href: '/stock-aging', icon: BarChart3 },
    ],
  },
  {
    name: 'Execution (I&C)',
    href: '/execution',
    icon: Wrench,
    children: [
      { name: 'Project Workspace', href: '/execution/projects', icon: Layers3 },
      { name: 'Dependencies', href: '/execution/dependencies', icon: GitBranch },
      { name: 'Project Structure', href: '/execution/project-structure', icon: FolderTree },
      {
        name: 'Commissioning',
        href: '/execution/commissioning',
        icon: Cpu,
        children: [
          { name: 'Devices & IP', href: '/execution/commissioning/devices', icon: Cpu },
          { name: 'Test Reports & Signoffs', href: '/execution/commissioning/test-reports', icon: CheckCircle2 },
        ],
      },
      { name: 'Milestones', href: '/milestones', icon: Flag },
      { name: 'Manpower Logs', href: '/manpower', icon: Users2 },
      { name: 'Communication Logs', href: '/execution/comm-logs', icon: ClipboardList },
    ],
  },
  {
    name: 'Finance',
    href: '/finance',
    icon: DollarSign,
    children: [
      { name: 'Commercial Hub', href: '/finance/commercial', icon: Briefcase },
      { name: 'Estimates', href: '/finance/estimates', icon: FileText },
      { name: 'Proformas', href: '/finance/proformas', icon: ScrollText },
      { name: 'Costing', href: '/finance/costing', icon: PieChart },
      { name: 'Billing', href: '/finance/billing', icon: CreditCard },
      { name: 'Payment Receipts', href: '/finance/payment-receipts', icon: CreditCard },
      { name: 'Follow Ups', href: '/finance/follow-ups', icon: RefreshCcw },
      { name: 'Customer Statement', href: '/finance/customer-statement', icon: BookOpen },
      { name: 'Receivable Aging', href: '/finance/receivable-aging', icon: Clock },
      { name: 'Retention Ledger', href: '/finance/retention', icon: ShieldCheck },
      { name: 'Penalty Deductions', href: '/finance/penalties', icon: AlertTriangle },
      { name: 'Costing Queue', href: '/finance/costing-queue', icon: CheckSquare },
    ],
  },
  {
    name: 'HR',
    href: '/hr',
    icon: Users2,
    children: [
      { name: 'Project Workspace', href: '/hr/projects', icon: Layers3 },
      { name: 'Overview', href: '/hr', icon: Users2 },
      { name: 'Employees', href: '/hr/employees', icon: Users2 },
      { name: 'Onboarding', href: '/hr/onboarding', icon: Briefcase },
      { name: 'Attendance', href: '/hr/attendance', icon: CalendarCheck2 },
      { name: 'Leave Applications', href: '/hr/leave/applications', icon: CalendarCheck2 },
      { name: 'Regularizations', href: '/hr/regularizations', icon: CheckSquare },
      { name: 'Travel Logs', href: '/hr/travel-logs', icon: Plane },
      { name: 'Overtime', href: '/hr/overtime', icon: Clock },
      { name: 'Technician Visits', href: '/hr/technician-visits', icon: Wrench },
      { name: 'Operations', href: '/hr/operations', icon: Cog },
      { name: 'Approvals', href: '/hr/approvals', icon: CheckCircle2 },
      { name: 'Reports', href: '/hr/reports', icon: BarChart3 },
    ],
  },
  { name: 'RMA', href: '/rma', icon: RefreshCcw },
  { name: 'Notifications', href: '/notifications', icon: AlertTriangle },
  {
    name: 'O&M & Helpdesk',
    href: '/om-helpdesk',
    icon: HeadphonesIcon,
    children: [
      { name: 'Project Workspace', href: '/om-helpdesk/projects', icon: Layers3 },
      { name: 'Device Uptime', href: '/device-uptime', icon: Cpu },
      { name: 'SLA Penalties', href: '/sla-penalties', icon: AlertTriangle },
    ],
  },
  { name: 'SLA Profiles', href: '/sla-profiles', icon: Clock },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Accountability', href: '/accountability', icon: ShieldAlert },
  {
    name: 'Document Management',
    href: '/documents',
    icon: FolderOpen,
  },
  { name: 'Master Data', href: '/master-data', icon: Database },
  {
    name: 'Settings',
    href: '/settings',
    icon: Cog,
    children: [
      { name: 'Department', href: '/settings/department', icon: Users2 },
      { name: 'Designation', href: '/settings/designation', icon: Briefcase },
      { name: 'Roles', href: '/settings/roles', icon: Shield },
      { name: 'Permissions', href: '/settings/permissions', icon: Lock },
      { name: 'Stage Visibility', href: '/settings/stage-visibility', icon: Eye },
      { name: 'User Management', href: '/settings/user-management', icon: Users2 },
      { name: 'Audit Log', href: '/settings/audit-log', icon: ScrollText },
      { name: 'Checklist', href: '/settings/checklist', icon: CheckSquare },
    ],
  },
];

const projectManagerNavLinks: NavLink[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Survey Submission', href: '/survey', icon: MapPin },
  { name: 'Project Inventory', href: '/project-manager/inventory', icon: Package },
  { name: 'Project Petty Cash', href: '/project-manager/petty-cash', icon: CreditCard },
  { name: 'DPR & Progress', href: '/project-manager/dpr', icon: Camera },
  { name: 'Client Communication', href: '/comm-logs', icon: ClipboardList },
  { name: 'Requests to PH', href: '/project-manager/requests', icon: Send },
];

const getSubMenuClasses = (level: number) => ({
  wrapper: level === 0 ? 'mt-2 ml-3 pl-3 border-l border-[var(--border-subtle)] space-y-1.5' : 'mt-2 ml-4 pl-3 border-l border-[var(--border-subtle)] space-y-1.5',
  item: level === 0 ? 'rounded-2xl px-3 py-2.5' : 'rounded-xl px-3 py-2',
  text: level === 0 ? 'text-[13px]' : 'text-[12.5px]',
});

function SubMenu({
  items,
  level = 0,
  onNavigate,
  expandedItems,
  onToggle,
}: {
  items: SubMenuItem[];
  level?: number;
  onNavigate?: () => void;
  expandedItems: Record<string, boolean | undefined>;
  onToggle: (href: string, isExpanded: boolean) => void;
}) {
  const pathname = usePathname() || '';
  const { hasAccess, currentRole } = useRole();
  if (!currentRole) {
    return null;
  }
  const accessibleItems = filterAccessibleItems(items, hasAccess, currentRole);
  const menuClasses = getSubMenuClasses(level);

  return (
    <ul className={menuClasses.wrapper}>
      {accessibleItems.map((item) => {
        const isCurrentRoute = matchesPath(pathname, item.href);
        const hasChildren = item.children && item.children.length > 0;
        const isDescendantActive = item.children?.some((child) => isItemActive(pathname, child)) ?? false;
        const isExpanded = hasChildren ? expandedItems[item.href] ?? isDescendantActive : false;
        const Icon = item.icon;

        return (
          <li key={item.href}>
            <button
              type="button"
              aria-expanded={hasChildren ? isExpanded : undefined}
              className={`group flex items-center justify-between border transition-all duration-200 cursor-pointer ${menuClasses.item} ${
                isCurrentRoute && !hasChildren
                  ? 'border-[var(--border-strong)] bg-[var(--accent-soft)] text-[var(--accent-strong)] shadow-[var(--shadow-subtle)]'
                  : hasChildren && (isCurrentRoute || isDescendantActive)
                    ? 'border-[var(--border-subtle)] bg-[var(--surface-hover)] text-[var(--text-main)]'
                    : 'border-transparent bg-white/70 text-[var(--text-muted)] hover:border-[var(--border-subtle)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-main)]'
              }`}
              onClick={() => hasChildren ? onToggle(item.href, isExpanded) : null}
            >
              {hasChildren ? (
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  {Icon ? <Icon className="w-4 h-4 flex-shrink-0" /> : <Layers3 className="w-4 h-4 flex-shrink-0" />}
                  <span className={`truncate font-medium ${menuClasses.text}`}>{item.name}</span>
                </div>
              ) : (
                <Link href={item.href} className="flex items-center gap-2.5 flex-1 min-w-0" onClick={onNavigate}>
                  {Icon ? <Icon className="w-4 h-4 flex-shrink-0" /> : <Layers3 className="w-4 h-4 flex-shrink-0" />}
                  <span className={`truncate font-medium ${menuClasses.text}`}>{item.name}</span>
                </Link>
              )}
              {hasChildren ? (
                isExpanded
                  ? <ChevronDown className={`w-4 h-4 flex-shrink-0 ${isCurrentRoute || isDescendantActive ? 'text-[var(--accent-strong)]' : 'text-[var(--text-soft)] group-hover:text-[var(--accent)]'}`} />
                  : <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isCurrentRoute || isDescendantActive ? 'text-[var(--accent-strong)]' : 'text-[var(--text-soft)] group-hover:text-[var(--accent)]'}`} />
              ) : null}
            </button>
            {hasChildren && isExpanded ? (
              <SubMenu
                items={item.children!}
                level={level + 1}
                onNavigate={onNavigate}
                expandedItems={expandedItems}
                onToggle={onToggle}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export default function Sidebar() {
  const pathname = usePathname() || '';
  const { currentUser } = useAuth();
  const { hasAccess, currentRole, isPermissionLoaded } = useRole();
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean | undefined>>({});
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  if (!currentUser || !currentRole) {
    return null;
  }
  const sourceLinks = currentRole === 'Project Manager' ? projectManagerNavLinks : navLinks;
  const accessibleLinks = filterAccessibleNavLinks(
    sourceLinks.filter((link) => shouldShowNavLinkForRole(link, currentRole, isPermissionLoaded)),
    hasAccess,
    currentRole,
  );

  const persistScrollPosition = () => {
    if (!navRef.current) return;
    try {
      sessionStorage.setItem(SIDEBAR_SCROLL_STORAGE_KEY, String(navRef.current.scrollTop));
    } catch {}
  };

  const toggleMenu = (href: string, isExpanded: boolean) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [href]: !isExpanded,
    }));
  };

  const handleLinkClick = () => {
    persistScrollPosition();
    setIsMobileOpen(false);
  };

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SIDEBAR_EXPANDED_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, boolean | undefined>;
        if (parsed && typeof parsed === 'object') {
          setExpandedMenus(parsed);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(SIDEBAR_EXPANDED_STORAGE_KEY, JSON.stringify(expandedMenus));
    } catch {}
  }, [expandedMenus]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (!navRef.current) return;
      try {
        const saved = sessionStorage.getItem(SIDEBAR_SCROLL_STORAGE_KEY);
        if (!saved) return;
        const scrollTop = Number(saved);
        if (!Number.isNaN(scrollTop)) {
          navRef.current.scrollTop = scrollTop;
        }
      } catch {}
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname, expandedMenus]);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        aria-label={isMobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={isMobileOpen}
        aria-controls="app-sidebar-navigation"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed bottom-4 right-4 z-50 p-3 text-white rounded-full shadow-lg transition-colors bg-[var(--brand-orange)]"
      >
        {isMobileOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {isMobileOpen ? (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      ) : null}

      <aside
        id="app-sidebar-navigation"
        className={`
          w-[min(86vw,20rem)] h-screen flex-shrink-0 flex-col overflow-hidden
          fixed lg:static inset-y-0 left-0 z-50 border-r border-[var(--border-subtle)]
          transform transition-transform duration-300 ease-in-out
          lg:w-80 lg:min-w-[320px]
          ${isMobileOpen ? 'translate-x-0 flex' : '-translate-x-full lg:translate-x-0 lg:flex'}
        `}
      >
        <div className="p-4 lg:p-5 border-b border-[var(--border-subtle)] bg-transparent">
          <div className="shell-panel px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[var(--accent-tint)] flex items-center justify-center shrink-0 border border-[var(--border-subtle)]">
                <Image src="/logo.png" alt="Technosys Logo" width={48} height={48} className="object-contain w-full h-full drop-shadow-sm" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm lg:text-base font-bold text-[var(--text-main)] leading-tight truncate">
                  Technosys ERP
                </h1>
                <div className="text-[11px] text-[var(--text-muted)] truncate">
                  tailored for your needs and as per experiences
                </div>
              </div>
            </div>
          </div>
        </div>

        <nav
          ref={navRef}
          onScroll={persistScrollPosition}
          className="sidebar-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-24 lg:pb-4"
        >
          <div className="shell-section-title mb-3 px-2 pt-4">Navigation</div>
          <ul className="space-y-2">
            {accessibleLinks.map((link) => {
              const isActive = matchesPath(pathname, link.href);
              const isInSection = link.children?.some((child) => isItemActive(pathname, child)) ?? false;
              const hasChildren = link.children && link.children.length > 0;
              const isExpanded = hasChildren ? expandedMenus[link.href] ?? (isActive || isInSection) : false;
              const canAccessLink = hasAccess(link.href);
              const Icon = link.icon;

              return (
                <li key={link.href}>
                  <div
                    className={`group flex items-center justify-between rounded-3xl border px-3.5 py-3 transition-all duration-200 ${
                      isActive
                        ? 'border-[var(--border-strong)] bg-[var(--accent-soft)] text-[var(--accent-strong)] shadow-[var(--shadow-soft)]'
                        : isInSection
                          ? 'border-[var(--border-subtle)] bg-[var(--surface-hover)] text-[var(--text-main)]'
                          : 'border-transparent bg-white/60 text-[var(--text-main)] hover:border-[var(--border-subtle)] hover:bg-white/85 hover:text-[var(--text-main)]'
                    }`}
                  >
                    {canAccessLink ? (
                      <Link
                        href={link.href}
                        className="flex items-center gap-3 flex-1 min-w-0"
                        onClick={() => {
                          if (hasChildren && !isExpanded) {
                            toggleMenu(link.href, isExpanded);
                          }
                          handleLinkClick();
                        }}
                      >
                        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${
                          isActive
                            ? 'bg-white/70 border-white/80 text-[var(--accent-strong)]'
                            : isInSection
                              ? 'bg-white border-[var(--border-subtle)] text-[var(--accent-strong)]'
                              : 'bg-[var(--accent-tint)] border-[var(--border-subtle)] text-[var(--accent)]'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{link.name}</div>
                          {hasChildren ? (
                            <div className={`text-[11px] ${isActive ? 'text-[var(--accent-strong)]/70' : isInSection ? 'text-[var(--accent-strong)]' : 'text-[var(--text-soft)]'}`}>
                              {link.children?.length} sections
                            </div>
                          ) : null}
                        </div>
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="flex items-center gap-3 flex-1 text-left min-w-0"
                        onClick={() => hasChildren ? toggleMenu(link.href, isExpanded) : null}
                      >
                        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${
                          isInSection
                            ? 'bg-white border-[var(--border-subtle)] text-[var(--accent-strong)]'
                            : 'bg-[var(--accent-tint)] border-[var(--border-subtle)] text-[var(--accent)]'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{link.name}</div>
                          {hasChildren ? <div className="text-[11px] text-[var(--text-soft)]">{link.children?.length} sections</div> : null}
                        </div>
                      </button>
                    )}
                    {hasChildren ? (
                      <button
                        type="button"
                        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${link.name}`}
                        aria-expanded={isExpanded}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleMenu(link.href, isExpanded);
                        }}
                        className={`p-2 rounded-xl ${isActive ? 'hover:bg-white/65' : 'hover:bg-[var(--surface-hover)]'}`}
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    ) : null}
                  </div>
                  {hasChildren && isExpanded ? (
                    <SubMenu
                      items={link.children!}
                      onNavigate={handleLinkClick}
                      expandedItems={expandedMenus}
                      onToggle={toggleMenu}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="shrink-0 p-4 border-t border-[var(--border-subtle)] bg-transparent">
          <div className="shell-panel px-4 py-3 text-center">
            <div className="text-xs font-semibold text-[var(--text-main)]">Technosys ERP</div>
            <div className="mt-1 text-[11px] text-[var(--text-soft)]">2026</div>
          </div>
        </div>
      </aside>
    </>
  );
}
