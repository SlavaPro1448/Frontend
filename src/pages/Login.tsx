import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import bcrypt from 'bcryptjs';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      console.log('Пробуем войти с логином:', username);
      const { data, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();
      console.log('Ответ Supabase:', data, dbError);
      if (dbError || !data) {
        setError('Неверный логин или пароль');
        setLoading(false);
        return;
      }
      console.log('Введённый пароль:', password);
      console.log('Хеш из базы:', data.password_hash);
      const valid = await bcrypt.compare(password, data.password_hash);
      console.log('Результат сравнения пароля:', valid);
      if (!valid) {
        setError('Неверный логин или пароль');
        setLoading(false);
        return;
      }
      // Сохраняем роль и флаг авторизации
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('role', data.role);
      localStorage.setItem('username', data.username);
      console.log('localStorage после входа:', {
        isLoggedIn: localStorage.getItem('isLoggedIn'),
        role: localStorage.getItem('role'),
        username: localStorage.getItem('username')
      });
      // Редирект по роли с задержкой
      setTimeout(async () => {
        if (data.role === 'admin') {
          navigate('/');
        } else {
          // Для оператора ищем operatorId по username
          const { data: operator, error: opError } = await supabase
            .from('operators')
            .select('id')
            .eq('name', data.username)
            .single();
          if (operator && operator.id) {
            navigate(`/manage/${operator.id}`);
          } else {
            setError('Не найден оператор для этого пользователя');
          }
        }
      }, 100);
    } catch (e) {
      setError('Ошибка входа');
      console.log('Ошибка входа:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Вход в систему</h2>
        <div className="mb-4">
          <label className="block mb-1 text-gray-700">Логин</label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="mb-4">
          <label className="block mb-1 text-gray-700">Пароль</label>
          <input
            type="password"
            className="w-full border rounded px-3 py-2"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <div className="mb-4 text-red-600 text-center">{error}</div>}
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded transition"
          disabled={loading}
        >
          {loading ? 'Вход...' : 'Войти'}
        </button>
      </form>
    </div>
  );
};

export default Login; 