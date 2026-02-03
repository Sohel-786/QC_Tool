'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Building2,
    MapPin,
    Briefcase,
    Tag,
    Cog,
    Package,
    Layers,
    ClipboardList,
    ArrowLeftRight,
    BarChart3,
    LayoutDashboard,
    ChevronDown,
    ChevronUp,
    Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrentUserPermissions } from '@/hooks/use-settings';

const navigationSections = {
    dashboard: [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, gradient: "from-blue-500 to-indigo-600", hoverColor: "text-blue-600", permission: 'viewDashboard' },
    ],
    masterEntries: [
        { href: "/companies", label: "Company", icon: Building2, gradient: "from-violet-500 to-purple-600", hoverColor: "text-violet-600", permission: 'viewMaster' },
        { href: "/locations", label: "Location", icon: MapPin, gradient: "from-emerald-500 to-teal-600", hoverColor: "text-emerald-600", permission: 'viewMaster' },
        { href: "/contractors", label: "Contractor", icon: Briefcase, gradient: "from-orange-500 to-amber-600", hoverColor: "text-orange-600", permission: 'viewMaster' },
        { href: "/statuses", label: "Status", icon: Tag, gradient: "from-pink-500 to-rose-600", hoverColor: "text-pink-600", permission: 'viewMaster' },
        { href: "/machines", label: "Machine", icon: Cog, gradient: "from-cyan-500 to-blue-600", hoverColor: "text-cyan-600", permission: 'viewMaster' },
        { href: "/items", label: "Item", icon: Package, gradient: "from-indigo-500 to-blue-600", hoverColor: "text-indigo-600", permission: 'viewMaster' },
        { href: "/item-categories", label: "Category", icon: Layers, gradient: "from-teal-500 to-emerald-600", hoverColor: "text-teal-600", permission: 'viewMaster' },
    ],
    transactionEntries: [
        { href: "/issues", label: "Outward", icon: ClipboardList, gradient: "from-red-500 to-pink-600", hoverColor: "text-red-600", permission: 'viewOutward' },
        { href: "/returns", label: "Inward", icon: ArrowLeftRight, gradient: "from-green-500 to-emerald-600", hoverColor: "text-green-600", permission: 'viewInward' },
    ],
    other: [
        { href: "/reports", label: "Reports", icon: BarChart3, gradient: "from-amber-500 to-orange-600", hoverColor: "text-amber-600", permission: 'viewReports' },
        { href: "/settings", label: "Settings", icon: Settings, gradient: "from-slate-500 to-gray-600", hoverColor: "text-slate-600", permission: 'accessSettings' },
    ],
};

