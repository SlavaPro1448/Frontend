
export interface Operator {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface TelegramAccount {
  id: string;
  operator_id: string;
  phone_number: string;
  account_name: string;
  session_data?: string;
  is_authenticated: boolean;
  last_active: string;
  created_at: string;
  updated_at: string;
}
