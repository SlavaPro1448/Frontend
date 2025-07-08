
-- Удаляем старое ограничение уникальности на phone_number
ALTER TABLE telegram_accounts DROP CONSTRAINT IF EXISTS telegram_accounts_phone_number_key;

-- Добавляем составное ограничение уникальности для комбинации operator_id + phone_number
ALTER TABLE telegram_accounts ADD CONSTRAINT telegram_accounts_operator_phone_unique 
UNIQUE (operator_id, phone_number);