export function HorizontalNav() {
    const pathname = usePathname();
    const { data: permissions } = useCurrentUserPermissions();
    const [isExpanded, setIsExpanded] = useState(true);

    const filterItems = (items: typeof navigationSections.dashboard) => {
        return items.filter(item => {
            if (item.permission === 'viewDashboard') return permissions?.viewDashboard ?? false;
            if (item.permission === 'viewMaster') return permissions?.viewMaster ?? false;
            if (item.permission === 'viewOutward') return permissions?.viewOutward ?? false;
            if (item.permission === 'viewInward') return permissions?.viewInward ?? false;
            if (item.permission === 'viewReports') return permissions?.viewReports ?? false;
            if (item.permission === 'accessSettings') return permissions?.accessSettings ?? false;
            return true;
        });
    };

    const visibleDashboard = filterItems(navigationSections.dashboard);
    const visibleMasterEntries = filterItems(navigationSections.masterEntries);
    const visibleTransactionEntries = filterItems(navigationSections.transactionEntries);
    const visibleOther = filterItems(navigationSections.other);

    const renderNavItem = (item: typeof navigationSections.dashboard[0]) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
            <Link key={item.href} href={item.href}>
                <div className={cn(
                    "flex flex-col items-center gap-1.5 px-3 py-2 rounded-lg transition-all duration-200 min-w-[80px] group cursor-pointer",
                    isActive
                        ? "bg-white shadow-md scale-105 ring-2 ring-primary-200"
                        : "bg-white/50 hover:bg-white hover:shadow-sm hover:scale-105"
                )}>
                    <div className={cn(
                        "p-2 rounded-lg bg-gradient-to-br shadow-sm transition-all duration-200",
                        isActive
                            ? item.gradient + " text-white shadow-md"
                            : "bg-secondary-100 text-secondary-500 group-hover:shadow-md group-hover:bg-white group-hover:" + item.hoverColor
                    )}>
                        <Icon className="w-5 h-5" strokeWidth={2.5} />
                    </div>
                    <span className={cn(
                        "text-[11px] font-semibold text-center whitespace-nowrap transition-colors leading-tight",
                        isActive ? "text-primary-700" : "text-secondary-600 group-hover:text-primary-600"
                    )}>
                        {item.label}
                    </span>
                </div>
            </Link>
        );
    };

    const renderDivider = (label?: string) => (
        <div className="flex flex-col items-center justify-center px-2 py-1">
            <div className="h-12 w-px bg-gradient-to-b from-transparent via-secondary-300 to-transparent"></div>
            {label && (
                <span className="text-[9px] font-bold text-secondary-500 uppercase tracking-wider mt-1.5 whitespace-nowrap">
                    {label}
                </span>
            )}
            <div className="h-12 w-px bg-gradient-to-b from-transparent via-secondary-300 to-transparent mt-1.5"></div>
        </div>
    );

    return (
        <nav className="w-full bg-gradient-to-r from-white via-secondary-50 to-white border-b border-secondary-200 shadow-sm sticky top-[3.5rem] z-30">
            <div className="px-3 py-1.5">
                {/* Toggle Button */}
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-[10px] font-semibold text-secondary-600 uppercase tracking-wider">
                        Navigation
                    </h3>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-white hover:bg-secondary-100 border border-secondary-200 transition-all duration-200 group"
                    >
                        <span className="text-[10px] font-medium text-secondary-700">
                            {isExpanded ? 'Collapse' : 'Expand'}
                        </span>
                        {isExpanded ? (
                            <ChevronUp className="w-3 h-3 text-secondary-600 group-hover:text-primary-600 transition-colors" />
                        ) : (
                            <ChevronDown className="w-3 h-3 text-secondary-600 group-hover:text-primary-600 transition-colors" />
                        )}
                    </button>
                </div>

                {/* Navigation Items - Sectioned with Dividers */}
                <div
                    className={cn(
                        "transition-all duration-300 ease-in-out overflow-hidden",
                        isExpanded ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
                    )}
                >
                    <div className="flex flex-wrap items-start gap-2 pb-2 pt-2">
                        {/* Dashboard Section */}
                        {visibleDashboard.length > 0 && (
                            <>
                                {visibleDashboard.map(renderNavItem)}
                                {(visibleMasterEntries.length > 0 || visibleTransactionEntries.length > 0 || visibleOther.length > 0) && renderDivider()}
                            </>
                        )}

                        {/* Master Entries Section */}
                        {visibleMasterEntries.length > 0 && (
                            <>
                                <div className="flex flex-col items-center justify-center min-w-[100px] py-1">
                                    <span className="text-[10px] font-bold text-primary-600 uppercase tracking-wider mb-1.5">
                                        Master Entry
                                    </span>
                                    <div className="flex flex-wrap gap-2 justify-center">
                                        {visibleMasterEntries.map(renderNavItem)}
                                    </div>
                                </div>
                                {(visibleTransactionEntries.length > 0 || visibleOther.length > 0) && renderDivider()}
                            </>
                        )}

                        {/* Transaction Entries Section */}
                        {visibleTransactionEntries.length > 0 && (
                            <>
                                <div className="flex flex-col items-center justify-center min-w-[100px] py-1">
                                    <span className="text-[10px] font-bold text-primary-600 uppercase tracking-wider mb-1.5">
                                        Transaction Entries
                                    </span>
                                    <div className="flex flex-wrap gap-2 justify-center">
                                        {visibleTransactionEntries.map(renderNavItem)}
                                    </div>
                                </div>
                                {visibleOther.length > 0 && renderDivider()}
                            </>
                        )}

                        {/* Other Section (Reports & Settings) */}
                        {visibleOther.length > 0 && visibleOther.map(renderNavItem)}
                    </div>
                </div>
            </div>
        </nav>
    );
}
