
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare, Users, User, Phone, TrendingUp } from 'lucide-react';

interface ChatItemProps {
  chat: {
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
  };
  onClick: () => void;
}

const ChatItem: React.FC<ChatItemProps> = ({ chat, onClick }) => {
  const getChatIcon = () => {
    switch (chat.type) {
      case 'group':
      case 'supergroup':
        return <Users className="w-5 h-5 text-blue-500" />;
      case 'channel':
        return <MessageSquare className="w-5 h-5 text-green-500" />;
      default:
        return <User className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      // Если уже передано отформатированное время, используем его
      if (dateString && (dateString.includes(':') || dateString.includes('.'))) {
        return dateString;
      }
      
      const date = new Date(dateString);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      
      if (hours < 24) {
        return date.toLocaleTimeString('ru-RU', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      } else {
        return date.toLocaleDateString('ru-RU', { 
          day: '2-digit', 
          month: '2-digit' 
        });
      }
    } catch {
      return '';
    }
  };

  return (
    <Card 
      className="border border-gray-200 hover:shadow-md transition-shadow cursor-pointer hover:bg-gray-50"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className="flex-shrink-0 mt-1">
              {getChatIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h5 className="font-medium text-gray-800 truncate">
                  {chat.title}
                </h5>
                {chat.last_message && (
                  <span className="text-xs text-gray-400 ml-2">
                    {formatDate(chat.last_message.date)}
                  </span>
                )}
              </div>

              {/* Показываем номер аккаунта */}
              {chat.account_phone && (
                <div className="flex items-center mb-2">
                  <Phone className="w-3 h-3 text-gray-400 mr-1" />
                  <span className="text-xs text-gray-500">
                    {chat.account_phone}
                  </span>
                </div>
              )}
              
              {chat.last_message && (
                <div className="text-sm text-gray-600">
                  {chat.last_message.from_user && (
                    <span className="font-medium text-gray-700">
                      {chat.last_message.from_user}:{' '}
                    </span>
                  )}
                  <span className="truncate">
                    {chat.last_message.text || 'Медиа'}
                  </span>
                </div>
              )}
              
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center space-x-3">
                  <span className="text-xs text-gray-400 capitalize">
                    {chat.type === 'private' ? 'Личный чат' : 
                     chat.type === 'group' ? 'Группа' : 
                     chat.type === 'supergroup' ? 'Супергруппа' : 
                     chat.type === 'channel' ? 'Канал' : chat.type}
                  </span>
                  
                  {/* Статистика входящих за сегодня */}
                  {chat.today_incoming > 0 && (
                    <div className="flex items-center text-xs text-green-600">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      <span>+{chat.today_incoming} сегодня</span>
                    </div>
                  )}
                </div>
                
                {chat.unread_count > 0 && (
                  <div className="bg-blue-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] h-5 flex items-center justify-center">
                    {chat.unread_count > 99 ? '99+' : chat.unread_count}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChatItem;
