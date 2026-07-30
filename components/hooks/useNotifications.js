'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// Tiny base64-encoded notification chime (sine wave beep, ~0.15s)
const NOTIFICATION_SOUND_DATA = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdX2LkZqXkIiAeHB0fIWOkpOOiH94cXJ5gYqRlJKMhoB4cXN7g4ySlZONhoB4cXJ5gIqRlJKNh4F5cnN7g4yRlJKNh4F5c3R7g4yRlJKNh4F5c3R7goyRk5KNh4F5c3V8g4yQk5KNh4J6dHV8g4uQk5GMh4J6dHZ9g4uQkpGMhoJ6dXZ9g4uPkZGMhoJ7dnd9g4qPkZCLhoN7d3h+g4qPkJCLhYN8eHl+goqOj5CLhYN8eXp/goqOj4+KhYR9ent/goqNj4+KhIR9e3uAgoqNjo6KhIR+fHyAgomNjo6JhIR+fH2BgomMjY2JhIV/fX2BgYiMjY2Ig4V/fn6BgYiLjIyIg4V/f3+CgYiLjIuIg4aAgH+CgYeLi4uHg4aAgICCgYaKi4qHg4aBgYGCgIaKiomGg4aBgYGCgIaJiYmGgoeCgoKCgIWIiIiFgoeCgoODgIWIiIiFgoeDA4ODf4WHh4eEgoeDA4SEf4WHh4eDgYiEhISEf4SGhoaCgYiEhIWFf4SGhYWBgIiEhYWFf4OFhYSBgIiFhYWFf4OFhISAgIiFhYaGf4OEhIOAgIiFhYaGgIOEg4OAgImFhYaHgIODg4N/gImFhYaHgIODgoJ/gImGhYaHgIODgoJ/f4mGhYaHgYOCgoF/f4mGhoeHgYOCgYF/f4mHhoeIgYKBgYB/f4mHh4eIgYKBgIB/f4mHh4eIgYKAgIB+fomIh4eJgoKAgH9+fomIh4eJgoGAf39+fomIiIeJgoGAf39+f4iIiIeJg4F/f35+f4iIiIeKg4F/fn5+f4iIiYeKg4B/fn19f4iJiYiKg4B+fX19f4iJiYmKhIB+fX19foiJiomKhIB+fX18foiKiomLhYB9fHx8foiKi4mLhYB9fHt8foiKi4qLhoB9e3t7foiLi4qMhoB9e3t7fYiLjIqMh4B8ent7fYiLjIuMh4F8ent7fYeLjIuNh4F8enp6fIeMjYuNiIF8enp6fIeNjYyOiIF7eXl5fIeNjoyOiYJ7eXl5e4eOj42PiYJ7eHh4e4eOj42PioJ7eHh4e4aPkI6QioN6eHd3eoaQkI6QioN6d3d3eoeQkY+Ri4R6d3Z2eoeRko+SjIR5dnZ1eYeSkpCTjIV5dnV1eYiSkpGTjYV5dXV0eIiTk5GUjoZ4dXRzeIiTk5KVjoZ4dHNyeImUlJKVj4d4dHJxd4mVlZOWkIh3c3FxdomWlpSXkYl3cnBwd4qXlpWYkol2cXBvdoqXl5WZk4p2cG9vdouYmJaalow1';

/**
 * Custom hook for real-time notification alerts.
 * Handles: in-app sound chime + browser Notification API push.
 */
