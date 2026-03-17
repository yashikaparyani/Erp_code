'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
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
  Building2,
  Database,
  ChevronRight,
  ChevronDown,
  FileSearch,
  Trophy,
  TrendingUp,
  ListTodo,
  CreditCard,
  PieChart,
  Files,
  CheckSquare,
  Cog,
  Users2,
  RefreshCcw,
  AlertTriangle,
  GitBranch,
  FolderTree,
  Cpu,
  ClipboardList
} from 'lucide-react';
import { useRole } from '../context/RoleContext';

interface SubMenuItem {
  name: string;
  href: string;
  icon?: any;
  children?: SubMenuItem[];
}

interface NavLink {
  name: string;
  href: string;
  icon: any;
  children?: SubMenuItem[];
}

const matchesPath = (pathname: string, href: string) => pathname === href || pathname.startsWith(href + '/');

const isItemActive = (pathname: string, item: SubMenuItem) => {
  if (matchesPath(pathname, item.href)) {
    return true;
  }

  return item.children?.some(child => isItemActive(pathname, child)) ?? false;
};

const filterAccessibleItems = (items: SubMenuItem[], hasAccess: (path: string) => boolean): SubMenuItem[] => {
  return items.reduce<SubMenuItem[]>((visibleItems, item) => {
    const visibleChildren = item.children ? filterAccessibleItems(item.children, hasAccess) : undefined;

    if (hasAccess(item.href) || (visibleChildren?.length ?? 0) > 0) {
      visibleItems.push({
        ...item,
        children: visibleChildren,
      });
    }

    return visibleItems;
  }, []);
};

const filterAccessibleNavLinks = (links: NavLink[], hasAccess: (path: string) => boolean): NavLink[] => {
  return links.reduce<NavLink[]>((visibleLinks, link) => {
    const visibleChildren = link.children ? filterAccessibleItems(link.children, hasAccess) : undefined;

    if (hasAccess(link.href) || (visibleChildren?.length ?? 0) > 0) {
      visibleLinks.push({
        ...link,
        children: visibleChildren,
      });
    }

    return visibleLinks;
  }, []);
};

