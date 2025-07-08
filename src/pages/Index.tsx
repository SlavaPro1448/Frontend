import React, { useState, useEffect } from 'react';
import { Plus, Settings, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Operator, TelegramAccount } from '@/types/database';

interface OperatorWithAccounts extends Operator {
  telegram_accounts?: TelegramAccount[];
}

const Index = () => {
  const [operators, setOperators] = useState<OperatorWithAccounts[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Проверка авторизации
  React.useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const role = localStorage.getItem('role');
    const username = localStorage.getItem('username');
    if (!isLoggedIn) {
      navigate('/login');
    } else if (role === 'operator' && username) {
      // Получаем operatorId по username
      (async () => {
        const { data: operator } = await supabase
          .from('operators')
          .select('id')
          .eq('name', username)
          .single();
        if (operator && operator.id) {
          navigate(`/manage/${operator.id}`);
        }
      })();
    }
  }, [navigate]);

  const fetchOperators = async () => {
    try {
      const { data: operatorsData, error: operatorError } = await (supabase as any)
        .from('operators')
        .select(`
          *,
          telegram_accounts (*)
        `)
        .order('created_at', { ascending: false });

      if (operatorError) throw operatorError;

      setOperators(operatorsData || []);
    } catch (error) {
      console.error('Ошибка загрузки операторов:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить список операторов",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOperators();
  }, []);

  const handleManage = (operatorId: string) => {
    navigate(`/manage/${operatorId}`);
  };

  const handleDelete = async (operatorId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('operators')
        .delete()
        .eq('id', operatorId);

      if (error) throw error;

      setOperators(prev => prev.filter(op => op.id !== operatorId));
      toast({
        title: "Оператор удален",
        description: "Оператор и все его аккаунты успешно удалены из системы",
      });
    } catch (error) {
      console.error('Ошибка удаления оператора:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить оператора",
        variant: "destructive"
      });
    }
  };

  const handleAddOperator = () => {
    navigate('/add-operator');
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const getOperatorStatus = (operator: OperatorWithAccounts) => {
    if (!operator.telegram_accounts || operator.telegram_accounts.length === 0) {
      return { status: 'inactive', text: 'Нет аккаунтов' };
    }
    
    const authenticatedAccounts = operator.telegram_accounts.filter(acc => acc.is_authenticated);
    if (authenticatedAccounts.length > 0) {
      return { status: 'active', text: `${authenticatedAccounts.length} активных` };
    }
    
    return { status: 'inactive', text: `${operator.telegram_accounts.length} не авторизованы` };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка операторов...</p>
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
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Управление операторами Telegram
          </h1>
          <p className="text-gray-600">
            Централизованная система для работы с Telegram-аккаунтами
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-700">
              Зарегистрированные операторы ({operators.length})
            </h2>
            <Button 
              onClick={handleAddOperator}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Plus className="w-4 h-4 mr-2" />
              Добавить оператора
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {operators.map((operator) => {
              const { status, text } = getOperatorStatus(operator);
              return (
                <Card key={operator.id} className="hover:shadow-lg transition-shadow duration-300 border-0 shadow-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between">
                      <span className="text-lg font-semibold text-gray-800">
                        {operator.name}
                      </span>
                      <div className={`w-3 h-3 rounded-full ${
                        status === 'active' ? 'bg-green-400' : 'bg-gray-400'
                      }`} />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-sm text-gray-600">
                        <p><span className="font-medium">Аккаунтов:</span> {operator.telegram_accounts?.length || 0}</p>
                        <p><span className="font-medium">Статус:</span> {text}</p>
                        <p><span className="font-medium">Создан:</span> {new Date(operator.created_at).toLocaleDateString()}</p>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => handleManage(operator.id)}
                          className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                          size="sm"
                        >
                          <Settings className="w-4 h-4 mr-1" />
                          Управление
                        </Button>
                        <Button 
                          onClick={() => handleDelete(operator.id)}
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
              );
            })}
          </div>

          {operators.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Plus className="w-16 h-16 mx-auto mb-4 opacity-50" />
              </div>
              <h3 className="text-xl font-medium text-gray-600 mb-2">
                Нет зарегистрированных операторов
              </h3>
              <p className="text-gray-500 mb-6">
                Добавьте первого оператора для начала работы
              </p>
              <Button 
                onClick={handleAddOperator}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Добавить оператора
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