export function useNotifications({ call, user, enabled = true }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [permissionState, setPermissionState] = useState('default');
  const lastSeenIdRef = useRef(0);
  const audioRef = useRef(null);
  const hasInteractedRef = useRef(false);

  // Unlock Web Audio API on first user gesture
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      audioRef.current = new Audio(NOTIFICATION_SOUND_DATA);
      audioRef.current.volume = 0.5;
    } catch (e) {}

    const unlockAudio = () => {
      hasInteractedRef.current = true;
      if (audioRef.current) {
        audioRef.current.play().then(() => {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }).catch(() => {});
      }
    };

    document.addEventListener('click', unlockAudio, { once: true });
    document.addEventListener('touchstart', unlockAudio, { once: true });
    document.addEventListener('keydown', unlockAudio, { once: true });

    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  // Check notification permission state
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    setPermissionState(Notification.permission);
  }, []);

  // Request browser notification permission
  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
    try {
      const result = await Notification.requestPermission();
      setPermissionState(result);
      return result;
    } catch (e) {
      return 'denied';
    }
  }, []);

  // Play notification sound chime (rich 2-note glass chime)
  const playSound = useCallback(() => {
    try {
      playSynthChime();
      if (audioRef.current && hasInteractedRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.volume = 0.9;
        const p = audioRef.current.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      }
    } catch (e) {
      playSynthChime();
    }
  }, []);

  // Web Audio synth crystal glass chime (C6 + G6 2-note harmony)
  const playSynthChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // Primary tone: C6 (1046.5 Hz) - bright glass ping
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1046.5, now);
      gain1.gain.setValueAtTime(0.7, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      // Resonant harmonic: G6 (1567.98 Hz) - elegant 2nd note (ting!)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1567.98, now + 0.08);
      gain2.gain.setValueAtTime(0.001, now);
      gain2.gain.setValueAtTime(0.85, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.35);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.55);
    } catch (e) {}
  };

  // Show browser push notification
  const showBrowserNotification = useCallback((title, body, icon) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    try {
      const n = new Notification(title, {
        body,
        icon: icon || '/branding/logo-icon.png',
        badge: '/branding/logo-icon.png',
        tag: 'lwa-notification-' + Date.now(),
        renotify: true,
        requireInteraction: false,
        silent: false
      });
      setTimeout(() => { try { n.close(); } catch(e){} }, 6000);
      n.onclick = () => {
        try { window.focus(); n.close(); } catch(e){}
      };
    } catch (e) {
      // Mobile service worker fallback or Notification constructor restriction
    }
  }, []);

  // Fetch notifications from server
  const refreshNotifications = useCallback(async () => {
    if (!call || !user) return;
    try {
      const [items, countResult] = await Promise.all([
        call('getUserNotifications', user.email, user.roles || [], 30, 0),
        call('getUnreadCount', user.email, user.roles || [])
      ]);

      const newItems = items || [];
      setNotifications(newItems);
      const newCount = countResult?.count || 0;
      setUnreadCount(newCount);

      // Check for brand new notifications (higher ID than last seen)
      if (newItems.length > 0) {
        const maxId = Math.max(...newItems.map(n => n.id || 0));
        if (lastSeenIdRef.current > 0 && maxId > lastSeenIdRef.current) {
          // We have new notifications since last check
          const freshOnes = newItems.filter(n => n.id > lastSeenIdRef.current && !n.is_read);
          if (freshOnes.length > 0) {
            playSound();
            // Show browser push for the most recent one
            const latest = freshOnes[0];
            showBrowserNotification(
              latest.title || 'New Notification',
              latest.body || '',
            );
          }
        }
        lastSeenIdRef.current = maxId;
      }
    } catch (e) {
      // Silently fail — don't break the app
      console.error('Notification refresh error:', e.message);
    }
  }, [call, user, playSound, showBrowserNotification]);

  // Mark single notification as read
  const markRead = useCallback(async (notificationId) => {
    if (!call) return;
    try {
      await call('markNotificationRead', notificationId);
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: 1 } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.error('Mark read error:', e.message);
    }
  }, [call]);

  // Mark all as read
  const markAllRead = useCallback(async () => {
    if (!call || !user) return;
    try {
      await call('markAllNotificationsRead', user.email, user.roles || []);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (e) {
      console.error('Mark all read error:', e.message);
    }
  }, [call, user]);

  // Initial load
  useEffect(() => {
    if (enabled && user) {
      refreshNotifications();
    }
  }, [enabled, user, refreshNotifications]);

  return {
    notifications,
    unreadCount,
    permissionState,
    requestPermission,
    refreshNotifications,
    markRead,
    markAllRead,
    playSound
  };
}
