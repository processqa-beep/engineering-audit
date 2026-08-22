'use client';

import React from 'react';
import {
  LayoutDashboard,
  ClipboardPlus,
  AlertOctagon,
  History,
  Database,
  Settings,
  CheckSquare,
  Mail,
  Save,
  FileSpreadsheet,
  Layers,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  openActionCount?: number;
  isAdmin?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  openActionCount = 0,
  isAdmin = false,
}) => {
  const allNavItems = [
    { id: 'dashboard',          label: 'Executive Dashboard',           icon: LayoutDashboard },
    { id: 'new-audit',          label: 'New Audit Form',                icon: ClipboardPlus },
    { id: 'drafts',             label: 'Saved Drafts',                  icon: Save },
    { id: 'actions',            label: 'Action Tracking',               icon: AlertOctagon, count: openActionCount },
    { id: 'audits',             label: 'Audit History & Reports',       icon: History },
    { id: 'audit-point-setup',  label: 'Audit Point Setup (Excel)',     icon: FileSpreadsheet,  badge: 'Admin', adminOnly: true },
    { id: 'plant-structure',    label: 'Plant Structure Settings',      icon: Layers,            badge: 'Admin', adminOnly: true },
    { id: 'mail',               label: 'Mail Alert Notifications',      icon: Mail,              badge: 'Admin', adminOnly: true },
  ];

  const navItems = allNavItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside className="w-16 bg-white border-r border-slate-200/80 shrink-0 hidden md:flex flex-col items-center justify-between py-4 shadow-sm h-full z-30 select-none">
      {/* Icon Navigation Items */}
      <div className="space-y-3 flex flex-col items-center w-full">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <div key={item.id} className="relative group flex items-center justify-center w-full px-2">
              <button
                onClick={() => onTabChange(item.id)}
                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/30 scale-105'
                    : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/80'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {item.count !== undefined && item.count > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-extrabold flex items-center justify-center border-2 border-white shadow-xs">
                    {item.count}
                  </span>
                )}
              </button>

              {/* Hover Floating Tooltip */}
              <div className="absolute left-16 z-50 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200 flex items-center space-x-1.5">
                <span>{item.label}</span>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[9px] rounded bg-indigo-500 text-white font-bold">
                    {item.badge}
                  </span>
                )}
                {/* Left Arrow Pointer */}
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 border-y-4 border-y-transparent border-r-4 border-r-slate-900" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Single Settings Gear Icon at Bottom - Only for Admin */}
      {isAdmin && (
        <div className="relative group flex items-center justify-center w-full px-2">
          <button
            onClick={() => onTabChange('settings')}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition ${
              activeTab === 'settings'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Settings className="w-5 h-5" />
          </button>
          <div className="absolute left-16 z-50 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200">
            <span>System Settings</span>
            <div className="absolute -left-1 top-1/2 -translate-y-1/2 border-y-4 border-y-transparent border-r-4 border-r-slate-900" />
          </div>
        </div>
      )}
    </aside>
  );
};
