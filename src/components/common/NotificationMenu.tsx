import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { useAppState } from '../../context/StateContext';
import * as notificationApi from '../../api/notificationApi';
import { supabase } from '../../supabaseClient';
import type { NotificationResponse } from '../../types';
import { ValkyriasLoader } from './ValkyriasLoader';

interface PanelPosition {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
}

const formatNotificationTime = (createdAt: string) => {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return '';

  const difference = Date.now() - created.getTime();
  const minutes = Math.max(0, Math.floor(difference / 60_000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return created.toLocaleDateString([], {
    day: '2-digit',
    month: 'short',
    year: created.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  });
};

export const NotificationMenu: React.FC = () => {
  const { profile } = useAppState();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [position, setPosition] = useState<PanelPosition>({
    left: 12,
    top: 64,
    width: 360,
    maxHeight: 460,
  });
  const triggerRef = useRef<HTMLButtonElement>(null);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.readAt).length,
    [notifications],
  );

  const loadNotifications = useCallback(async () => {
    if (!profile?.applicationUserId) {
      setNotifications([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const page = await notificationApi.listNotifications(0, 50);
      setNotifications(page.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Notifications could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [profile?.applicationUserId]);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const width = Math.max(220, Math.min(360, viewportWidth - 24));
    const maxHeight = Math.max(180, Math.min(460, viewportHeight - 24));
    const left = Math.min(
      Math.max(12, rect.right - width),
      Math.max(12, viewportWidth - width - 12),
    );
    const preferredTop = rect.bottom + 10;
    const top = Math.max(12, Math.min(preferredTop, viewportHeight - maxHeight - 12));

    setPosition({ left, top, width, maxHeight });
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!profile?.applicationUserId) return undefined;

    const channel = supabase
      .channel(`portal-notifications:${profile.applicationUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.applicationUserId}`,
        },
        () => void loadNotifications(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadNotifications, profile?.applicationUserId]);

  useEffect(() => {
    if (!open) return undefined;

    updatePosition();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const reposition = () => updatePosition();

    window.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);

    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open, updatePosition]);

  const markRead = async (notification: NotificationResponse) => {
    if (notification.readAt || busy) return;

    setBusy(true);
    setError(null);
    try {
      const updated = await notificationApi.markNotificationRead(notification.id);
      setNotifications((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (markError) {
      setError(markError instanceof Error ? markError.message : 'The notification could not be marked as read.');
    } finally {
      setBusy(false);
    }
  };

  const markAllRead = async () => {
    const unread = notifications.filter((notification) => !notification.readAt);
    if (unread.length === 0 || busy) return;

    setBusy(true);
    setError(null);
    try {
      const updated = await Promise.all(
        unread.map((notification) => notificationApi.markNotificationRead(notification.id)),
      );
      const updatedById = new Map(updated.map((notification) => [notification.id, notification]));
      setNotifications((current) => current.map((notification) => updatedById.get(notification.id) ?? notification));
    } catch (markError) {
      setError(markError instanceof Error ? markError.message : 'Notifications could not be marked as read.');
      await loadNotifications();
    } finally {
      setBusy(false);
    }
  };

  const panel = open && typeof document !== 'undefined'
    ? createPortal(
      <div
        className="fixed inset-0 z-[9998]"
        onMouseDown={() => setOpen(false)}
      >
        <section
          role="dialog"
          aria-label="Notifications"
          aria-modal="false"
          onMouseDown={(event) => event.stopPropagation()}
          className="fixed z-[9999] flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-surface-container shadow-[0_24px_80px_rgba(0,0,0,0.65)]"
          style={{
            left: position.left,
            top: position.top,
            width: position.width,
            maxHeight: position.maxHeight,
          }}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/5 px-4 py-3.5">
            <div className="min-w-0">
              <h3 className="truncate font-display text-xs font-extrabold uppercase tracking-[0.14em] text-white">
                Notifications
              </h3>
              <p className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-gray-500">
                {unreadCount === 0 ? 'No unread alerts' : `${unreadCount} unread alert${unreadCount === 1 ? '' : 's'}`}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                disabled={busy}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 font-mono text-[8px] font-bold uppercase tracking-wider text-primary-gold transition hover:bg-white/5 hover:text-white disabled:cursor-wait disabled:opacity-50"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
            {loading ? (
              <div className="flex min-h-40 items-center justify-center">
                <ValkyriasLoader compact label="Loading notifications" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex min-h-40 flex-col items-center justify-center px-6 text-center">
                <Bell className="h-6 w-6 text-primary-gold/60" />
                <p className="mt-3 text-xs font-semibold text-gray-300">No notifications yet</p>
                <p className="mt-1 text-[10px] leading-relaxed text-gray-500">
                  Project, message, file and payment updates will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification) => {
                  const unread = !notification.readAt;
                  return (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => void markRead(notification)}
                      disabled={busy && unread}
                      className={`block w-full rounded-xl border p-3 text-left transition disabled:cursor-wait ${
                        unread
                          ? 'border-primary-gold/20 bg-primary-gold/[0.06] hover:border-primary-gold/35 hover:bg-primary-gold/[0.09]'
                          : 'border-white/5 bg-obsidian/20 opacity-75 hover:bg-white/[0.03] hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${unread ? 'bg-primary-gold shadow-[0_0_8px_rgba(224,192,151,0.8)]' : 'bg-gray-700'}`} />
                        <span className="min-w-0 flex-1">
                          <span className={`block break-words text-[11px] font-bold leading-snug ${unread ? 'text-white' : 'text-gray-300'}`}>
                            {notification.title}
                          </span>
                          <span className="mt-1 block break-words whitespace-normal text-[10px] leading-relaxed text-gray-400">
                            {notification.body}
                          </span>
                          <span className="mt-2 block font-mono text-[8px] uppercase tracking-wider text-gray-600">
                            {formatNotificationTime(notification.createdAt)}
                          </span>
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {error && (
            <div className="shrink-0 border-t border-red-500/15 bg-red-950/20 px-4 py-2.5 text-[9px] leading-relaxed text-red-300">
              {error}
            </div>
          )}
        </section>
      </div>,
      document.body,
    )
    : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setOpen((current) => !current);
          if (!open) void loadNotifications();
        }}
        aria-label={unreadCount > 0 ? `Open notifications, ${unreadCount} unread` : 'Open notifications'}
        aria-expanded={open}
        className="neumorphic-button relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:text-primary-gold"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full border border-obsidian bg-red-500 px-1 font-mono text-[7px] font-black leading-none text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      {panel}
    </>
  );
};
