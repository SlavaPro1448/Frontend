
# Telegram API Service

Этот сервис предоставляет API для работы с Telegram через Telethon.

## Установка и запуск

1. Установите зависимости:
```bash
pip install -r requirements.txt
```

2. Запустите сервис:
```bash
python telegram_api.py
```

Сервис будет доступен на http://localhost:5000

## Деплой

### Railway
1. Создайте аккаунт на railway.app
2. Подключите GitHub репозиторий
3. Railway автоматически развернет сервис

### Heroku
1. Создайте приложение на heroku.com
2. Подключите GitHub или используйте Heroku CLI
3. Добавьте Procfile: `web: python telegram_api.py`

### VPS
1. Загрузите файлы на сервер
2. Установите зависимости
3. Запустите через gunicorn: `gunicorn -w 4 -b 0.0.0.0:5000 telegram_api:app`

## API Endpoints

- GET `/api/operators` - получить список операторов
- POST `/api/operators` - добавить оператора
- DELETE `/api/operators/<operator>` - удалить оператора
- POST `/api/auth/send-code` - отправить код подтверждения
- POST `/api/auth/verify` - проверить код
- POST `/api/auth/password` - проверить пароль 2FA
- GET `/api/chats/<operator>` - получить список чатов
- GET `/api/messages/<operator>/<chat_id>` - получить сообщения чата
