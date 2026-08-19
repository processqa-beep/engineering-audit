'use client';

import React, { useState, useMemo } from 'react';
import {
  Mail,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Send,
  Users,
  ShieldAlert,
  Search,
  Filter,
  Check,
  X,
  BellRing,
} from 'lucide-react';
import { StorageEngine } from '../lib/storageEngine';
import { MailConfig, Section, Line } from '../lib/types';

export const MailConfigView: React.FC = () => {
  const [configs, setConfigs] = useState<MailConfig[]>(() => StorageEngine.getMailConfigs());
  const sections = useMemo(() => StorageEngine.getSections(), []);
  const lines = useMemo(() => StorageEngine.getLines(), []);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sectionFilter, setSectionFilter] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingConfig, setEditingConfig] = useState<MailConfig | null>(null);
  const [recName, setRecName] = useState<string>('');
  const [recEmail, setRecEmail] = useState<string>('');
  const [recRole, setRecRole] = useState<string>('Maintenance Engineer');
  const [recSecId, setRecSecId] = useState<string>('GR');
  const [recLineId, setRecLineId] = useState<string>('TL-4');
  const [recTrigger, setRecTrigger] = useState<'CRITICAL_ONLY' | 'ANY_NG' | 'ALL_AUDITS'>('ANY_NG');

  const [testSentMessage, setTestSentMessage] = useState<string>('');

  const filteredConfigs = useMemo(() => {
    return configs.filter((c) => {
      if (sectionFilter !== 'ALL' && c.sectionId !== sectionFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const text = `${c.recipientName} ${c.email} ${c.role} ${c.sectionId}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [configs, sectionFilter, searchQuery]);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recName.trim() || !recEmail.trim()) return;

    const newCfg: MailConfig = {
      id: editingConfig ? editingConfig.id : `MAIL-${Date.now().toString().slice(-4)}`,
      sectionId: recSecId,
      lineId: recLineId,
      recipientName: recName.trim(),
      email: recEmail.trim(),
      role: recRole,
      triggerOn: recTrigger,
      active: true,
    };

    let updated: MailConfig[];
    if (editingConfig) {
      updated = configs.map((c) => (c.id === editingConfig.id ? newCfg : c));
    } else {
      updated = [...configs, newCfg];
    }

    setConfigs(updated);
    StorageEngine.saveMailConfigs(updated);
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setEditingConfig(null);
    setRecName('');
    setRecEmail('');
    setRecRole('Maintenance Engineer');
    setRecSecId('GR');
    setRecLineId('TL-4');
    setRecTrigger('ANY_NG');
  };

  const handleEdit = (c: MailConfig) => {
    setEditingConfig(c);
    setRecName(c.recipientName);
    setRecEmail(c.email);
    setRecRole(c.role);
    setRecSecId(c.sectionId);
    setRecLineId(c.lineId);
    setRecTrigger(c.triggerOn);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Remove this email notification recipient?')) {
      const updated = configs.filter((c) => c.id !== id);
      setConfigs(updated);
      StorageEngine.saveMailConfigs(updated);
    }
  };

  const handleToggleActive = (id: string) => {
    const updated = configs.map((c) => (c.id === id ? { ...c, active: !c.active } : c));
    setConfigs(updated);
    StorageEngine.saveMailConfigs(updated);
  };

  const handleTestEmail = (email: string) => {
    setTestSentMessage(`Test alert triggered for ${email}!`);
    setTimeout(() => setTestSentMessage(''), 4000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-fade-in">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
            <Mail className="w-5 h-5 text-indigo-600" />
            <span>EMAIL DEVIATION NOTIFICATIONS & RECIPIENTS</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure automatic email alert rules sent to engineers and leads when audit deviations or NG findings occur.
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="flex items-center space-x-1.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-md shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Add Recipient</span>
        </button>
      </div>

      {testSentMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-2xl text-xs font-bold flex items-center space-x-2 animate-fade-in">
          <BellRing className="w-4 h-4 text-emerald-600" />
          <span>{testSentMessage}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold block">Configured Recipients</span>
            <span className="text-xl font-extrabold text-slate-900">{configs.length} Persons</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold block">Deviation Trigger Rules</span>
            <span className="text-xl font-extrabold text-rose-600">Auto NG / Critical Alert</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold block">Mailer Engine</span>
            <span className="text-xl font-extrabold text-emerald-600">Google Apps Script Mail</span>
          </div>
        </div>
      </div>

      {/* Recipient Configuration Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-md space-y-4 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
            Email Recipient Routing Table ({filteredConfigs.length})
          </h3>

          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search recipient or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs font-semibold focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center space-x-1 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                className="bg-transparent text-slate-700 focus:outline-none font-semibold"
              >
                <option value="ALL">All Sections</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-extrabold border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Recipient Name</th>
                <th className="px-4 py-3">Email Address</th>
                <th className="px-4 py-3">Role / Designation</th>
                <th className="px-4 py-3">Section Scope</th>
                <th className="px-4 py-3">Alert Trigger Condition</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {filteredConfigs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No matching recipient configurations found.
                  </td>
                </tr>
              ) : (
                filteredConfigs.map((cfg) => (
                  <tr key={cfg.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-extrabold text-slate-900">{cfg.recipientName}</td>
                    <td className="px-4 py-3 font-mono font-bold text-indigo-700">{cfg.email}</td>
                    <td className="px-4 py-3 text-slate-800">{cfg.role}</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-700">
                      {cfg.sectionId} ({cfg.lineId})
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-lg ${
                          cfg.triggerOn === 'CRITICAL_ONLY'
                            ? 'bg-rose-100 text-rose-800'
                            : cfg.triggerOn === 'ANY_NG'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {cfg.triggerOn === 'CRITICAL_ONLY'
                          ? 'Critical NG Only'
                          : cfg.triggerOn === 'ANY_NG'
                          ? 'Any NG Finding'
                          : 'All Audits'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(cfg.id)}
                        className={`px-2.5 py-0.5 text-[10px] font-bold rounded-lg ${
                          cfg.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {cfg.active ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => handleTestEmail(cfg.email)}
                          className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg"
                          title="Send Test Alert"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleEdit(cfg)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                          title="Edit Recipient"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(cfg.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                          title="Delete Recipient"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recipient Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fade-in">
          <form
            onSubmit={handleSaveConfig}
            className="bg-white border border-slate-200 p-6 rounded-2xl max-w-lg w-full space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">
                {editingConfig ? 'Edit Mail Recipient' : 'Add New Deviation Email Recipient'}
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-600 font-semibold">Recipient Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Rajesh Sharma"
                value={recName}
                onChange={(e) => setRecName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-xs font-semibold focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-600 font-semibold">Email Address</label>
              <input
                type="email"
                required
                placeholder="grinding.lead@borosil.com"
                value={recEmail}
                onChange={(e) => setRecEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-xs font-mono font-semibold focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-600 font-semibold">Role / Designation</label>
                <input
                  type="text"
                  placeholder="Maintenance Lead"
                  value={recRole}
                  onChange={(e) => setRecRole(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-xs font-semibold focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-600 font-semibold">Section</label>
                <select
                  value={recSecId}
                  onChange={(e) => setRecSecId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-xs font-semibold"
                >
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.id})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-600 font-semibold">Alert Trigger Rule</label>
              <select
                value={recTrigger}
                onChange={(e) => setRecTrigger(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-xs font-semibold"
              >
                <option value="ANY_NG">Any NG Finding (Recommended)</option>
                <option value="CRITICAL_ONLY">Critical Findings Only</option>
                <option value="ALL_AUDITS">All Audits (Summary)</option>
              </select>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20"
              >
                Save Recipient
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
