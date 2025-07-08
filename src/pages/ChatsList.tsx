import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, MessageSquare, Settings, RefreshCw, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useTelegramChats } from '@/hooks/useTelegramChats';
import ChatItem from '@/components/ChatItem';
import AccountSelector from '@/components/AccountSelector';

const ChatsList = () => {
  const { operatorId } = useParams();
  const navigate = useNavigate();
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);

  console.log('=== CHATS LIST COMPONENT START ===');
  console.log('operatorId from params:', operatorId);
  console.log('selectedAccount:', selectedAccount);

  // Получаем аккаунты через Supabase
  const { data: accountsData, error: accountsError, isLoading: accountsLoading } = useQuery({
    queryKey: ['telegram_accounts', operatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('telegram_accounts')
        .select('*')
        .eq('operator_id', operatorId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!operatorId,
  });

  // Получаем чаты с помощью обновленного хука
  const { chats, todayStats, isLoading, error, refetch, isStatsLoading } = useTelegramChats(operatorId || '', selectedAccount || undefined);

  // Фильтруем только авторизованные аккаунты
  const authenticatedAccounts = accountsData?.filter(acc => acc.is_authenticated) || [];

  // Подсчитываем общую статистику
  const totalTodayIncoming = todayStats.reduce((sum, stat) => sum + stat.totalIncoming, 0);

  // Получаем общее количество новых и активных пользователей за сегодня
  const totalNewUsersToday = todayStats.reduce((sum, stat) => sum + (stat.newUsersToday || 0), 0);
  const totalActiveUsersToday = todayStats.reduce((sum, stat) => sum + (stat.activeUsersToday || 0), 0);

  useEffect(() => {
    if (accountsError) {
      console.error('❌ ОШИБКА В USEEFFECT:', accountsError);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить аккаунты",
        variant: "destructive"
      });
    }
    if (!accountsLoading && accountsData && accountsData.length === 0) {
      navigate(`/manage/${operatorId}`);
    }
  }, [accountsError, accountsLoading, accountsData, navigate, operatorId]);

  const handleAddAccount = () => {
    console.log('➕ ДОБАВЛЕНИЕ НОВОГО АККАУНТА');
    navigate(`/auth/${operatorId}`);
  };

  const handleManageAccounts = () => {
    console.log('⚙️ УПРАВЛЕНИЕ АККАУНТАМИ');
    navigate(`/manage/${operatorId}`);
  };

  const handleChatClick = (chatId: string) => {
    console.log('💬 ПЕРЕХОД К ЧАТУ:', chatId);
    navigate(`/chat/${operatorId}/${chatId}`);
  };

  const handleRefreshChats = () => {
    console.log('🔄 ОБНОВЛЕНИЕ ЧАТОВ');
    refetch();
  };

  const handleAccountSelect = (phoneNumber: string | null) => {
    console.log('📱 ВЫБРАН АККАУНТ:', phoneNumber || 'ВСЕ АККАУНТЫ');
    setSelectedAccount(phoneNumber);
  };

  if (accountsLoading) {
    console.log('⏳ ПОКАЗЫВАЕМ ЗАГРУЗКУ АККАУНТОВ');
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка аккаунтов...</p>
        </div>
      </div>
    );
  }

  console.log('🎯 РЕНДЕР - ФИНАЛЬНАЯ ПРОВЕРКА:');
  console.log('- Всего аккаунтов:', accountsData?.length || 0);
  console.log('- Авторизованных аккаунтов:', authenticatedAccounts.length);
  console.log('- Чатов загружено:', chats.length);
  console.log('- Входящих за сегодня:', totalTodayIncoming);
  console.log('- Выбранный аккаунт:', selectedAccount);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')}
              className="text-gray-600 hover:text-gray-800 hover:bg-white/50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад к операторам
            </Button>
            
            <div className="flex gap-2">
              <Button
                onClick={handleRefreshChats}
                variant="outline"
                className="border-gray-300 hover:bg-white/50"
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Обновить
              </Button>
              <Button
                onClick={handleAddAccount}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Добавить аккаунт
              </Button>
              <Button
                onClick={handleManageAccounts}
                variant="outline"
                className="border-gray-300 hover:bg-white/50"
              >
                <Settings className="w-4 h-4 mr-2" />
                Управление
              </Button>
            </div>
          </div>

          <Card className="shadow-xl border-0 mb-6">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
              <CardTitle className="text-2xl font-bold flex items-center">
                <MessageSquare className="w-6 h-6 mr-3" />
                Telegram Чаты
              </CardTitle>
              <div className="flex items-center justify-between">
                <p className="text-blue-100 text-sm">
                  Аккаунтов: {authenticatedAccounts.length} | Чатов: {chats.length}
                  {selectedAccount && ` | Аккаунт: ${selectedAccount}`}
                </p>
                {totalTodayIncoming > 0 && (
                  <div className="flex items-center bg-green-500/20 px-3 py-1 rounded-full">
                    <TrendingUp className="w-4 h-4 mr-2 text-green-200" />
                    <span className="text-green-200 font-medium">
                      +{totalTodayIncoming} входящих сегодня
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {authenticatedAccounts.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-700 mb-2">
                    Нет авторизованных аккаунтов
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Добавьте и авторизуйте аккаунт Telegram для просмотра чатов
                  </p>
                  <Button
                    onClick={handleAddAccount}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить первый аккаунт
                  </Button>
                </div>
              ) : (
                <>
                  {/* Селектор аккаунтов */}
                  <AccountSelector
                    accounts={authenticatedAccounts}
                    selectedAccount={selectedAccount}
                    onAccountSelect={handleAccountSelect}
                  />

                  {/* Статистика по аккаунтам */}
                  {todayStats.length > 0 && !selectedAccount && !isStatsLoading && (
                    <div className="mb-6 p-4 bg-green-50 rounded-lg border-l-4 border-green-400">
                      <h4 className="font-medium text-green-800 mb-2 flex items-center">
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Статистика входящих сообщений за сегодня
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                        {todayStats.map((stat, index) => (
                          <div key={index} className="flex items-center justify-between bg-white p-3 rounded border">
                            <span className="text-sm text-gray-600">{stat.accountPhone}:</span>
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              +{stat.totalIncoming}
                            </Badge>
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-col md:flex-row gap-3">
                        <div className="flex items-center bg-blue-100 text-blue-800 rounded px-3 py-1 text-sm">
                          Новых пользователей за сегодня: <span className="font-bold ml-2">{totalNewUsersToday}</span>
                        </div>
                        <div className="flex items-center bg-yellow-100 text-yellow-800 rounded px-3 py-1 text-sm">
                          Активных пользователей за сегодня: <span className="font-bold ml-2">{totalActiveUsersToday}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {isStatsLoading && !selectedAccount && (
                    <div className="mb-6 p-4 bg-green-50 rounded-lg border-l-4 border-green-400 flex items-center gap-3">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
                      <span className="text-green-800 font-medium">Загрузка статистики...</span>
                    </div>
                  )}

                  {/* Чаты */}
                  {isLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">
                        {selectedAccount ? `Загрузка чатов для ${selectedAccount}...` : 'Загрузка всех чатов...'}
                      </p>
                    </div>
                  ) : error ? (
                    <div className="text-center py-8">
                      <MessageSquare className="w-16 h-16 text-red-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-700 mb-2">
                        Ошибка загрузки чатов
                      </h3>
                      <p className="text-gray-500 mb-6">
                        {error}
                      </p>
                      <Button
                        onClick={handleRefreshChats}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Попробовать снова
                      </Button>
                    </div>
                  ) : chats.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-700 mb-2">
                        Чаты не найдены
                      </h3>
                      <p className="text-gray-500 mb-6">
                        {selectedAccount 
                          ? `Аккаунт ${selectedAccount} не имеет активных чатов` 
                          : 'Аккаунты не имеют активных чатов или произошла ошибка при загрузке'
                        }
                      </p>
                      <Button
                        onClick={handleRefreshChats}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Обновить список
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <h4 className="text-lg font-medium text-gray-700 mb-4 flex items-center justify-between">
                        <span>
                          {selectedAccount 
                            ? `Чаты аккаунта ${selectedAccount} (${chats.length}):`
                            : `Все чаты (${chats.length}):`
                          }
                        </span>
                        {!selectedAccount && totalTodayIncoming > 0 && (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            Всего новых: +{totalTodayIncoming}
                          </Badge>
                        )}
                      </h4>
                      
                      {chats.map((chat) => (
                        <ChatItem
                          key={chat.id}
                          chat={chat}
                          onClick={() => handleChatClick(chat.id)}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ChatsList;
