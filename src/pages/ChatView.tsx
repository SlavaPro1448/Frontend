import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Play, Pause, BarChart3, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  text: string;
  timestamp: string;
  isIncoming: boolean;
  isRead: boolean;
  type: 'text' | 'voice';
  voiceUrl?: string;
  voiceDuration?: string;
  sender: string;
}

const ChatView = () => {
  const navigate = useNavigate();
  const { operatorId, chatId } = useParams();
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [chatTitle, setChatTitle] = useState('');
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadMessages();
  }, [chatId, operatorId]);

  const loadMessages = async () => {
    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');
    try {
      console.log('🔥 ЗАГРУЗКА ВСЕХ СООБЩЕНИЙ ДЛЯ ЧАТА:', chatId);
      console.log('👤 ОПЕРАТОР:', operatorId);
      if (!chatId || !chatId.includes('_')) {
        throw new Error('Неверный формат ID чата');
      }
      const phoneFromChatId = chatId.split('_')[0];
      const realChatId = chatId.split('_')[1];
      if (!phoneFromChatId || phoneFromChatId.length < 10) {
        throw new Error('Некорректный номер телефона в ID чата');
      }
      if (!realChatId || realChatId.length === 0) {
        throw new Error('Некорректный ID чата');
      }
      setPhoneNumber(phoneFromChatId);
      const apiUrl = import.meta.env.VITE_API_URL;
      // Запрос сообщений через Flask API
      const response = await fetch(`${apiUrl}/api/chat_messages/${operatorId}/${realChatId}?account=${phoneFromChatId}&limit=50`);
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      if (!data.messages) {
        throw new Error('Пустой ответ от Flask API');
      }
      setMessages(data.messages);
      setChatTitle(data.chatTitle || 'Чат');
      toast({
        title: "✅ Сообщения загружены",
        description: `Загружено ${data.messages.length} сообщений из Telegram API`,
      });
    } catch (error) {
      console.error('❌ ОШИБКА ЗАГРУЗКИ СООБЩЕНИЙ:', error);
      const errorMsg = error instanceof Error ? error.message : 'Неизвестная ошибка';
      setHasError(true);
      setErrorMessage(errorMsg);
      toast({
        title: "❌ Ошибка загрузки",
        description: errorMsg,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    loadMessages();
  };

  const stats = {
    totalMessages: messages.length,
    readMessages: messages.filter(m => m.isRead).length,
    unreadMessages: messages.filter(m => !m.isRead).length,
    incomingMessages: messages.filter(m => m.isIncoming).length
  };

  const handleDownloadVoice = (voiceUrl: string, messageId: string) => {
    toast({
      title: "Скачивание начато",
      description: "Голосовое сообщение скачивается...",
    });
    console.log(`Скачиваем голосовое сообщение: ${voiceUrl}`);
  };

  const handlePlayVoice = (messageId: string) => {
    if (playingVoice === messageId) {
      setPlayingVoice(null);
    } else {
      setPlayingVoice(messageId);
      setTimeout(() => setPlayingVoice(null), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка всех сообщений из Telegram API...</p>
        </div>
      </div>
    );
  }

  // Экран ошибки с возможностью retry
  if (hasError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <Button 
                variant="ghost" 
                onClick={() => navigate(`/chats/${operatorId}`)}
                className="text-gray-600 hover:text-gray-800 hover:bg-white/50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Назад к списку чатов
              </Button>
            </div>

            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-t-lg">
                <CardTitle className="text-xl">
                  Ошибка загрузки чата
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 text-center">
                <div className="mb-4">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-red-500 text-2xl">⚠️</span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-800 mb-2">
                    Не удалось загрузить сообщения
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {errorMessage}
                  </p>
                  <div className="flex justify-center gap-4">
                    <Button
                      onClick={handleRetry}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Попробовать снова
                    </Button>
                    <Button
                      onClick={() => navigate(`/chats/${operatorId}`)}
                      variant="outline"
                    >
                      Вернуться к чатам
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  console.log('🎨 РЕНДЕРИНГ ЧАТА С СООБЩЕНИЯМИ:', messages.length);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => navigate(`/chats/${operatorId}`)}
              className="text-gray-600 hover:text-gray-800 hover:bg-white/50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад к списку чатов
            </Button>
            
            <Button
              onClick={() => loadMessages()}
              variant="outline"
              className="border-gray-300 hover:bg-white/50"
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Обновить все сообщения
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Статистика */}
            <div className="lg:col-span-1">
              <Card className="shadow-lg border-0">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
                  <CardTitle className="text-lg flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2" />
                    Статистика
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Всего сообщений:</span>
                    <Badge variant="secondary">{stats.totalMessages}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Прочитано:</span>
                    <Badge className="bg-green-500 hover:bg-green-600">{stats.readMessages}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Непрочитано:</span>
                    <Badge className="bg-red-500 hover:bg-red-600">{stats.unreadMessages}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Входящих:</span>
                    <Badge variant="outline">{stats.incomingMessages}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Чат */}
            <div className="lg:col-span-3">
              <Card className="shadow-lg border-0 h-[600px] flex flex-col">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
                  <CardTitle className="text-lg">
                    {chatTitle} {phoneNumber && `(${phoneNumber})`}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-0 overflow-hidden">
                  <div className="h-full overflow-y-auto p-4 space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.isIncoming ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.isIncoming
                              ? 'bg-white shadow-md'
                              : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                          }`}
                        >
                          {message.type === 'text' ? (
                            <p className="text-sm">{message.text}</p>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <Button
                                size="sm"
                                variant={message.isIncoming ? "outline" : "secondary"}
                                onClick={() => handlePlayVoice(message.id)}
                                className={`w-8 h-8 p-0 ${
                                  message.isIncoming ? '' : 'bg-white/20 hover:bg-white/30 border-white/30'
                                }`}
                              >
                                {playingVoice === message.id ? (
                                  <Pause className="w-3 h-3" />
                                ) : (
                                  <Play className="w-3 h-3" />
                                )}
                              </Button>
                              <span className="text-xs">
                                🎤 {message.voiceDuration || '0:00'}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDownloadVoice(message.voiceUrl!, message.id)}
                                className={`w-6 h-6 p-0 ${
                                  message.isIncoming 
                                    ? 'hover:bg-gray-100' 
                                    : 'hover:bg-white/20 text-white'
                                }`}
                              >
                                <Download className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                          <div className="flex justify-between items-center mt-1">
                            <span className={`text-xs ${
                              message.isIncoming ? 'text-gray-500' : 'text-blue-100'
                            }`}>
                              {new Date(message.timestamp || message.date).toLocaleTimeString('ru-RU', {
                                hour: '2-digit',
                                minute: '2-digit',
                                timeZone: 'Europe/Moscow'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {messages.length === 0 && !hasError && (
            <div className="text-center py-12">
              <h3 className="text-xl font-medium text-gray-600 mb-2">
                Нет сообщений
              </h3>
              <p className="text-gray-500">
                Сообщения появятся здесь после загрузки из Telegram
              </p>
              <Button 
                onClick={() => loadMessages()}
                className="mt-4"
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Загрузить сообщения
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatView;
