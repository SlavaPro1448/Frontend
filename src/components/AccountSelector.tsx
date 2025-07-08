
import React from 'react';
import { Button } from '@/components/ui/button';
import { Phone } from 'lucide-react';

interface Account {
  id: string;
  phone_number: string;
  account_name: string;
}

interface AccountSelectorProps {
  accounts: { phone_number: string }[];
  selectedAccount: string | null;
  onAccountSelect: (phone: string | null) => void;
}

const AccountSelector: React.FC<AccountSelectorProps> = ({
  accounts,
  selectedAccount,
  onAccountSelect
}) => {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-medium text-gray-700 mb-4">
        Выберите аккаунт для просмотра чатов:
      </h3>
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedAccount === null ? "default" : "outline"}
          onClick={() => onAccountSelect(null)}
          className="flex items-center gap-2"
        >
          <Phone className="w-4 h-4" />
          Все аккаунты ({accounts.length})
        </Button>
        {accounts.map((account) => (
          <Button
            key={account.phone_number}
            variant={selectedAccount === account.phone_number ? "default" : "outline"}
            onClick={() => onAccountSelect(account.phone_number)}
            className="flex items-center gap-2"
          >
            <Phone className="w-4 h-4" />
            {account.phone_number}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default AccountSelector;
