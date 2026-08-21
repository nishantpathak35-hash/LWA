'use client';

import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Share2, PlusSquare, CheckCircle, X, ExternalLink } from 'lucide-react';
import { Button } from './core';

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [showBottomBanner, setShowBottomBanner] = useState(false);

  useEffect(() => {
    // Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.log('SW registration error:', err);
      });
    }

    // Check if running in standalone mode (already installed)
    const isStandalone = typeof window !== 'undefined' && (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://')
    );
    setIsInstalled(isStandalone);

    // Detect iOS
    const isIOSDevice = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    // Capture beforeinstallprompt for Chrome / Android / Edge
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Auto-show floating banner on mobile if not dismissed before
      const dismissed = localStorage.getItem('lx_install_banner_dismissed');
      if (!dismissed && !isStandalone) {
        setShowBottomBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Listen for custom open event
    const handleOpenInstall = () => {
      setModalOpen(true);
    };
    window.addEventListener('lx:open-install-pwa', handleOpenInstall);

    // Detect if app was successfully installed
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setModalOpen(false);
      setShowBottomBanner(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('lx:open-install-pwa', handleOpenInstall);
    };
  }, []);

  const triggerInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setShowBottomBanner(false);
      }
      setDeferredPrompt(null);
    } else {
      // If no native prompt (e.g. iOS or manual), open step-by-step modal
      setModalOpen(true);
    }
  };

  const dismissBanner = () => {
    setShowBottomBanner(false);
    try {
      localStorage.setItem('lx_install_banner_dismissed', '1');
    } catch {}
  };

  if (isInstalled) return null;

  return (
    <>
      {/* ── Optional Bottom Floating Banner for First-Time Mobile Users ── */}
      {showBottomBanner && (
        <div className="fixed bottom-20 inset-x-4 z-40 md:hidden animate-slide-up">
          <div className="bg-slate-900/95 backdrop-blur-xl border border-amber-500/40 rounded-2xl p-3.5 shadow-2xl flex items-center justify-between gap-3 text-slate-100">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-gold shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-100 truncate">Install LuxeWorx App</p>
                <p className="text-[10px] text-slate-400 truncate">1-Tap Fast Mobile Access</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="primary"
                size="sm"
                onClick={triggerInstall}
                className="h-8 px-3 text-[11px] bg-gradient-to-r from-amber-500 to-gold text-slate-950 font-bold hover:scale-105 transition-transform"
              >
                <Download className="w-3.5 h-3.5 mr-1" /> Install
              </Button>
              <button
                onClick={dismissBanner}
                className="p-1 text-slate-400 hover:text-slate-200 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step-by-Step Install Guide Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" onClick={() => setModalOpen(false)}>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-5 shadow-2xl animate-scale-in text-slate-100" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-gold">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Install Mobile App</h3>
                  <p className="text-[10px] text-slate-400">LuxeWorx Atelier ERP</p>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {isIOS ? (
              /* iOS Safari Instructions */
              <div className="space-y-3.5 text-xs text-slate-300">
                <p className="text-[11px] text-amber-400 font-medium">To install on iPhone / iPad (Safari):</p>
                
                <div className="flex items-start gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 text-gold flex items-center justify-center font-bold text-[11px] shrink-0">1</div>
                  <div>
                    <p className="font-semibold text-slate-100">Tap the Share button</p>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      Press <Share2 className="w-3.5 h-3.5 text-blue-400 inline" /> at the bottom of Safari
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 text-gold flex items-center justify-center font-bold text-[11px] shrink-0">2</div>
                  <div>
                    <p className="font-semibold text-slate-100">Add to Home Screen</p>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      Scroll down and tap <PlusSquare className="w-3.5 h-3.5 text-amber-400 inline" /> <strong>Add to Home Screen</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 text-gold flex items-center justify-center font-bold text-[11px] shrink-0">3</div>
                  <div>
                    <p className="font-semibold text-slate-100">Tap &apos;Add&apos;</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Tap <strong>Add</strong> in the top-right corner to save app to your home screen.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Android / Chrome Instructions */
              <div className="space-y-4 text-xs text-slate-300">
                <p className="text-[11px] text-slate-400">Install the app directly on your device for full screen experience, faster loading and instant offline access.</p>
                
                {deferredPrompt ? (
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={triggerInstall}
                    className="w-full bg-gradient-to-r from-amber-500 to-gold text-slate-950 font-bold py-2.5 rounded-xl hover:opacity-95"
                  >
                    <Download className="w-4 h-4 mr-2" /> Tap to Install Now
                  </Button>
                ) : (
                  <div className="space-y-2.5 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 text-[11px]">
                    <p className="font-semibold text-slate-200">How to install from Chrome / Edge:</p>
                    <ol className="list-decimal list-inside space-y-1.5 text-slate-400">
                      <li>Tap the <strong>three dots (⋮)</strong> menu in browser top-right.</li>
                      <li>Select <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
                      <li>Confirm to add the app icon to your phone screen.</li>
                    </ol>
                  </div>
                )}
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(false)}
              className="w-full text-xs text-slate-400 border-slate-800 hover:bg-slate-800/60"
            >
              Got it
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
