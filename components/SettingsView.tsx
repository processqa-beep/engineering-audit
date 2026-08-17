'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Settings,
  HardDrive,
  Check,
  RefreshCw,
  Send,
  AlertCircle,
  Mail,
  Users,
  UserPlus,
  Edit2,
  Trash2,
  Search,
  Filter,
  ToggleLeft,
  ToggleRight,
  X,
  UserCheck,
  Shield,
  Building,
  AtSign,
  Tag,
  Clock,
} from 'lucide-react';
import { StorageEngine } from '../lib/storageEngine';
import { GasBackendClient } from '../lib/gasBackend';
import { SystemSettings, Employee, UserRole, EmailParticipationType } from '../lib/types';

const DEPARTMENTS = [
  'Process QA',
  'Maintenance',
  'Engineering',
  'Electrical',
  'Production',
  'Quality Control',
  'Utilities',
  'Stores & Spares',
  'EHS / Safety',
];

const ROLES: UserRole[] = ['Admin', 'Engineering', 'QA', 'Auditor', 'Viewer'];

const SECTIONS = [
  { id: 'ALL', name: 'All Sections (Entire Plant)' },
  { id: 'GR', name: 'Grinding Section' },
  { id: 'RO', name: 'Robot Section' },
  { id: 'WS', name: 'Washing Section' },
  { id: 'TP', name: 'Tempering Section' },
  { id: 'CT', name: 'Cutting Section' },
  { id: 'AN', name: 'Annealing Section' },
  { id: 'PK', name: 'Packing Section' },
  { id: 'UT', name: 'Utilities Section' },
];

// ──────────────────────────────────────────────────────────────────────────────
// ADD / EDIT USER MODAL
// ──────────────────────────────────────────────────────────────────────────────
interface UserModalProps {
  user: Partial<Employee> | null;
  onClose: () => void;
  onSave: (user: Partial<Employee>) => void;
}

