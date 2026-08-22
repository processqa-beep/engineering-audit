'use client';

import React, { useState } from 'react';
import { ShieldCheck, RefreshCw, UserCheck, LogOut, User } from 'lucide-react';
import { StorageEngine } from '../lib/storageEngine';
import { UserRole, AuthUser } from '../lib/types';

interface NavbarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
  onRoleChange?: (role: UserRole) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onTabChange, currentUser, onLogout, onRoleChange }) => {
  const [role, setRole] = useState<UserRole>(currentUser?.role || StorageEngine.getCurrentRole());

  const handleRoleSwitch = (newRole: UserRole) => {
    setRole(newRole);
    const settings = StorageEngine.getSettings();
    settings.currentUserRole = newRole;
    StorageEngine.saveSettings(settings);
    if (currentUser) {
      const updatedUser = { ...currentUser, role: newRole };
      StorageEngine.setCurrentUser(updatedUser);
    }
    if (onRoleChange) onRoleChange(newRole);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 text-slate-800 px-4 lg:px-8 py-3 flex items-center justify-between shadow-md select-none">
      {/* Brand Title & Logo */}
      <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onTabChange('dashboard')}>
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 flex items-center justify-center shadow-md shadow-indigo-500/25">
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900 flex items-center space-x-2">
            <span>PLANT ENGINEERING AUDIT PORTAL</span>
          </h1>
          <p className="text-[10px] text-slate-400 font-bold tracking-wide uppercase">Borosil Renewables Ltd.</p>
        </div>
      </div>

      {/* Navigation Right Side Controls */}
      <div className="flex items-center space-x-2.5">
        {/* Logged-In User Information */}
        {currentUser && (
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="w-7 h-7 rounded-xl bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center shadow-inner">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="text-left">
              <div className="text-xs font-extrabold text-slate-800 leading-tight truncate max-w-[120px] md:max-w-[160px]">
                {currentUser.name}
              </div>
              <div className="text-[10px] text-slate-400 font-medium leading-tight truncate max-w-[120px] md:max-w-[160px]">
                {currentUser.email}
              </div>
            </div>
          </div>
        )}

        {/* Assigned Role Badge */}
        <div className="flex items-center space-x-1.5 bg-indigo-50/80 px-2.5 py-1 rounded-xl border border-indigo-200 text-xs font-extrabold text-indigo-900">
          <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
          <span>{currentUser?.role || role}</span>
        </div>

        {/* Quick New Audit Button */}
        {role !== 'Viewer' && (
          <button
            onClick={() => onTabChange('new-audit')}
            className="flex items-center space-x-1.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-md shadow-indigo-500/20 transition active:scale-95 shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>New Audit</span>
          </button>
        )}

        {/* Logout Button */}
        {onLogout && (
          <button
            onClick={onLogout}
            title="Sign out of Borosil Portal"
            className="p-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 rounded-xl transition border border-slate-200 shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
