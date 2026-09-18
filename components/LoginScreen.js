'use client';

import React, { useState } from 'react';
import { useAppState } from './StateProvider';
import BrandIdentity from './BrandIdentity';
import { RefreshCw, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

export default function LoginScreen({ inviteToken, clearInvite }) {
  const { login, error, setError, callDirect } = useAppState();
  
  // Login Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Invite Form States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [inviteError, setInviteError] = useState(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setLoading(false);
    }
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (error) setError(null);
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (error) setError(null);
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    setInviteError(null);

    if (newPassword.length < 8) {
      setInviteError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setInviteError('Passwords do not match.');
      return;
    }

    setInviteLoading(true);
    try {
      const res = await callDirect('acceptInvite', inviteToken, newPassword);
      if (res && res.ok) {
        setInviteSuccess(true);
      } else {
        setInviteError('Failed to accept invitation. The token might be invalid or expired.');
      }
    } catch (err) {
      setInviteError(err.message || 'An error occurred while setting up your password.');
    } finally {
      setInviteLoading(false);
    }
  };

  const inputClass = "w-full px-3.5 py-2.5 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors";

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground overflow-hidden font-sans">
      {/* Brand panel (Left) */}
      <div className="flex-1 hidden md:flex flex-col justify-between p-12 lg:p-16 bg-sidebar text-sidebar-foreground border-r border-border relative">
        <BrandIdentity
          title="PTS"
          subtitle="LUXEWORX ATELIER INTERIOR PRIVATE LIMITED"
          size="xl"
          wrapTitle
          titleClassName="text-xl lg:text-2xl"
          subtitleClassName="text-[9px] text-muted-foreground"
          className="relative z-10"
        />

        <div className="space-y-5 max-w-md relative z-10 my-auto">
          <h1 className="text-3xl lg:text-4xl font-light leading-tight font-display text-foreground">
            Procurement &<br />Treasury System
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Purchase orders, vendor payments, project cashflow, and multi-stage approvals — unified for interior design practices.
          </p>
        </div>

        <div className="text-xs text-muted-foreground/60 relative z-10">
          &copy; Luxeworx Atelier Interiors Pvt Ltd
        </div>
      </div>

      {/* Form panel (Right) */}
      <div className="flex-1 flex items-center justify-center p-8 md:p-16 lg:p-24 relative z-10">
        <div className="absolute top-8 left-8 md:hidden">
          <BrandIdentity
            title="PTS"
            subtitle="LUXEWORX ATELIER"
            size="md"
            wrapTitle
            titleClassName="text-base"
            subtitleClassName="text-[8px] text-muted-foreground"
          />
        </div>

        {inviteToken ? (
          /* Accept Invite Flow */
          <div className="w-full max-w-sm space-y-6 animate-fade-in">
            {inviteSuccess ? (
              <div className="space-y-5 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Account Activated</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Your password has been configured. You can now sign in.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearInvite}
                  className="w-full py-2.5 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm rounded-md transition-colors"
                >
                  Go to Sign in
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Set up your account</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Create a password to activate your PTS account.
                  </p>
                </div>

                <form onSubmit={handleInviteSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1.5" htmlFor="newPassword">
                      New password
                    </label>
                    <div className="relative">
                      <input
                        id="newPassword"
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className={inputClass}
                        placeholder="At least 8 characters"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(p => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                        aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1.5" htmlFor="confirmPassword">
                      Confirm password
                    </label>
                    <div className="relative">
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={inputClass}
                        placeholder="Re-enter password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(p => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {inviteError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-xs text-red-600 dark:text-red-400">
                      {inviteError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={inviteLoading}
                    className="w-full py-2.5 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm rounded-md transition-colors disabled:opacity-50"
                  >
                    {inviteLoading ? 'Saving...' : 'Activate Account'}
                  </button>
                  <button
                    type="button"
                    onClick={clearInvite}
                    className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Back to Sign in
                  </button>
                </form>
              </div>
            )}
          </div>
        ) : (
          /* Standard Sign-in */
          <div className="w-full max-w-sm space-y-6 animate-fade-in">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Sign in</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter your credentials to access PTS.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={handleEmailChange}
                  className={inputClass}
                  placeholder="you@luxeworx.com"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={handlePasswordChange}
                    className={inputClass}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-xs text-red-600 dark:text-red-400">
                  {error.replace(/^Error: /i, '')}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>

            <p className="text-center text-xs text-muted-foreground">
              Forgot your password? Contact your director.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
