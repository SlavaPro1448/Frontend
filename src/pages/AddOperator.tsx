import React, { useState } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import bcrypt from 'bcryptjs';

const AddOperator = () => {
  const [form, setForm] = useState({ username: '', password: '', operatorName: '' });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password.trim() || !form.operatorName.trim()) {
      toast({
        title: "Ошибка валидации",
        description: "Пожалуйста, заполните все поля",
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    try {
      // Проверка на уникальность логина
      const { data: existing, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('username', form.username.trim())
        .single();
      if (existing) {
        toast({
          title: "Ошибка",
          description: "Пользователь с таким логином уже существует",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      // Хешируем пароль
      const hash = await bcrypt.hash(form.password, 10);
      // Добавляем в таблицу users
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: crypto.randomUUID(),
          username: form.username.trim(),
          password_hash: hash,
          role: 'operator',
          is_active: true
        });
      if (userError) throw userError;
      // Обязательно добавляем в таблицу operators (name = username)
      await supabase.from('operators').insert({ name: form.username.trim() });
      toast({
        title: "Оператор добавлен",
        description: `Оператор ${form.username} успешно добавлен в систему`,
      });
      navigate('/');
    } catch (error) {
      console.error('Ошибка добавления оператора:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось добавить оператора. Попробуйте еще раз.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
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
          <Card className="shadow-xl border-0">
            <CardHeader className="text-center bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
              <CardTitle className="text-2xl font-bold flex items-center justify-center">
                <Plus className="w-6 h-6 mr-2" />
                Добавить оператора
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="operatorName" className="text-sm font-medium text-gray-700">
                    Имя оператора
                  </Label>
                  <Input
                    id="operatorName"
                    name="operatorName"
                    type="text"
                    placeholder="Например: Оператор Иван"
                    value={form.operatorName}
                    onChange={handleInput}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                    Логин для входа
                  </Label>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="Логин"
                    value={form.username}
                    onChange={handleInput}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Пароль
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Пароль"
                    value={form.password}
                    onChange={handleInput}
                    className="w-full"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium py-2 h-12"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Добавление...
                    </div>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Добавить оператора
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AddOperator;
