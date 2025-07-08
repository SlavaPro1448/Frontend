
import React, { useState } from 'react';
import { X, Phone, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface AddAccountModalProps {
  operatorId: string;
  onClose: () => void;
  onAccountAdded: () => void;
}

const AddAccountModal = ({ operatorId, onClose, onAccountAdded }: AddAccountModalProps) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber.trim() || !accountName.trim()) {
      toast({
        title: "Ошибка валидации",
        description: "Пожалуйста, заполните все поля",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { data, error } = await (supabase as any)
        .from('telegram_accounts')
        .insert([
          {
            operator_id: operatorId,
            phone_number: phoneNumber.trim(),
            account_name: accountName.trim(),
            is_authenticated: false
          }
        ])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          throw new Error('Аккаунт с таким номером телефона уже существует');
        }
        throw error;
      }

      toast({
        title: "Аккаунт добавлен",
        description: `Telegram аккаунт ${accountName} успешно добавлен`,
      });
      // После добавления аккаунта сразу переходим к авторизации через Flask API
      if (data && data.id) {
        navigate(`/auth/${operatorId}/${data.id}`);
        return;
      }
      onAccountAdded();
    } catch (error: any) {
      console.error('Ошибка добавления аккаунта:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось добавить аккаунт. Попробуйте еще раз.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-800">
            Добавить Telegram аккаунт
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="accountName" className="text-sm font-medium text-gray-700">
              Название аккаунта
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                id="accountName"
                type="text"
                placeholder="Например: Основной аккаунт"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber" className="text-sm font-medium text-gray-700">
              Номер телефона
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="+380950000000"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              Отмена
            </Button>
            <Button 
              type="submit" 
              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Добавление...
                </div>
              ) : (
                'Добавить аккаунт'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAccountModal;
