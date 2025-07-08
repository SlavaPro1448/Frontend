
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TelegramChat {
  id: string;
  title: string;
  type: string;
  unread_count: number;
  today_incoming: number;
  account_phone?: string;
  last_message?: {
    text: string;
    date: string;
    from_user?: string;
  };
}

interface TodayStats {
  totalIncoming: number;
  accountPhone: string;
  newUsersToday: number;
  activeUsersToday: number;
}

export const useTelegramChats = (operatorId: string, selectedAccountPhone?: string) => {
  const [chats, setChats] = useState<TelegramChat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todayStats, setTodayStats] = useState<TodayStats[]>([]);
  const [isStatsLoading, setIsStatsLoading] = useState(false);

  useEffect(() => {
    const fetchChats = async () => {
      if (!operatorId) return;
      setIsLoading(true);
      setError(null);
      try {
        // Получаем аккаунты через Supabase
        const { data: accounts, error: accountsError } = await supabase
          .from('telegram_accounts')
          .select('phone_number')
          .eq('operator_id', operatorId)
          .eq('is_authenticated', true);
        if (accountsError) throw new Error('Ошибка получения аккаунтов');
        if (!accounts || accounts.length === 0) throw new Error('Нет авторизованных аккаунтов');
        // Определяем, для каких аккаунтов загружать чаты
        const targetAccounts = selectedAccountPhone
          ? accounts.filter(acc => acc.phone_number === selectedAccountPhone)
          : accounts;
        if (targetAccounts.length === 0) throw new Error('Выбранный аккаунт не найден');
        const allChats: TelegramChat[] = [];
        const apiUrl = import.meta.env.VITE_API_URL;
        for (const acc of targetAccounts) {
          // Получаем чаты для каждого аккаунта через Flask API
          const chatsResp = await fetch(`${apiUrl}/api/chats/${operatorId}?account=${acc.phone_number}`);
          const chatsData = await chatsResp.json();
          if (chatsData.error) throw new Error(chatsData.error);
          if (!chatsData.chats) continue;
          const formattedChats = chatsData.chats.map((chat: any) => ({
            id: `${acc.phone_number}_${chat.id}`,
            title: chat.name || 'Без названия',
            type: chat.type || 'private',
            unread_count: chat.unread_count || 0,
            today_incoming: 0,
            account_phone: acc.phone_number,
            last_message: chat.last_message ? {
              text: chat.last_message.text,
              date: chat.last_message.date,
              from_user: chat.type === 'user' ? chat.name : undefined
            } : undefined,
            first_message_date: chat.first_message_date || null
          }));
          allChats.push(...formattedChats);
        }
        setChats(allChats);
        setIsLoading(false);
        // После загрузки чатов запускаем асинхронный подсчёт статистики
        setIsStatsLoading(true);
        setTimeout(() => calculateStats(allChats, targetAccounts), 0);
      } catch (err) {
        console.error('❌ КРИТИЧЕСКАЯ ОШИБКА ЗАГРУЗКИ ЧАТОВ:', err);
        const errorMessage = err instanceof Error ? err.message : 'Произошла критическая ошибка при загрузке чатов';
        setError(errorMessage);
        setIsLoading(false);
      }
    };
    fetchChats();
    // eslint-disable-next-line
  }, [operatorId, selectedAccountPhone]);

  // Фоновый подсчёт статистики
  const calculateStats = (allChats: TelegramChat[], targetAccounts: any[]) => {
    const today = new Date();
    const isToday = (dateString: string) => {
      const date = new Date(dateString);
      return date.getDate() === today.getDate() &&
             date.getMonth() === today.getMonth() &&
             date.getFullYear() === today.getFullYear();
    };
    let newUsersToday = 0;
    let activeUsersToday = 0;
    const allTodayStats: TodayStats[] = [];
    for (const acc of targetAccounts) {
      const chatsForAcc = allChats.filter(chat => chat.account_phone === acc.phone_number);
      for (const chat of chatsForAcc) {
        // Новые: если первое сообщение в чате — сегодня
        if (chat.first_message_date && isToday(chat.first_message_date)) {
          newUsersToday += 1;
        }
        // Активные: если последнее входящее сообщение — сегодня
        if (chat.last_message && chat.last_message.date && isToday(chat.last_message.date)) {
          activeUsersToday += 1;
        }
      }
      allTodayStats.push({
        accountPhone: acc.phone_number,
        totalIncoming: 0,
        newUsersToday,
        activeUsersToday
      });
    }
    setTodayStats(allTodayStats);
    setIsStatsLoading(false);
  };

  const refetch = () => {
    setChats([]);
    setTodayStats([]);
    setError(null);
    setIsLoading(true);
    setIsStatsLoading(false);
    // Перезапуск useEffect через изменение зависимости будет автоматический
  };

  return { chats, todayStats, isLoading, error, refetch, isStatsLoading };
};