const UserModal: React.FC<UserModalProps> = ({ user, onClose, onSave }) => {
  const isEditing = !!user?.id;
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [role, setRole] = useState<UserRole>(user?.role || 'Auditor');
  const [department, setDepartment] = useState(user?.department || 'Process QA');
  const [customDept, setCustomDept] = useState('');
  const [emailParticipation, setEmailParticipation] = useState<EmailParticipationType>(user?.emailParticipation || 'TO');
  const [sectionScope, setSectionScope] = useState(user?.sectionScope || 'ALL');
  const [triggerOn, setTriggerOn] = useState<'ANY_NG' | 'CRITICAL_ONLY' | 'ALL_AUDITS'>(user?.triggerOn || 'ANY_NG');
  const [active, setActive] = useState(user?.active !== false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a user name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      alert('Please enter a valid email address.');
      return;
    }

    const finalDept = department === 'CUSTOM' ? (customDept.trim() || 'General') : department;

    onSave({
      id: user?.id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
      department: finalDept,
      emailParticipation,
      sectionScope,
      triggerOn,
      active,
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-wide">
                {isEditing ? 'EDIT USER & EMAIL ROUTING' : 'ADD NEW USER & ASSIGN ROLES'}
              </h3>
              <p className="text-[11px] text-indigo-200 font-medium">
                Configure role permissions, department, and alert notification participation.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-white/20 transition text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 flex items-center space-x-1">
                <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>Full Name *</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Mehul Chikhaliya"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 font-semibold focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Email Address */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 flex items-center space-x-1">
                <AtSign className="w-3.5 h-3.5 text-indigo-600" />
                <span>Email Address *</span>
              </label>
              <input
                type="email"
                required
                placeholder="e.g. mehul.chikhaliya@borosil.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 font-semibold focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Role */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 flex items-center space-x-1">
                <Shield className="w-3.5 h-3.5 text-indigo-600" />
                <span>System Role *</span>
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 font-semibold focus:border-indigo-500 focus:outline-none"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Department */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 flex items-center space-x-1">
                <Building className="w-3.5 h-3.5 text-indigo-600" />
                <span>Department *</span>
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 font-semibold focus:border-indigo-500 focus:outline-none"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
                <option value="CUSTOM">+ Other Department</option>
              </select>
            </div>
          </div>

          {department === 'CUSTOM' && (
            <div className="space-y-1 animate-fade-in">
              <label className="font-bold text-slate-700">Enter Custom Department Name</label>
              <input
                type="text"
                placeholder="e.g. Automation & Instrumentation"
                value={customDept}
                onChange={(e) => setCustomDept(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 font-semibold focus:border-indigo-500 focus:outline-none"
              />
            </div>
          )}

          {/* Email Assignment & Routing Scope */}
          <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-3">
            <h4 className="font-extrabold text-indigo-900 text-xs flex items-center space-x-1.5">
              <Mail className="w-4 h-4 text-indigo-600" />
              <span>Deviation Alert Email Routing (TO / CC Participation)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Participation Type */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block text-[11px]">Email Participation</label>
                <select
                  value={emailParticipation}
                  onChange={(e) => setEmailParticipation(e.target.value as EmailParticipationType)}
                  className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 font-bold focus:border-indigo-500 focus:outline-none text-xs"
                >
                  <option value="TO">TO (Action Owner)</option>
                  <option value="CC">CC (Notification Copy)</option>
                  <option value="NONE">NONE (No Emails)</option>
                </select>
              </div>

              {/* Section Scope */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block text-[11px]">Section Scope</label>
                <select
                  value={sectionScope}
                  onChange={(e) => setSectionScope(e.target.value)}
                  className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 font-bold focus:border-indigo-500 focus:outline-none text-xs"
                >
                  {SECTIONS.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Trigger Condition */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block text-[11px]">Alert Condition</label>
                <select
                  value={triggerOn}
                  onChange={(e) => setTriggerOn(e.target.value as any)}
                  className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 font-bold focus:border-indigo-500 focus:outline-none text-xs"
                >
                  <option value="ANY_NG">Any NG Finding</option>
                  <option value="CRITICAL_ONLY">Critical Deviations Only</option>
                  <option value="ALL_AUDITS">All Audits</option>
                </select>
              </div>
            </div>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="font-extrabold text-slate-800 text-xs">User Account Status</p>
              <p className="text-[11px] text-slate-500">Active users can perform audits and receive configured email alerts.</p>
            </div>
            <button
              type="button"
              onClick={() => setActive(!active)}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition ${
                active
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
              <span>{active ? 'Active' : 'Inactive'}</span>
            </button>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center space-x-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{isEditing ? 'Update User' : 'Add User'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// MAIN SETTINGS VIEW WITH USER MANAGEMENT
// ──────────────────────────────────────────────────────────────────────────────
export const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>(() => StorageEngine.getSettings());
  const [employees, setEmployees] = useState<Employee[]>(() => StorageEngine.getEmployees());

  // User Management Modal & Filters
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<Employee> | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('ALL');
  const [filterParticipation, setFilterParticipation] = useState('ALL');

  const [testEmailAddr, setTestEmailAddr] = useState<string>('mehul.chikhaliya@borosil.com');
  const [savedMessage, setSavedMessage] = useState<string>('');
  const [pingResult, setPingResult] = useState<{ testing: boolean; message?: string; error?: string } | null>(null);
  const [emailTestResult, setEmailTestResult] = useState<{ sending: boolean; message?: string; error?: string } | null>(null);
  const [diagLogs, setDiagLogs] = useState<{ step: string; status: 'running'|'ok'|'error'|'warn'; detail: string }[]>([]);
  const [diagRunning, setDiagRunning] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    StorageEngine.saveSettings(settings);
    setSavedMessage('Settings successfully saved to local browser storage.');
    setTimeout(() => setSavedMessage(''), 4000);
  };

  const handleResetDemo = () => {
    if (confirm('Are you sure you want to reset all data back to DEMO state? Any unsaved local edits will be replaced.')) {
      StorageEngine.initializeDemoData(true);
      window.location.reload();
    }
  };

  const handleOpenAddUser = () => {
    setEditingUser({
      name: '',
      email: '',
      role: 'Auditor',
      department: 'Process QA',
      emailParticipation: 'TO',
      sectionScope: 'ALL',
      triggerOn: 'ANY_NG',
      active: true,
    });
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (emp: Employee) => {
    setEditingUser(emp);
    setIsUserModalOpen(true);
  };

  const handleSaveUser = (userData: Partial<Employee>) => {
    const now = new Date().toISOString();
    let updatedList: Employee[];

    if (userData.id) {
      // Edit existing
      updatedList = employees.map((emp) =>
        emp.id === userData.id
          ? ({ ...emp, ...userData, updatedAt: now } as Employee)
          : emp
      );
    } else {
      // Add new
      const newEmp: Employee = {
        id: `EMP-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        name: userData.name || 'User',
        email: userData.email || '',
        role: userData.role || 'Auditor',
        department: userData.department || 'Process QA',
        emailParticipation: userData.emailParticipation || 'TO',
        sectionScope: userData.sectionScope || 'ALL',
        triggerOn: userData.triggerOn || 'ANY_NG',
        active: userData.active !== false,
        createdAt: now,
        updatedAt: now,
      };
      updatedList = [newEmp, ...employees];
    }

    setEmployees(updatedList);
    StorageEngine.saveEmployees(updatedList);
    setIsUserModalOpen(false);
    setEditingUser(null);
    setSavedMessage(`User "${userData.name}" successfully saved.`);
    setTimeout(() => setSavedMessage(''), 4000);
  };

  const handleDeleteUser = (emp: Employee) => {
    if (!confirm(`Are you sure you want to delete user "${emp.name}" (${emp.email})?`)) return;
    const updatedList = employees.filter((e) => e.id !== emp.id);
    setEmployees(updatedList);
    StorageEngine.saveEmployees(updatedList);
    setSavedMessage(`User "${emp.name}" removed.`);
    setTimeout(() => setSavedMessage(''), 4000);
  };

  const handleToggleActive = (emp: Employee) => {
    const updatedList = employees.map((e) =>
      e.id === emp.id ? { ...e, active: !e.active, updatedAt: new Date().toISOString() } : e
    );
    setEmployees(updatedList);
    StorageEngine.saveEmployees(updatedList);
  };

  const handleTestConnection = async () => {
    const url = settings.googleAppsScriptUrl?.trim();
    if (!url) {
      setPingResult({ testing: false, error: 'Please enter a Google Apps Script Web App URL first.' });
      return;
    }
    setPingResult({ testing: true });
    const res = await GasBackendClient.pingEndpoint();
    if (res.success) {
      setPingResult({ testing: false, message: res.message });
    } else {
      setPingResult({ testing: false, error: res.message });
    }
  };

  const runFullDiagnostic = async () => {
    const url = (StorageEngine.getSettings().googleAppsScriptUrl || '').trim();
    if (!url || !url.startsWith('https://script.google.com/')) {
      setDiagLogs([{ step: 'Setup', status: 'error', detail: 'Apps Script URL not set or invalid. Save your settings first.' }]);
      return;
    }

    setDiagRunning(true);
    const logs: typeof diagLogs = [];
    const addLog = (step: string, status: typeof logs[0]['status'], detail: string) => {
      logs.push({ step, status, detail });
      setDiagLogs([...logs]);
    };

    const call = async (action: string, extraParams: Record<string,string> = {}) => {
      return new Promise<any>((resolve) => {
        const cb = 'diag_' + Date.now() + '_' + Math.floor(Math.random()*9999);
        const timer = setTimeout(() => {
          delete (window as any)[cb];
          document.getElementById(cb)?.remove();
          resolve({ status: 'TIMEOUT', message: 'No response after 15s. Check network / GAS deployment.' });
        }, 15000);
        (window as any)[cb] = (res: any) => {
          clearTimeout(timer);
          delete (window as any)[cb];
          document.getElementById(cb)?.remove();
          resolve(res);
        };
        const sheetIdParam = (settings.googleSheetId || '').trim();
        const qs = Object.entries({ ...extraParams, action, ...(sheetIdParam ? { sheetId: sheetIdParam } : {}), callback: cb, _t: String(Date.now()) })
          .map(([k,v]) => encodeURIComponent(k)+'='+encodeURIComponent(v)).join('&');
        const s = document.createElement('script');
        s.id = cb;
        s.src = url + (url.includes('?') ? '&' : '?') + qs;
        s.onerror = () => { clearTimeout(timer); delete (window as any)[cb]; resolve({ status: 'NETWORK_ERROR', message: 'Script tag load failed. Check URL.' }); };
        document.body.appendChild(s);
      });
    };

    addLog('Step 1: PING', 'running', 'Testing basic connection…');
    const ping = await call('PING');
    if (ping?.status === 'SUCCESS') {
      addLog('Step 1: PING', 'ok', `✅ Connected. Sheet: "${ping.sheetName}"`);
    } else {
      addLog('Step 1: PING', 'error', `❌ ${ping?.status}: ${ping?.message || 'No response'}`);
      setDiagRunning(false);
      return;
    }

    addLog('Step 2: AUDIT_HEADER', 'running', 'Sending test header…');
    const testHeader = {
      auditId: 'DIAG-TEST-' + Date.now(),
      date: new Date().toISOString().substring(0,10),
      time: new Date().toTimeString().substring(0,5),
      sectionName: 'Diagnostic Test',
      subSectionName: 'Test',
      lineName: 'Test Line',
      equipmentName: 'Test Equipment',
      auditorName: 'Diagnostic Tool',
      totalCheckpoints: 2, okCount: 1, ngCount: 1, obsCount: 0, naCount: 0,
      compliancePercent: 50,
      overallStatus: 'FAIL'
    };
    const headerRes = await call('AUDIT_HEADER', { payload: JSON.stringify(testHeader) });
    if (headerRes?.status === 'SUCCESS') {
      addLog('Step 2: AUDIT_HEADER', 'ok', `✅ Row added to Audit_Master.`);
    } else {
      addLog('Step 2: AUDIT_HEADER', 'error', `❌ ${headerRes?.status}: ${headerRes?.message}`);
      setDiagRunning(false);
      return;
    }

    addLog('Summary', 'ok', '🎉 Diagnostic complete.');
    setDiagRunning(false);
  };

  const handleSendTestEmail = async () => {
    const url = settings.googleAppsScriptUrl?.trim();
    if (!url) {
      setEmailTestResult({ sending: false, error: 'Please enter a Google Apps Script Web App URL first.' });
      return;
    }
    if (!testEmailAddr.trim()) {
      setEmailTestResult({ sending: false, error: 'Please enter a target email address.' });
      return;
    }

    setEmailTestResult({ sending: true });
    const res = await GasBackendClient.sendTestEmail(testEmailAddr.trim());
    setEmailTestResult({
      sending: false,
      message: res ? `Test email dispatched to ${testEmailAddr}!` : 'Email dispatch failed. Verify Apps Script URL.',
    });
  };

  // Filtered Users list
  const filteredEmployees = employees.filter((emp) => {
    const q = userSearch.toLowerCase().trim();
    if (filterDepartment !== 'ALL' && emp.department !== filterDepartment) return false;
    if (filterParticipation !== 'ALL' && (emp.emailParticipation || 'NONE') !== filterParticipation) return false;
    if (q) {
      return (
        emp.name.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q) ||
        emp.department.toLowerCase().includes(q) ||
        emp.role.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 animate-fade-in font-sans">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-300/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            <span>SYSTEM SETTINGS &amp; USER MANAGEMENT</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-semibold">
            Manage users, departments, roles, and automated deviation email routing (TO / CC).
          </p>
        </div>

        <button
          onClick={handleResetDemo}
          className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-2xl text-xs font-bold transition border border-slate-200"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset Sample Demo Data</span>
        </button>
      </div>

      {savedMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-2xl text-xs font-bold flex items-center space-x-2 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{savedMessage}</span>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. USER MANAGEMENT SECTION */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-300/40 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <span>USER MANAGEMENT &amp; EMAIL ROUTING TABLE</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-semibold">
              Assign roles, departments, and specify who receives deviation emails as <strong>TO (Action Owner)</strong> or <strong>CC (Supervisor Copy)</strong>.
            </p>
          </div>

          <button
            onClick={handleOpenAddUser}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-extrabold text-xs shadow-md shadow-indigo-500/20 transition self-start sm:self-auto shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add User</span>
          </button>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs font-bold">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search user name, email, role, or department..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-3.5 py-2 text-xs font-semibold focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Department Filter */}
            <div className="flex items-center space-x-1 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="bg-transparent text-slate-700 font-bold focus:outline-none"
              >
                <option value="ALL">All Departments</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Email Participation Filter */}
            <div className="flex items-center space-x-1 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filterParticipation}
                onChange={(e) => setFilterParticipation(e.target.value)}
                className="bg-transparent text-slate-700 font-bold focus:outline-none"
              >
                <option value="ALL">All Email Roles</option>
                <option value="TO">TO (Action Owner)</option>
                <option value="CC">CC (Notification Copy)</option>
                <option value="NONE">NONE (No Emails)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/90 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">User / Name &amp; Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Email Assignment</th>
                <th className="px-4 py-3">Section Scope</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400 font-semibold">
                    No users found matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const part = emp.emailParticipation || 'NONE';
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/80 transition group">
                      <td className="px-4 py-3">
                        <div className="font-extrabold text-slate-900">{emp.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono flex items-center space-x-1 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{emp.email}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold border ${
                          emp.role === 'Admin'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : emp.role === 'QA'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : emp.role === 'Engineering'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {emp.role}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-semibold text-slate-700">
                        {emp.department}
                      </td>

                      <td className="px-4 py-3">
                        {part === 'TO' && (
                          <span className="inline-flex items-center space-x-1 bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-md font-extrabold text-[10px]">
                            <span className="font-black">TO</span>
                            <span>(Action Owner)</span>
                          </span>
                        )}
                        {part === 'CC' && (
                          <span className="inline-flex items-center space-x-1 bg-purple-100 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-md font-extrabold text-[10px]">
                            <span className="font-black">CC</span>
                            <span>(Copy / Lead)</span>
                          </span>
                        )}
                        {part === 'NONE' && (
                          <span className="inline-block bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-md font-semibold text-[10px]">
                            No Emails
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-slate-600 font-semibold">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                          {emp.sectionScope === 'ALL' || !emp.sectionScope ? 'All Sections' : emp.sectionScope}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(emp)}
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition ${
                            emp.active
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {emp.active ? <Check className="w-3 h-3 text-emerald-700" /> : <X className="w-3 h-3 text-slate-400" />}
                          <span>{emp.active ? 'Active' : 'Inactive'}</span>
                        </button>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handleOpenEditUser(emp)}
                            className="p-1.5 bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-700 rounded-xl transition"
                            title="Edit User"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(emp)}
                            className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 rounded-xl transition"
                            title="Delete User"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 2. GOOGLE APPS SCRIPT / CLOUD INTEGRATION SETTINGS */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <form onSubmit={handleSave} className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-300/40 space-y-4">
        <h3 className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider flex items-center space-x-2">
          <HardDrive className="w-4 h-4" />
          <span>Google Apps Script Web App Deployment URL</span>
        </h3>

        <div className="space-y-3 text-xs">
          <div>
            <label className="text-slate-700 font-bold block mb-1">
              Live Google Apps Script Web App Endpoint
            </label>
            <input
              type="text"
              placeholder="https://script.google.com/macros/s/AKfycb.../exec"
              value={settings.googleAppsScriptUrl}
              onChange={(e) => setSettings({ ...settings, googleAppsScriptUrl: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 text-xs font-mono font-semibold focus:border-indigo-500 focus:outline-none mb-3"
            />

            {/* Test Email Row */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="text-xs text-slate-700 font-extrabold shrink-0">Test Target Email:</label>
              <input
                type="email"
                value={testEmailAddr}
                onChange={(e) => setTestEmailAddr(e.target.value)}
                placeholder="mehul.chikhaliya@borosil.com"
                className="flex-1 bg-white border border-slate-200 text-slate-900 rounded-lg px-3 py-1.5 text-xs font-mono font-semibold focus:outline-none"
              />
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={pingResult?.testing}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{pingResult?.testing ? 'Pinging...' : 'Ping Connection'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={emailTestResult?.sending}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{emailTestResult?.sending ? 'Sending...' : 'Send Test Email'}</span>
                </button>
              </div>
            </div>
          </div>

          {pingResult?.message && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{pingResult.message}</span>
            </div>
          )}

          {pingResult?.error && (
            <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl text-xs font-bold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>{pingResult.error}</span>
            </div>
          )}

          {emailTestResult?.message && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{emailTestResult.message}</span>
            </div>
          )}

          {emailTestResult?.error && (
            <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl text-xs font-bold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>{emailTestResult.error}</span>
            </div>
          )}

          {/* Diagnostic Panel */}
          <div className="mt-4 p-4 bg-slate-900 rounded-2xl border border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-extrabold text-white">🔬 Google Apps Script Diagnostic Test</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Tests PING and Sheet connectivity step by step.</p>
              </div>
              <button
                type="button"
                onClick={runFullDiagnostic}
                disabled={diagRunning}
                className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center space-x-2 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${diagRunning ? 'animate-spin' : ''}`} />
                <span>{diagRunning ? 'Running…' : 'Run Diagnostic'}</span>
              </button>
            </div>

            {diagLogs.length > 0 && (
              <div className="space-y-1.5 mt-2 font-mono text-[11px]">
                {diagLogs.map((log, i) => (
                  <div
                    key={i}
                    className={`flex items-start space-x-2 px-3 py-2 rounded-lg ${
                      log.status === 'ok'      ? 'bg-emerald-900/60 text-emerald-300' :
                      log.status === 'error'   ? 'bg-rose-900/60 text-rose-300' :
                      log.status === 'warn'    ? 'bg-amber-900/60 text-amber-300' :
                      'bg-slate-800 text-slate-300'
                    }`}
                  >
                    <span className="shrink-0 font-bold min-w-[140px] text-slate-200">{log.step}</span>
                    <span className="break-all">{log.detail}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-slate-700 font-bold block mb-1">Company / Organization Name</label>
              <input
                type="text"
                value={settings.companyName}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-xs font-semibold focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-700 font-bold block mb-1">Main Google Drive Folder Name</label>
              <input
                type="text"
                placeholder="Engineering Audit System"
                value={settings.googleDriveFolderId}
                onChange={(e) => setSettings({ ...settings, googleDriveFolderId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-xs font-semibold focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-indigo-500/20 transition"
          >
            Save System Settings
          </button>
        </div>
      </form>

      {/* User Add / Edit Modal */}
      {isUserModalOpen && (
        <UserModal
          user={editingUser}
          onClose={() => {
            setIsUserModalOpen(false);
            setEditingUser(null);
          }}
          onSave={handleSaveUser}
        />
      )}
    </div>
  );
};
