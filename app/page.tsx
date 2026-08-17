'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { DashboardView } from '../components/DashboardView';
import { NewAuditForm } from '../components/NewAuditForm';
import { ActionTrackingView } from '../components/ActionTrackingView';
import { AuditHistoryView } from '../components/AuditHistoryView';
import { MailConfigView } from '../components/MailConfigView';
import { DraftsView } from '../components/DraftsView';
import { SettingsView } from '../components/SettingsView';
import { AuditPointSetupView } from '../components/AuditPointSetupView';
import { PlantStructurePanel } from '../components/PlantStructurePanel';
import { StorageEngine } from '../lib/storageEngine';
import {
  LayoutDashboard,
  ClipboardPlus,
  AlertOctagon,
  History,
  Settings,
  CheckSquare,
  Mail,
  Save,
  FileSpreadsheet,
} from 'lucide-react';


export default function Home() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [openActionCount, setOpenActionCount] = useState<number>(0);
  const [activeDraft, setActiveDraft] = useState<any>(null);

  useEffect(() => {
    StorageEngine.initializeDemoData();
    const actions = StorageEngine.getActions();
    const openCount = actions.filter((a) => a.status === 'Open' || a.status === 'In Progress').length;
    setOpenActionCount(openCount);

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam && ['dashboard', 'new-audit', 'actions', 'history', 'master', 'checkpoint-setup', 'settings'].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
  }, [activeTab]);

  const handleResumeDraft = (draft: any) => {
    setActiveDraft(draft);
    setActiveTab('new-audit');
  };

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-slate-200/60 flex flex-col font-sans text-slate-800">
      {/* Fixed Top Navbar */}
      <Navbar currentTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 flex overflow-hidden">
        {/* Fixed Desktop Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          openActionCount={openActionCount}
        />

        {/* Scrollable Main Content Area */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && <DashboardView onNavigate={setActiveTab} />}
          {activeTab === 'new-audit' && (
            <NewAuditForm
              initialDraft={activeDraft}
              onNavigate={setActiveTab}
              onSuccess={(auditId) => {
                setActiveDraft(null);
                setActiveTab('audits');
              }}
              onCancel={() => {
                setActiveDraft(null);
                setActiveTab('dashboard');
              }}
            />
          )}
          {activeTab === 'drafts' && <DraftsView onResumeDraft={handleResumeDraft} />}
          {activeTab === 'actions' && <ActionTrackingView onNavigate={setActiveTab} />}
          {activeTab === 'audits' && <AuditHistoryView />}
          {activeTab === 'audit-point-setup' && <AuditPointSetupView />}
          {activeTab === 'plant-structure' && (
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-300/40">
                <h2 className="text-lg font-extrabold text-slate-900 mb-1">Plant Structure Settings</h2>
                <p className="text-xs text-slate-500 font-semibold">Manage your plant hierarchy — Sections, Sub-Sections, and Lines / Machines.</p>
              </div>
              <PlantStructurePanel />
            </div>
          )}
          {activeTab === 'mail' && <MailConfigView />}
          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 flex items-center justify-around py-2 px-1 text-slate-600 shadow-lg select-none">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-bold transition ${
            activeTab === 'dashboard' ? 'text-indigo-600' : 'hover:text-slate-900'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('new-audit')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-bold transition ${
            activeTab === 'new-audit' ? 'text-indigo-600' : 'hover:text-slate-900'
          }`}
        >
          <ClipboardPlus className="w-5 h-5 mb-0.5 text-indigo-600" />
          <span>Audit</span>
        </button>

        <button
          onClick={() => setActiveTab('drafts')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-bold transition ${
            activeTab === 'drafts' ? 'text-indigo-600' : 'hover:text-slate-900'
          }`}
        >
          <Save className="w-5 h-5 mb-0.5 text-amber-600" />
          <span>Drafts</span>
        </button>

        <button
          onClick={() => setActiveTab('audit-point-setup')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-bold transition ${
            activeTab === 'audit-point-setup' ? 'text-indigo-600' : 'hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-5 h-5 mb-0.5 text-emerald-600" />
          <span>Setup</span>
        </button>

        <button
          onClick={() => setActiveTab('actions')}
          className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-bold transition ${
            activeTab === 'actions' ? 'text-indigo-600' : 'hover:text-slate-900'
          }`}
        >
          <AlertOctagon className="w-5 h-5 mb-0.5 text-rose-600" />
          <span>Actions</span>
          {openActionCount > 0 && (
            <span className="absolute top-1 right-2 w-4 h-4 rounded-full bg-rose-600 text-white font-bold text-[9px] flex items-center justify-center">
              {openActionCount}
            </span>
          )}
        </button>
      </nav>
    </div>
  );
}
