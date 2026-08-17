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
  Building2,
} from 'lucide-react';
import { StorageEngine } from '../lib/storageEngine';
import { AuthUser, Employee } from '../lib/types';

interface LoginPageProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [emailInput, setEmailInput] = useState<string>('mehul.chikhaliya@borosil.com');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const processBorosilUser = (cleanEmail: string) => {
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
        loginMethod: 'borosil_sso',
        loginAt: new Date().toISOString(),
      };
    } else {
      // Auto-register NEW Borosil user as VIEWER
      const derivedName = cleanEmail
        .split('@')[0]
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

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
        loginMethod: 'borosil_sso',
        loginAt: new Date().toISOString(),
      };
    }

    StorageEngine.setCurrentUser(authUser);
    setLoading(false);
    onLoginSuccess(authUser);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const cleanEmail = emailInput.trim().toLowerCase();

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

    if (!passwordInput.trim()) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      processBorosilUser(cleanEmail);
    }, 400);
  };

  const handleFastGoogleSSO = () => {
    setErrorMessage('');
    const cleanEmail = emailInput.trim().toLowerCase() || 'mehul.chikhaliya@borosil.com';

    const isBorosilDomain =
      cleanEmail.endsWith('@borosil.com') ||
      cleanEmail.endsWith('@borosilrenewables.com') ||
      cleanEmail.includes('borosil');

    if (!isBorosilDomain) {
      setErrorMessage('Access Restricted: Please use your official corporate Borosil email (@borosil.com).');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      processBorosilUser(cleanEmail);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 flex flex-col justify-center items-center p-4 select-none relative overflow-hidden font-sans">
      {/* Background Decorative Glow */}
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
        <div className="p-7 space-y-5">
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
              onClick={handleFastGoogleSSO}
              disabled={loading}
              className="w-full bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200 hover:border-indigo-400 font-extrabold py-3 px-4 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center space-x-3 text-sm group active:scale-[0.99]"
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
              <span>{loading ? 'Authenticating...' : 'Sign in with Google (Borosil ID)'}</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center pt-1">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider relative z-10">
              Or Sign In With Password
            </span>
          </div>

          {/* Email & Password Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center space-x-1">
                <Mail className="w-3.5 h-3.5 text-indigo-600" />
                <span>Borosil Corporate Email</span>
              </label>
              <input
                type="email"
                required
                placeholder="mehul.chikhaliya@borosil.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-semibold focus:border-indigo-500 focus:outline-none"
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
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-semibold focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-extrabold py-3 px-4 rounded-2xl text-xs shadow-md shadow-indigo-500/20 transition flex items-center justify-center space-x-1.5 active:scale-[0.99]"
            >
              <span>{loading ? 'Logging in...' : 'Sign In to Portal'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
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
    </div>
  );
};
