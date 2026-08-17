'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Building,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  UserCheck,
  Lock,
  Sparkles,
  Users,
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
  const [showManualInput, setShowManualInput] = useState<boolean>(false);

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
      onLoginSuccess(authUser);
    }, 600);
  };

  const handleGoogleSignInClick = () => {
    // If email is already typed, use it; otherwise use default demo or prompt
    if (emailInput.trim()) {
      handleBorosilAuth(emailInput, nameInput);
    } else {
      setShowManualInput(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 flex flex-col justify-center items-center p-4 select-none relative overflow-hidden font-sans">
      {/* Background Decorative Rings */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="bg-white/95 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in relative z-10">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 p-8 text-white text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>

          <span className="inline-block bg-white/20 text-white font-extrabold text-[10px] uppercase tracking-widest px-3 py-1 rounded-full mb-2">
            Borosil Corporate Single Sign-On
          </span>

          <h1 className="text-xl font-black tracking-tight">BOROSIL RENEWABLES LTD.</h1>
          <p className="text-xs text-indigo-100 font-medium mt-1">
            Plant Engineering Audit &amp; Quality Management Portal
          </p>
        </div>

        {/* Login Form Content */}
        <div className="p-8 space-y-6">
          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-start space-x-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Primary "Sign in with Google" Button */}
          <div className="space-y-3">
            <button
              onClick={handleGoogleSignInClick}
              disabled={loading}
              className="w-full bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200 hover:border-indigo-400 font-extrabold py-3.5 px-4 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center space-x-3 text-sm group"
            >
              {/* Google G Logo SVG */}
              <svg className="w-5 h-5" viewBox="0 0 24 24">
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
              <span>{loading ? 'Authenticating with Google...' : 'Sign in with Google (Borosil ID)'}</span>
            </button>

            <p className="text-[11px] text-center text-slate-400 font-medium">
              New Borosil accounts automatically open with <strong className="text-indigo-600">Viewer</strong> role. Role can be promoted in Settings.
            </p>
          </div>

          {/* Manual / Custom Borosil Email Input Section */}
          <div className="space-y-3 pt-2">
            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider relative z-10">
                Or Sign In With Borosil Email
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
                  placeholder="your.name@borosil.com"
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

          {/* Quick Demo Profiles Selector */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
              <Users className="w-3 h-3" />
              <span>Quick Login Profiles:</span>
            </p>

            <div className="grid grid-cols-2 gap-2">
              {registeredEmployees.slice(0, 4).map((emp) => (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => handleBorosilAuth(emp.email, emp.name)}
                  className="p-2.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl text-left transition group"
                >
                  <div className="font-extrabold text-[11px] text-slate-900 group-hover:text-indigo-900 truncate">
                    {emp.name}
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center justify-between mt-0.5">
                    <span className="font-bold text-indigo-700">{emp.role}</span>
                    <span className="text-[9px] text-slate-400 truncate max-w-[80px]">{emp.department}</span>
                  </div>
                </button>
              ))}

              {/* Sample New Borosil Employee (Viewer Role) */}
              <button
                type="button"
                onClick={() => handleBorosilAuth('operator@borosil.com', 'Plant Operator')}
                className="col-span-2 p-2.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl text-left transition group flex items-center justify-between"
              >
                <div>
                  <div className="font-extrabold text-[11px] text-slate-900 group-hover:text-indigo-900">
                    New Borosil Employee (operator@borosil.com)
                  </div>
                  <div className="text-[10px] text-slate-500">
                    First-time login $\rightarrow$ Auto-opens with <span className="font-bold text-indigo-600">Viewer</span> role
                  </div>
                </div>
                <span className="bg-indigo-100 text-indigo-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                  Viewer
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Card Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center text-[10px] text-slate-400 font-semibold flex items-center justify-center space-x-2">
          <Lock className="w-3 h-3 text-slate-400" />
          <span>Secured for Borosil Renewables Plant Engineering Systems</span>
        </div>
      </div>
    </div>
  );
};
