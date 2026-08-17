'use client';

import React, { useState } from 'react';
import { ShieldCheck, RefreshCw, UserCheck } from 'lucide-react';
import { StorageEngine } from '../lib/storageEngine';
import { UserRole } from '../lib/types';

interface NavbarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onRoleChange?: (role: UserRole) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onTabChange, onRoleChange }) => {
  const [role, setRole] = useState<UserRole>(StorageEngine.getCurrentRole());

  const handleRoleSwitch = (newRole: UserRole) => {
    setRole(newRole);
    const settings = StorageEngine.getSettings();
    settings.currentUserRole = newRole;
    StorageEngine.saveSettings(settings);
    if (onRoleChange) onRoleChange(newRole);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 text-slate-800 px-4 lg:px-8 py-3.5 flex items-center justify-between shadow-md select-none">
      {/* Brand Title & Logo */}
      <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onTabChange('dashboard')}>
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 flex items-center justify-center shadow-md shadow-indigo-500/25">
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-base font-extrabold tracking-tight text-slate-900 flex items-center space-x-2">
            <span>PLANT ENGINEERING AUDIT PORTAL</span>
          </h1>
        </div>
      </div>

      {/* Navigation Right Side Controls */}
      <div className="flex items-center space-x-3">
        {/* Role Selector Badge */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-extrabold">
          <UserCheck className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
          <select
            value={role}
            onChange={(e) => handleRoleSwitch(e.target.value as UserRole)}
            className="bg-transparent text-slate-800 text-xs font-extrabold focus:outline-none cursor-pointer pr-1"
          >
            <option value="Admin">Admin</option>
            <option value="Engineering">Engineering</option>
            <option value="QA">QA</option>
            <option value="Auditor">Auditor</option>
            <option value="Viewer">Viewer</option>
          </select>
        </div>

        {/* Quick New Audit Button */}
        {role !== 'Viewer' && (
          <button
            onClick={() => onTabChange('new-audit')}
            className="flex items-center space-x-1.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-md shadow-indigo-500/20 transition active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>New Audit</span>
          </button>
        )}
      </div>
    </header>
  );
};
