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

  // Initialize audio element
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      audioRef.current = new Audio(NOTIFICATION_SOUND_DATA);
      audioRef.current.volume = 0.3;
    } catch (e) {
      // Audio not available
    }
    // Track user interaction for audio autoplay
    const handler = () => { hasInteractedRef.current = true; };
    document.addEventListener('click', handler, { once: true });
    document.addEventListener('keydown', handler, { once: true });
    return () => {
      document.removeEventListener('click', handler);
      document.removeEventListener('keydown', handler);
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

  // Play notification sound
  const playSound = useCallback(() => {
    if (!audioRef.current || !hasInteractedRef.current) return;
    try {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    } catch (e) {
      // Ignore audio errors
    }
  }, []);

  // Show browser push notification
  const showBrowserNotification = useCallback((title, body, icon) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    // Only push when tab is not visible
    if (document.visibilityState === 'visible') return;
    try {
      const n = new Notification(title, {
        body,
        icon: icon || '/branding/logo-icon.png',
        badge: '/branding/logo-icon.png',
        tag: 'lwa-notification',
        renotify: true,
        requireInteraction: false,
        silent: false
      });
      // Auto-close after 5s
      setTimeout(() => n.close(), 5000);
      // Focus window on click
      n.onclick = () => {
        window.focus();
        n.close();
      };
    } catch (e) {
      // Notification API not available
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
