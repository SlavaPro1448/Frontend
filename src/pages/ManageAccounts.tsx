
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Phone, User, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import AddAccountModal from '@/components/AddAccountModal';
import { Operator, TelegramAccount } from '@/types/database';

const ManageAccounts = () => {
  const [operator, setOperator] = useState<Operator | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const navigate = useNavigate();
  const { operatorId } = useParams();

  const apiUrl = import.meta.env.VITE_API_URL;

  const fetchData = async () => {
    if (!operatorId) return;
    try {
      // Загружаем аккаунты через Supabase
      const { data: accountsData, error: accountsError } = await (supabase as any)
        .from('telegram_accounts')
        .select('*')
        .eq('operator_id', operatorId)
        .order('created_at', { ascending: false });
      if (accountsError) throw accountsError;
      setAccounts(accountsData || []);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные оператора",
        variant: "destructive"
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [operatorId]);

  const handleDeleteAccount = async (accountId: string, phoneNumber: string) => {
    try {
      // Сначала logout через Flask API
      await fetch(`${apiUrl}/api/logout/${operatorId}?account=${phoneNumber}`, {
        method: 'POST'
      });
      // Затем удаляем аккаунт из Supabase
      const { error } = await (supabase as any)
        .from('telegram_accounts')
        .delete()
        .eq('id', accountId);
      if (error) throw error;
      setAccounts(prev => prev.filter(acc => acc.id !== accountId));
      toast({
        title: "Аккаунт удален",
        description: "Telegram аккаунт успешно удален",
      });
    } catch (error) {
      console.error('Ошибка удаления аккаунта:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить аккаунт",
        variant: "destructive"
      });
    }
  };

  const handleAccountAdded = () => {
    fetchData();
    setShowAddModal(false);
  };

  const handleManageAccount = (account: any) => {
    if (account.is_authenticated) {
      // Если аккаунт авторизован, переходим сразу к чатам
      console.log('🎯 АККАУНТ АВТОРИЗОВАН - ПЕРЕХОД К ЧАТАМ');
      navigate(`/chats/${operatorId}`);
    } else {
      // Если не авторизован, переходим к авторизации
      console.log('❌ АККАУНТ НЕ АВТОРИЗОВАН - ПЕРЕХОД К АВТОРИЗАЦИИ');
      navigate(`/auth/${operatorId}/${account.phone_number}`); // исправлено
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-end mb-4">
          <Button onClick={handleLogout} variant="outline" className="border-gray-300">
            Выйти
          </Button>
        </div>
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')}
              className="text-gray-600 hover:text-gray-800 hover:bg-white/50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад к списку операторов
            </Button>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Управление аккаунтами: {operator?.name}
            </h1>
            <p className="text-gray-600">
              Добавляйте и управляйте Telegram аккаунтами оператора
            </p>
          </div>

          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-700">
              Telegram аккаунты ({accounts.length})
            </h2>
            <Button 
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Plus className="w-4 h-4 mr-2" />
              Добавить аккаунт
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => (
              <Card key={account.id} className="hover:shadow-lg transition-shadow duration-300 border-0 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-gray-800">
                      {account.account_name}
                    </span>
                    <div className={`w-3 h-3 rounded-full ${account.is_authenticated ? 'bg-green-400' : 'bg-gray-400'}`} />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm text-gray-600">
                      <div className="flex items-center mb-2">
                        <Phone className="w-4 h-4 mr-2" />
                        <span>{account.phone_number}</span>
                      </div>
                      <div className="flex items-center mb-2">
                        <User className="w-4 h-4 mr-2" />
                        <span>{account.is_authenticated ? 'Авторизован' : 'Не авторизован'}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2" />
                        <span>{new Date(account.last_active).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleManageAccount(account)}
                        className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                        size="sm"
                      >
                        {account.is_authenticated ? 'Управление' : 'Авторизация'}
                      </Button>
                      <Button 
                        onClick={() => handleDeleteAccount(account.id, account.phone_number)}
                        variant="destructive"
                        size="sm"
                        className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {accounts.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Phone className="w-16 h-16 mx-auto mb-4 opacity-50" />
              </div>
              <h3 className="text-xl font-medium text-gray-600 mb-2">
                Нет добавленных аккаунтов
              </h3>
              <p className="text-gray-500 mb-6">
                Добавьте первый Telegram аккаунт для начала работы
              </p>
              <Button 
                onClick={() => setShowAddModal(true)}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Добавить аккаунт
              </Button>
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <AddAccountModal
          operatorId={operatorId!}
          onClose={() => setShowAddModal(false)}
          onAccountAdded={handleAccountAdded}
        />
      )}
    </div>
  );
};

export default ManageAccounts;