const navLinks: NavLink[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  {
    name: 'Pre-Sales & Budgeting',
    href: '/pre-sales',
    icon: FileText,
    children: [
      { name: 'Tender', href: '/pre-sales/tender', icon: FileSearch },
      { name: 'Tender Result', href: '/pre-sales/tender-result', icon: Trophy },
      {
        name: 'Analytics',
        href: '/pre-sales/analytics',
        icon: TrendingUp,
        children: [
          { name: 'Company Profile', href: '/pre-sales/analytics/company-profile' },
          { name: 'Competitors', href: '/pre-sales/analytics/competitors' },
          { name: 'Tender Results', href: '/pre-sales/analytics/tender-results' },
          { name: 'MIS Reports', href: '/pre-sales/analytics/mis-reports' },
          { name: 'Compare Bidders', href: '/pre-sales/analytics/compare-bidders' },
          { name: 'Missed Opportunity', href: '/pre-sales/analytics/missed-opportunity' },
        ]
      },
      {
        name: 'Tender Task',
        href: '/pre-sales/tender-task',
        icon: ListTodo,
        children: [
          { name: 'My Tender', href: '/pre-sales/tender-task/my-tender' },
          { name: 'In-Process Tender', href: '/pre-sales/tender-task/in-process' },
          { name: 'Assigned To Team', href: '/pre-sales/tender-task/assigned-to-team' },
          { name: 'Submitted Tender', href: '/pre-sales/tender-task/submitted' },
          { name: 'Dropped Tender', href: '/pre-sales/tender-task/dropped' },
        ]
      },
      {
        name: 'Finance Management',
        href: '/pre-sales/finance',
        icon: CreditCard,
        children: [
          { name: 'New Request', href: '/pre-sales/finance/new-request' },
          { name: 'Approve Request', href: '/pre-sales/finance/approve-request' },
          { name: 'Denied Request', href: '/pre-sales/finance/denied-request' },
          { name: 'Completed Request', href: '/pre-sales/finance/completed-request' },
        ]
      },
      {
        name: 'MIS',
        href: '/pre-sales/mis',
        icon: PieChart,
        children: [
          { name: 'Finance MIS', href: '/pre-sales/mis/finance' },
          { name: 'Sales MIS', href: '/pre-sales/mis/sales' },
          { name: 'Login MIS', href: '/pre-sales/mis/login' },
        ]
      },
      {
        name: 'Document Management',
        href: '/pre-sales/documents',
        icon: Files,
        children: [
          { name: 'Document Brief Case', href: '/pre-sales/documents/briefcase' },
          { name: 'Folders', href: '/pre-sales/documents/folders' },
        ]
      },
      { name: "Approval's", href: '/pre-sales/approvals', icon: CheckSquare },
    ]
  },
  {
    name: 'Engineering',
    href: '/engineering',
    icon: Settings,
    children: [
      { name: 'Survey', href: '/survey', icon: MapPin },
      { name: 'BOQ', href: '/engineering/boq', icon: FileText },
      { name: 'Technical Deviations', href: '/engineering/deviations', icon: AlertTriangle },
      { name: 'Drawings', href: '/drawings', icon: FileText },
      { name: 'Change Requests', href: '/change-requests', icon: GitBranch },
    ]
  },
  {
    name: 'Procurement',
    href: '/procurement',
    icon: ShoppingCart,
    children: [
      { name: 'Purchase Orders', href: '/purchase-orders', icon: ShoppingCart },
      { name: 'GRNs', href: '/grns', icon: Package },
      { name: 'Indents', href: '/indents', icon: ClipboardList },
    ]
  },
  {
    name: 'Inventory',
    href: '/inventory',
    icon: Package,
    children: [
      { name: 'Stock Position', href: '/stock-position', icon: Package },
      { name: 'Stock Aging', href: '/stock-aging', icon: BarChart3 },
    ]
  },
  {
    name: 'Execution (I&C)',
    href: '/execution',
    icon: Wrench,
    children: [
      { name: 'Dependencies', href: '/execution/dependencies', icon: GitBranch },
      { name: 'Project Structure', href: '/execution/project-structure', icon: FolderTree },
      { name: 'Milestones', href: '/milestones', icon: ListTodo },
      { name: 'Manpower Logs', href: '/manpower', icon: Users2 },
      { name: 'Comm Logs', href: '/comm-logs', icon: FileText },
      {
        name: 'Commissioning',
        href: '/execution/commissioning',
        icon: Cpu,
        children: [
          { name: 'Devices & IP', href: '/execution/commissioning/devices' },
          { name: 'Test Reports & Signoffs', href: '/execution/commissioning/test-reports' },
        ]
      },
    ]
  },
  {
    name: 'Finance',
    href: '/finance',
    icon: DollarSign,
    children: [
      { name: 'Costing', href: '/finance/costing', icon: PieChart },
      { name: 'Billing', href: '/finance/billing', icon: CreditCard },
      { name: 'Petty Cash', href: '/petty-cash', icon: DollarSign },
      { name: 'Payment Receipts', href: '/payment-receipts', icon: CreditCard },
      { name: 'Retention Money', href: '/retention', icon: DollarSign },
      { name: 'Penalties', href: '/penalties', icon: AlertTriangle },
    ]
  },
  {
    name: 'HR',
    href: '/hr',
    icon: Users2,
  },
  {
    name: 'RMA',
    href: '/rma',
    icon: RefreshCcw,
  },
  {
    name: 'O&M & Helpdesk',
    href: '/om-helpdesk',
    icon: HeadphonesIcon,
    children: [
      { name: 'Technician Visits', href: '/technician-visits', icon: Wrench },
      { name: 'SLA Profiles', href: '/sla-profiles', icon: ClipboardList },
      { name: 'Device Uptime', href: '/device-uptime', icon: Cpu },
    ]
  },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Document Management', href: '/documents', icon: FolderOpen },
  { name: 'Master Data', href: '/master-data', icon: Database },
  {
    name: 'Settings',
    href: '/pre-sales/settings',
    icon: Cog,
    children: [
      { name: 'Department', href: '/pre-sales/settings/department' },
      { name: 'Designation', href: '/pre-sales/settings/designation' },
      { name: 'Role', href: '/pre-sales/settings/role' },
      { name: 'User Management', href: '/pre-sales/settings/user-management' },
      { name: 'Check List', href: '/pre-sales/settings/checklist' },
    ]
  },
];

