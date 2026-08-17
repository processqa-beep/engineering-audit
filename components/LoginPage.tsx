'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Lock,
  Info,
  X,
  UserPlus,
  CheckCircle2,
} from 'lucide-react';
import { StorageEngine } from '../lib/storageEngine';
import { AuthUser, Employee } from '../lib/types';

interface LoginPageProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [emailInput, setEmailInput] = useState<string>('');
  const [nameInput, setNameInput] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState<boolean>(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState<string>('');
  const [customGoogleName, setCustomGoogleName] = useState<string>('');
  const [showCustomGoogleInput, setShowCustomGoogleInput] = useState<boolean>(false);

  // Pre-configured Borosil Employees
  const registeredEmployees = StorageEngine.getEmployees();

  const handleBorosilAuth = (email: string, fullName?: string) => {
    setErrorMessage('');
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setErrorMessage('Please enter your Borosil email address.');
      return;
    }

    // Corporate Domain Validation: must be @borosil.com or @borosilrenewables.com
    const isBorosilDomain = cleanEmail.endsWith('@borosil.com') || cleanEmail.endsWith('@borosilrenewables.com');
    if (!isBorosilDomain) {
      setErrorMessage('Access Restricted: Please sign in with your official corporate Borosil email (@borosil.com).');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      // 1. Check if user already exists in User Management
      const existingEmployees = StorageEngine.getEmployees();
      const matched = existingEmployees.find((e) => e.email.toLowerCase() === cleanEmail);

      let authUser: AuthUser;

      if (matched) {
        // Log in with existing configured role
        authUser = {
          id: matched.id,
          name: matched.name,
          email: matched.email,
          role: matched.role,
          department: matched.department || 'Process QA',
          loginMethod: 'google',
          loginAt: new Date().toISOString(),
        };
      } else {
        // Auto-register NEW Borosil user as VIEWER
        const derivedName = fullName?.trim() || cleanEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        const newEmployee: Employee = {
          id: `EMP-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
          name: derivedName,
          email: cleanEmail,
          role: 'Viewer', // Default role for new Borosil sign-ins as requested
          department: 'General / Plant',
          emailParticipation: 'NONE',
          sectionScope: 'ALL',
          triggerOn: 'ANY_NG',
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const updatedEmployees = [newEmployee, ...existingEmployees];
        StorageEngine.saveEmployees(updatedEmployees);

        authUser = {
          id: newEmployee.id,
          name: newEmployee.name,
          email: newEmployee.email,
          role: 'Viewer',
          department: newEmployee.department,
          loginMethod: 'google',
          loginAt: new Date().toISOString(),
        };
      }

      StorageEngine.setCurrentUser(authUser);
      setLoading(false);
      setIsGoogleModalOpen(false);
      onLoginSuccess(authUser);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 flex flex-col justify-center items-center p-4 select-none relative overflow-hidden font-sans">
      {/* Background Decorative Rings */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="bg-white/95 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in relative z-10">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 p-8 text-white text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>

          <h1 className="text-2xl font-black tracking-tight text-white uppercase">
            BRL ENGINEERING AUDIT
          </h1>
          <p className="text-sm text-indigo-100 font-bold mt-1 tracking-wide">
            Borosil Renewables Ltd.
          </p>
        </div>

        {/* Login Form Content */}
        <div className="p-7 space-y-6">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-start space-x-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Primary "Sign in with Google" Button */}
          <div>
            <button
              type="button"
              onClick={() => setIsGoogleModalOpen(true)}
              disabled={loading}
              className="w-full bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200 hover:border-indigo-400 font-extrabold py-3.5 px-4 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center space-x-3 text-sm group active:scale-[0.99]"
            >
              {/* Google G Logo SVG */}
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{loading ? 'Authenticating...' : 'Sign in with Google'}</span>
            </button>
          </div>

          {/* Direct Borosil Email Input Section */}
          <div className="space-y-3 pt-1">
            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider relative z-10">
                Or Sign In With Email
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleBorosilAuth(emailInput, nameInput);
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Borosil Corporate Email Address
                </label>
                <input
                  type="email"
                  placeholder="mehul.chikhaliya@borosil.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-semibold focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Full Name (Optional for first-time login)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mehul Chikhaliya"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-semibold focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-extrabold py-2.5 px-4 rounded-2xl text-xs shadow-md shadow-indigo-500/20 transition flex items-center justify-center space-x-1.5"
              >
                <span>Continue to Plant Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Card Footer with Viewer Information */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center space-y-1">
          <p className="text-[11px] text-slate-500 font-medium flex items-center justify-center space-x-1">
            <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>New Borosil accounts automatically open with <strong className="text-indigo-700">Viewer</strong> role.</span>
          </p>
          <div className="text-[10px] text-slate-400 font-semibold flex items-center justify-center space-x-1.5 pt-0.5">
            <Lock className="w-3 h-3 text-slate-400" />
            <span>Roles and permissions can be managed by Admin in Settings</span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* GOOGLE ACCOUNT CHOOSER MODAL (Authentic Google Sign-In Flow) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {isGoogleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 relative animate-scale-up">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-start justify-between">
              <div className="flex items-center space-x-3">
                {/* Google G Logo */}
                <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Sign in with Google</h3>
                  <p className="text-[11px] text-slate-500 font-medium">to continue to <strong>BRL Engineering Audit</strong></p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  setIsGoogleModalOpen(false);
                  setShowCustomGoogleInput(false);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Account Selection List */}
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-700">Choose an account</span>
              </div>

              {/* List of Detected Borosil Accounts */}
              <div className="space-y-2 divide-y divide-slate-100">
                {registeredEmployees.slice(0, 4).map((emp) => (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => handleBorosilAuth(emp.email, emp.name)}
                    disabled={loading}
                    className="w-full pt-2 first:pt-0 text-left p-3 hover:bg-slate-50 rounded-2xl transition flex items-center justify-between group border border-transparent hover:border-slate-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-extrabold text-xs flex items-center justify-center border border-indigo-200 shadow-xs">
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-extrabold text-slate-900 group-hover:text-indigo-600">
                          {emp.name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {emp.email}
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      {emp.role}
                    </span>
                  </button>
                ))}

                {/* Option to Use Another Account */}
                {!showCustomGoogleInput ? (
                  <button
                    type="button"
                    onClick={() => setShowCustomGoogleInput(true)}
                    className="w-full pt-3 text-left p-3 hover:bg-slate-50 rounded-2xl transition flex items-center space-x-3 group border border-transparent hover:border-slate-200"
                  >
                    <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-slate-900 group-hover:text-indigo-600">
                        Use another Borosil account
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Sign in with a different @borosil.com email
                      </div>
                    </div>
                  </button>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleBorosilAuth(customGoogleEmail, customGoogleName);
                    }}
                    className="pt-3 space-y-3 animate-fade-in"
                  >
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Enter your Borosil Email
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="yourname@borosil.com"
                        value={customGoogleEmail}
                        onChange={(e) => setCustomGoogleEmail(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-semibold focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Full Name (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Plant Inspector"
                        value={customGoogleName}
                        onChange={(e) => setCustomGoogleName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-semibold focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center space-x-2 pt-1">
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-2 px-3 rounded-xl text-xs transition"
                      >
                        {loading ? 'Authenticating...' : 'Sign In'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCustomGoogleInput(false)}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-center text-[10px] text-slate-400 font-medium">
              To continue, Google will share your name, email address, and language preference with BRL Engineering Audit.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
