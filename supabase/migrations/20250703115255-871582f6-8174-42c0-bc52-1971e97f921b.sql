
-- Создаем таблицу операторов
CREATE TABLE public.operators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Создаем таблицу Telegram аккаунтов
CREATE TABLE public.telegram_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operator_id UUID NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL UNIQUE,
  account_name TEXT NOT NULL,
  session_data TEXT,
  is_authenticated BOOLEAN NOT NULL DEFAULT false,
  last_active TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Добавляем индексы для улучшения производительности
CREATE INDEX idx_telegram_accounts_operator_id ON public.telegram_accounts(operator_id);
CREATE INDEX idx_telegram_accounts_phone ON public.telegram_accounts(phone_number);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER update_operators_updated_at 
    BEFORE UPDATE ON public.operators 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_telegram_accounts_updated_at 
    BEFORE UPDATE ON public.telegram_accounts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
