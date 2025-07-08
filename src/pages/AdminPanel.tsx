import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import bcrypt from 'bcryptjs';

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ username: '', password: '', role: 'operator' });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (error) setError('Ошибка загрузки пользователей');
    else setUsers(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    if (!form.username || !form.password) {
      setFormError('Заполните все поля');
      setFormLoading(false);
      return;
    }
    const hash = await bcrypt.hash(form.password, 10);
    const { error } = await supabase.from('users').insert({
      id: crypto.randomUUID(),
      username: form.username,
      password_hash: hash,
      role: form.role,
      is_active: true,
      is_sso_user: false,
      is_anonymous: false
    });
    if (error) setFormError('Ошибка добавления пользователя');
    else {
      setForm({ username: '', password: '', role: 'operator' });
      fetchUsers();
    }
    setFormLoading(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('users').delete().eq('id', id);
    fetchUsers();
  };

  return (
    <div className="max-w-2xl mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Панель администратора</h1>
      <form onSubmit={handleAddUser} className="mb-8 bg-white p-4 rounded shadow">
        <div className="flex gap-2 mb-2">
          <input name="username" value={form.username} onChange={handleInput} placeholder="Логин" className="border rounded px-2 py-1 flex-1" />
          <input name="password" value={form.password} onChange={handleInput} placeholder="Пароль" type="password" className="border rounded px-2 py-1 flex-1" />
          <select name="role" value={form.role} onChange={handleInput} className="border rounded px-2 py-1">
            <option value="operator">Оператор</option>
            <option value="admin">Администратор</option>
          </select>
          <button type="submit" className="bg-blue-600 text-white px-4 rounded" disabled={formLoading}>Добавить</button>
        </div>
        {formError && <div className="text-red-600 text-sm mt-1">{formError}</div>}
      </form>
      <div className="bg-white rounded shadow p-4">
        <h2 className="text-lg font-semibold mb-4">Пользователи</h2>
        {loading ? <div>Загрузка...</div> : error ? <div className="text-red-600">{error}</div> : (
          <table className="w-full text-left">
            <thead>
              <tr>
                <th>Логин</th>
                <th>Роль</th>
                <th>Статус</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: any) => (
                <tr key={u.id}>
                  <td>{u.username}</td>
                  <td>{u.role}</td>
                  <td>{u.is_active ? 'Активен' : 'Заблокирован'}</td>
                  <td>
                    <button onClick={() => handleDelete(u.id)} className="text-red-600 hover:underline">Удалить</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminPanel; 