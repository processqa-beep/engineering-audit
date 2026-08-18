'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Lock,
  Info,
  KeyRound,
  Mail,
  User,
  Building,
  CheckCircle2,
  UserPlus,
  LogIn,
  Clock,
  PlusCircle,
} from 'lucide-react';
import { StorageEngine } from '../lib/storageEngine';
import { AuthUser, Employee } from '../lib/types';

interface LoginPageProps {
  onLoginSuccess: (user: AuthUser) => void;
}

const DEPARTMENTS = [
  'Instrumentation',
  'Maintenance',
  'Electrical',
  'Production',
  'Quality',
  'Utilities',
  'EHS / Safety',
  'Process QA',
  'Engineering',
  'Stores & Spares',
  'CUSTOM',
];

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [activeMode, setActiveMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Sign In Form State (Starts blank, showing only grey placeholder text)
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');

  // Register / Request Access Form State
  const [regName, setRegName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regDepartment, setRegDepartment] = useState<string>('Instrumentation');
  const [customDept, setCustomDept] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regConfirmPassword, setRegConfirmPassword] = useState<string>('');

  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // ── 1. SIGN IN SUBMISSION ──────────────────────────────────────────────────
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    const cleanEmail = loginEmail.trim().toLowerCase();

    if (!cleanEmail) {
      setErrorMessage('Please enter your Borosil email address.');
      return;
    }

    const isBorosilDomain =
      cleanEmail.endsWith('@borosil.com') ||
      cleanEmail.endsWith('@borosilrenewables.com') ||
      cleanEmail.includes('borosil');

    if (!isBorosilDomain) {
      setErrorMessage('Access Restricted: Please sign in with your official corporate Borosil email (@borosil.com).');
      return;
    }

    if (!loginPassword.trim()) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      const employees = StorageEngine.getEmployees();
      const user = employees.find((emp) => emp.email.toLowerCase() === cleanEmail);

      if (!user) {
        setLoading(false);
        setErrorMessage(
          'Account not found. Please click "Request Access / Create Password" below to register and request Admin approval.'
        );
        return;
      }

      // Check Approval Status
      if (user.status === 'Pending') {
        setLoading(false);
        setErrorMessage(
          '⏳ Access Pending: Your account has been requested and is awaiting Admin role assignment in the portal. You will be able to log in once an Admin approves your account in Settings.'
        );
        return;
      }

      if (user.status === 'Rejected') {
        setLoading(false);
        setErrorMessage('❌ Access Denied: Your account request was not approved by the administrator.');
        return;
      }

      // Verify Password (if user has a password set; fallback to demo password 'borosil123')
      if (user.password && user.password !== loginPassword && loginPassword !== 'borosil123') {
        setLoading(false);
        setErrorMessage('Incorrect password. Please verify your credentials.');
        return;
      }

      const authUser: AuthUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || 'Viewer',
        department: user.department || 'Process QA',
        loginMethod: 'email_password',
        loginAt: new Date().toISOString(),
      };

      StorageEngine.setCurrentUser(authUser);
      setLoading(false);
      onLoginSuccess(authUser);
    }, 400);
  };

  // ── 2. ACCESS REQUEST (REGISTER) SUBMISSION ────────────────────────────────
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!regName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    const cleanEmail = regEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Please enter your official Borosil email address.');
      return;
    }

    const isBorosilDomain =
      cleanEmail.endsWith('@borosil.com') ||
      cleanEmail.endsWith('@borosilrenewables.com') ||
      cleanEmail.includes('borosil');

    if (!isBorosilDomain) {
      setErrorMessage('Access Restricted: Registration requires an official Borosil email address (@borosil.com).');
      return;
    }

    const finalDept = regDepartment === 'CUSTOM' ? (customDept.trim() || 'General / Plant') : regDepartment;

    if (!regPassword.trim() || regPassword.length < 4) {
      setErrorMessage('Please create a password with at least 4 characters.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter your password.');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      const res = StorageEngine.requestAccess(regName, cleanEmail, finalDept, regPassword);

      setLoading(false);
      if (res.success) {
        setSuccessMessage(
          '✅ Access Request Submitted! Your profile has been sent to the System Administrator. Once the Admin reviews and assigns your role in the portal, you will be able to sign in.'
        );
        // Switch back to login mode with blank password
        setLoginEmail(cleanEmail);
        setLoginPassword('');
        setActiveMode('LOGIN');
      } else {
        setErrorMessage(res.message);
      }
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 flex flex-col justify-center items-center p-3 select-none relative overflow-hidden font-sans">
      {/* Background Decorative Glow */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login / Register Card (Compact max-w-sm to fit comfortably on all screens) */}
      <div className="bg-white/95 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in relative z-10 my-auto">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 p-5 text-white text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

          <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mx-auto mb-2 shadow-inner">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>

          <h1 className="text-lg font-black tracking-tight text-white uppercase leading-tight">
            BRL ENGINEERING AUDIT
          </h1>
          <p className="text-xs text-indigo-100 font-bold mt-0.5 tracking-wide">
            Borosil Renewables Ltd.
          </p>
        </div>

        {/* Navigation Tabs between Sign In & Request Access */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 p-1 gap-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setActiveMode('LOGIN');
              setErrorMessage('');
            }}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center space-x-1.5 transition-all text-[11px] ${
              activeMode === 'LOGIN'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80 font-extrabold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode('REGISTER');
              setErrorMessage('');
            }}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center space-x-1.5 transition-all text-[11px] ${
              activeMode === 'REGISTER'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80 font-extrabold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Request Access</span>
          </button>
        </div>

        {/* Card Body */}
        <div className="p-5 space-y-3.5">
          {/* Alerts */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-[11px] font-bold flex items-start space-x-2 animate-shake leading-snug">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-[11px] font-bold flex items-start space-x-2 animate-fade-in leading-snug">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────── */}
          {/* MODE 1: SIGN IN WITH EMAIL & PASSWORD */}
          {/* ────────────────────────────────────────────────────────────── */}
          {activeMode === 'LOGIN' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-3 animate-fade-in">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center space-x-1">
                  <Mail className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Borosil Corporate Email</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="mehul.chikhaliya@borosil.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none transition"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center space-x-1">
                  <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Password</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs shadow-md shadow-indigo-500/20 transition flex items-center justify-center space-x-1.5 active:scale-[0.99] mt-2"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveMode('REGISTER');
                    setErrorMessage('');
                  }}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition"
                >
                  New Borosil employee? Request access &rarr;
                </button>
              </div>
            </form>
          ) : (
            /* ────────────────────────────────────────────────────────────── */
            /* MODE 2: REQUEST ACCESS / CREATE PASSWORD */
            /* ────────────────────────────────────────────────────────────── */
            <form onSubmit={handleRegisterSubmit} className="space-y-2.5 animate-fade-in">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-0.5 flex items-center space-x-1">
                  <User className="w-3 h-3 text-indigo-600" />
                  <span>Full Name *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mehul Chikhaliya"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none transition"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-0.5 flex items-center space-x-1">
                  <Mail className="w-3 h-3 text-indigo-600" />
                  <span>Borosil Email Address *</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="mehul.chikhaliya@borosil.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none transition"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-0.5 flex items-center space-x-1">
                  <Building className="w-3 h-3 text-indigo-600" />
                  <span>Department *</span>
                </label>
                <select
                  value={regDepartment}
                  onChange={(e) => setRegDepartment(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:border-indigo-500 focus:bg-white focus:outline-none"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d === 'CUSTOM' ? '+ Add Other Department (Manual)' : d}
                    </option>
                  ))}
                </select>

                {regDepartment === 'CUSTOM' && (
                  <div className="mt-1.5 animate-fade-in">
                    <input
                      type="text"
                      required
                      placeholder="Type custom department name..."
                      value={customDept}
                      onChange={(e) => setCustomDept(e.target.value)}
                      className="w-full bg-white border border-indigo-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-0.5 flex items-center space-x-1">
                    <KeyRound className="w-3 h-3 text-indigo-600" />
                    <span>Create Password *</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-0.5 flex items-center space-x-1">
                    <KeyRound className="w-3 h-3 text-indigo-600" />
                    <span>Confirm Password *</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-2.5 bg-amber-50/90 border border-amber-200 rounded-xl text-[10px] text-amber-900 font-semibold space-y-0.5">
                <div className="flex items-center space-x-1 font-bold text-amber-900">
                  <Clock className="w-3 h-3 text-amber-700 shrink-0" />
                  <span>Admin Approval Required</span>
                </div>
                <p className="text-[10px] text-amber-800 leading-tight">
                  Once an Admin assigns your role in Settings, you will be able to log in with your password.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs shadow-md shadow-indigo-500/20 transition flex items-center justify-center space-x-1.5 active:scale-[0.99]"
              >
                <span>{loading ? 'Submitting Request...' : 'Submit Access Request to Admin'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="text-center pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveMode('LOGIN');
                    setErrorMessage('');
                  }}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition"
                >
                  Already have an account? Sign In &rarr;
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Card Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center space-y-0.5">
          <p className="text-[10px] text-slate-500 font-medium flex items-center justify-center space-x-1">
            <Info className="w-3 h-3 text-indigo-600 shrink-0" />
            <span>New accounts require Admin approval in System Settings.</span>
          </p>
          <div className="text-[9px] text-slate-400 font-semibold flex items-center justify-center space-x-1">
            <Lock className="w-2.5 h-2.5 text-slate-400" />
            <span>Secured for Borosil Renewables Plant Systems</span>
          </div>
        </div>
      </div>
    </div>
  );
};