// Recursive SubMenu Component
function SubMenu({ items, level = 0, onNavigate }: { items: SubMenuItem[], level?: number, onNavigate?: () => void }) {
  const pathname = usePathname();
  const { hasAccess } = useRole();
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean | undefined>>({});
  const accessibleItems = filterAccessibleItems(items, hasAccess);

  const toggleExpand = (href: string, isExpanded: boolean) => {
    setExpandedItems(prev => ({
      ...prev,
      [href]: !isExpanded,
    }));
  };

  return (
    <ul className={`space-y-0.5 ${level === 0 ? 'mt-1' : 'mt-0.5'}`}>
      {accessibleItems.map(item => {
        const isCurrentRoute = matchesPath(pathname, item.href);
        const hasChildren = item.children && item.children.length > 0;
        const isDescendantActive = item.children?.some(child => isItemActive(pathname, child)) ?? false;
        const isExpanded = hasChildren ? expandedItems[item.href] ?? isDescendantActive : false;
        const Icon = item.icon;
        const paddingLeft = level === 0 ? 'pl-8' : level === 1 ? 'pl-12' : 'pl-16';

        return (
          <li key={item.href}>
            <div
              className={`flex items-center justify-between ${paddingLeft} pr-3 py-2 rounded-lg text-sm transition-all duration-200 cursor-pointer ${isCurrentRoute && !hasChildren
                ? 'bg-blue-600/20 text-blue-400'
                : hasChildren && (isCurrentRoute || isDescendantActive)
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              onClick={() => hasChildren ? toggleExpand(item.href, isExpanded) : null}
            >
              {hasChildren ? (
                <div className="flex items-center gap-2 flex-1">
                  {Icon && <Icon className="w-4 h-4" />}
                  <span>{item.name}</span>
                </div>
              ) : (
                <Link href={item.href} className="flex items-center gap-2 flex-1" onClick={onNavigate}>
                  {Icon && <Icon className="w-4 h-4" />}
                  <span>{item.name}</span>
                </Link>
              )}
              {hasChildren && (
                isExpanded
                  ? <ChevronDown className="w-4 h-4 text-slate-500" />
                  : <ChevronRight className="w-4 h-4 text-slate-500" />
              )}
            </div>
            {hasChildren && isExpanded && (
              <SubMenu items={item.children!} level={level + 1} onNavigate={onNavigate} />
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { hasAccess } = useRole();
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean | undefined>>({});
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Filter navigation links based on role access
  const accessibleLinks = filterAccessibleNavLinks(navLinks, hasAccess);

  const toggleMenu = (name: string, isExpanded: boolean) => {
    setExpandedMenus(prev => ({
      ...prev,
      [name]: !isExpanded,
    }));
  };

  // Close mobile menu when route changes
  const handleLinkClick = () => {
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed bottom-4 right-4 z-50 p-3 text-white rounded-full shadow-lg transition-colors"
        style={{ backgroundColor: 'var(--brand-orange)' }}
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

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        w-72 min-w-[288px] flex-shrink-0 bg-white min-h-screen flex flex-col overflow-y-auto
        fixed lg:static inset-y-0 left-0 z-50 border-r border-gray-200
        transform transition-transform duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo Section */}
        <div className="p-4 lg:p-6 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 flex items-center justify-center shrink-0">
              <img src="/logo.png" alt="Technosys Logo" className="object-contain w-full h-full drop-shadow-sm" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm lg:text-base font-bold text-gray-900 leading-tight truncate">
                Technosys ERP
              </h1>
              <div className="text-[11px] text-gray-500 truncate" title="tailored for your needs and as per experiences">
                tailored for your needs and as per experiences
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {accessibleLinks.map(link => {
              const isActive = matchesPath(pathname, link.href);
              const isInSection = link.children?.some(child => isItemActive(pathname, child)) ?? false;
              const hasChildren = link.children && link.children.length > 0;
              const isExpanded = hasChildren ? expandedMenus[link.name] ?? (isActive || isInSection) : false;
              const canAccessLink = hasAccess(link.href);
              const Icon = link.icon;

              return (
                <li key={link.href}>
                  <div
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                      ? 'bg-[var(--brand-orange)] text-white'
                      : isInSection
                        ? 'bg-orange-50 text-orange-700'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                  >
                    {canAccessLink ? (
                      <Link
                        href={link.href}
                        className="flex items-center gap-3 flex-1"
                        onClick={() => {
                          if (hasChildren && !isExpanded) {
                            toggleMenu(link.name, isExpanded);
                          }
                          handleLinkClick();
                        }}
                      >
                        <Icon className="w-5 h-5" />
                        <span>{link.name}</span>
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="flex items-center gap-3 flex-1 text-left"
                        onClick={() => hasChildren ? toggleMenu(link.name, isExpanded) : null}
                      >
                        <Icon className="w-5 h-5" />
                        <span>{link.name}</span>
                      </button>
                    )}
                    {hasChildren && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleMenu(link.name, isExpanded);
                        }}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        {isExpanded
                          ? <ChevronDown className="w-4 h-4" />
                          : <ChevronRight className="w-4 h-4" />
                        }
                      </button>
                    )}
                  </div>
                  {hasChildren && isExpanded && (
                    <SubMenu items={link.children!} onNavigate={handleLinkClick} />
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="text-xs text-gray-400 text-center">
            © 2026 technosys ERP
          </div>
        </div>
      </aside>
    </>
  );
}
