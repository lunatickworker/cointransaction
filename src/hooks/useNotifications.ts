import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase/client';
import { Notification } from '../utils/supabase/types';
import { toast } from 'sonner@2.0.3';

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotification: (id: string) => void;
}

export function useNotifications(userId: string | undefined, isAdmin: boolean = false): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // 로컬 스토리지에서 알림 불러오기
  useEffect(() => {
    if (!userId) return;
    
    const storageKey = `notifications_${userId}`;
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setNotifications(parsed);
      } catch (e) {
        console.error('Failed to parse notifications:', e);
      }
    }
  }, [userId]);

  // 로컬 스토리지에 저장
  const saveNotifications = useCallback((notifs: Notification[]) => {
    if (!userId) return;
    
    const storageKey = `notifications_${userId}`;
    // 최근 100개만 보관
    const toSave = notifs.slice(0, 100);
    localStorage.setItem(storageKey, JSON.stringify(toSave));
    setNotifications(toSave);
  }, [userId]);

  // 새 알림 추가
  const addNotification = useCallback((notif: Omit<Notification, 'id' | 'created_at'>) => {
    const newNotif: Notification = {
      ...notif,
      id: `${Date.now()}_${Math.random()}`,
      created_at: new Date().toISOString(),
    };
    
    setNotifications(prev => {
      const updated = [newNotif, ...prev];
      saveNotifications(updated);
      return updated;
    });

    // 소리 알림만 (토스트 알림 제거 - 대량 알림 시 문제 방지)
    try {
      // 간단한 비프음
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHGS57OihUhELTKXh8bllHAU2jdXzzn0pBSl+zPLaizsIGGK37OihUhEMUKjj8bllHAU2jdXzzn0pBSh+zPLaizsIG2G37OihUhEMUKjj8bllHAU1jdXzzn0pBSh+zPLaizsIG2G37OihUxELT6jj8rllHAU1jdXzzn0pBSh+zPLaizsIG2G37OihUxELT6jj8rllHAU1jdXzzn0pBSh+zPLaizsIG2G37OihUxELT6jj8rllHAU1jdXzzn0pBSh+zPLaizsIG2G37OihUxELT6jj8rllHAU1jdXzzn0pBSh+zPLaizsIG2G37OihUxELT6jj8rllHAU1jdXzzn0pBSh+zPLaizsIG2G37OihUxELT6jj8rllHAU1jdXzzn0pBSh+zPLaizsIG2G37OihUxELT6jj8rllHAU1jdXzzn0pBSh+zPLaizsIG2G37OihUxELT6jj8rllHAU1jdXzzn0pBSh+zPLaizsIG2G37OihUxELT6jj8rllHAU1jdXzzn0pBSh+zPLaizsIG2G37OihUxELT6jj8rllHAU1jdXzzn0pBSh+zPLaizsIG2G37OihUxELT6jj8rllHAU1jdXzzn0pBSh+zPLaizsIG2G37OihUxELT6jj8rllHAU1jdXzzn0pBSh+zPLaizsIG2G37OihUxELT6jj8rllHAU1jdXzzn0pBSh+zPLaizsIG2G37OihU');
      audio.volume = 0.2;
      audio.play().catch(() => {}); // 무음 모드에서는 무시
    } catch (e) {
      // 알림음 재생 실패해도 무시
    }
  }, [saveNotifications]);

  // 관리자 실시간 구독
  useEffect(() => {
    if (!userId || !isAdmin) return;

    const channels: any[] = [];

    // 1. 새 회원가입 감지
    const signupChannel = supabase
      .channel('admin-signups')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'auth_users' },
        (payload: any) => {
          addNotification({
            user_id: userId,
            type: 'signup',
            title: '새 회원 가입',
            message: `${payload.new.username || payload.new.email}님이 가입했습니다.`,
            read: false,
            data: payload.new,
          });
        }
      )
      .subscribe();
    channels.push(signupChannel);

    // 2. 계좌 인증 요청 감지
    const verificationChannel = supabase
      .channel('admin-verifications')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'account_verifications',
          filter: 'status=eq.pending'
        },
        (payload: any) => {
          addNotification({
            user_id: userId,
            type: 'verification_request',
            title: '1원 인증 요청',
            message: `새로운 계좌 인증 요청이 있습니다.`,
            read: false,
            data: payload.new,
          });
        }
      )
      .subscribe();
    channels.push(verificationChannel);

    // 3. 구매 요청 감지
    const purchaseChannel = supabase
      .channel('admin-purchases')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'transfer_requests',
          filter: 'status=eq.pending'
        },
        (payload: any) => {
          addNotification({
            user_id: userId,
            type: 'purchase_request',
            title: '새 구매 요청',
            message: `${payload.new.coin_type} ${payload.new.amount.toLocaleString()}원 구매 요청`,
            read: false,
            data: payload.new,
          });
        }
      )
      .subscribe();
    channels.push(purchaseChannel);

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [userId, isAdmin, addNotification]);

  // 사용자 실시간 구독
  useEffect(() => {
    if (!userId || isAdmin) return;

    const channels: any[] = [];

    // 1. 계좌 인증 상태 변경 감지
    const verificationChannel = supabase
      .channel('user-verifications')
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'account_verifications',
          filter: `user_id=eq.${userId}`
        },
        (payload: any) => {
          if (payload.new.status === 'approved') {
            addNotification({
              user_id: userId,
              type: 'verification_approved',
              title: '계좌 인증 완료',
              message: '1원 인증이 승인되었습니다. 이제 모든 기능을 사용할 수 있습니다.',
              read: false,
              data: payload.new,
            });
          } else if (payload.new.status === 'rejected') {
            addNotification({
              user_id: userId,
              type: 'verification_rejected',
              title: '계좌 인증 거절',
              message: `인증이 거절되었습니다. 사유: ${payload.new.rejection_reason || '확인 필요'}`,
              read: false,
              data: payload.new,
            });
          }
        }
      )
      .subscribe();
    channels.push(verificationChannel);

    // 2. 구매 요청 상태 변경 감지
    const purchaseChannel = supabase
      .channel('user-purchases')
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'transfer_requests',
          filter: `from_user_id=eq.${userId}`
        },
        (payload: any) => {
          if (payload.new.status === 'approved') {
            addNotification({
              user_id: userId,
              type: 'purchase_approved',
              title: '구매 승인',
              message: `${payload.new.coin_type} ${payload.new.amount.toLocaleString()}원 구매가 승인되었습니다.`,
              read: false,
              data: payload.new,
            });
          } else if (payload.new.status === 'completed') {
            addNotification({
              user_id: userId,
              type: 'purchase_completed',
              title: '구매 완료',
              message: `${payload.new.coin_type} ${payload.new.amount.toLocaleString()}원 구매가 완료되었습니다.`,
              read: false,
              data: payload.new,
            });
          } else if (payload.new.status === 'rejected') {
            addNotification({
              user_id: userId,
              type: 'purchase_rejected',
              title: '구매 거절',
              message: `구매 요청이 거절되었습니다. 사유: ${payload.new.rejection_reason || '확인 필요'}`,
              read: false,
              data: payload.new,
            });
          }
        }
      )
      .subscribe();
    channels.push(purchaseChannel);

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [userId, isAdmin, addNotification]);

  // 읽음 표시
  const markAsRead = useCallback(async (id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => 
        n.id === id ? { ...n, read: true } : n
      );
      saveNotifications(updated);
      return updated;
    });
  }, [saveNotifications]);

  // 전체 읽음 표시
  const markAllAsRead = useCallback(async () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      saveNotifications(updated);
      return updated;
    });
  }, [saveNotifications]);

  // 알림 삭제
  const clearNotification = useCallback((id: string) => {
    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== id);
      saveNotifications(updated);
      return updated;
    });
  }, [saveNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
  };
}
