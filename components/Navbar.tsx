'use client';

import React, { useState } from 'react';
import { ShieldCheck, RefreshCw, UserCheck, Database, CheckCircle2 } from 'lucide-react';
import { StorageEngine } from '../lib/storageEngine';
import { GasBackendClient } from '../lib/gasBackend';
import { UserRole } from '../lib/types';

interface NavbarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onRoleChange?: (role: UserRole) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onTabChange, onRoleChange }) => {
  const [role, setRole] = useState<UserRole>(StorageEngine.getCurrentRole());
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string>('');

  const handleRoleSwitch = (newRole: UserRole) => {
    setRole(newRole);
    const settings = StorageEngine.getSettings();
    settings.currentUserRole = newRole;
    StorageEngine.saveSettings(settings);
    if (onRoleChange) onRoleChange(newRole);
  };

  const handleSyncMasterData = async () => {
    setSyncing(true);
    setSyncMessage('Syncing Google Sheets Master Data...');
    try {
      const checkpoints = await GasBackendClient.syncMasterData();
      setSyncMessage(`✓ Synced ${checkpoints.length} Checkpoints!`);
      setTimeout(() => setSyncMessage(''), 4000);
    } catch (err: any) {
      setSyncMessage('⚠️ Sheet sync offline (using cached master)');
      setTimeout(() => setSyncMessage(''), 4000);
    } finally {
      setSyncing(false);
    }
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
          <p className="text-xs font-semibold text-slate-500">
            Multi-Section Equipment Health &amp; Quality System
          </p>
        </div>
      </div>

      {/* Center Sync Status Banner */}
      {syncMessage && (
        <div className="hidden md:flex items-center space-x-2 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-xl text-xs font-bold text-indigo-700 animate-fade-in">
          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
          <span>{syncMessage}</span>
        </div>
      )}

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

        {/* Sync Master Data Button */}
        <button
          onClick={handleSyncMasterData}
          disabled={syncing}
          className="hidden sm:flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs border border-slate-200 transition"
          title="Sync Master Data from Google Sheets"
        >
          <Database className={`w-3.5 h-3.5 text-indigo-600 ${syncing ? 'animate-spin' : ''}`} />
          <span>{syncing ? 'Syncing...' : 'Sync Master'}</span>
        </button>

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
