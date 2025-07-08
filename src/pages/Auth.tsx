import React, { useState } from 'react';
import { ArrowLeft, Phone, Shield, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const Auth = () => {
  const [step, setStep] = useState<'phone' | 'code' | '2fa'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [phoneCodeHash, setPhoneCodeHash] = useState('');
  const navigate = useNavigate();
  const { operatorId, accountId } = useParams();

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) return;
    setIsLoading(true);
    try {
      console.log('Отправка кода для:', phoneNumber, 'оператор:', operatorId);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Таймаут запроса')), 30000)
      );
      const requestPromise = fetch('http://localhost:5001/api/send_code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneNumber,
          operator: operatorId,
          account: phoneNumber // <-- теперь всегда номер телефона
        })
      }).then(res => res.json());
      const response = await Promise.race([requestPromise, timeoutPromise]);
      console.log('Ответ от Flask API:', response);
      if (response.error) {
        console.error('Ошибка Flask API:', response.error);
        if (response.error.includes('Failed to send a request') || 
            response.error.includes('Load failed')) {
          throw new Error('Сервер временно недоступен. Попробуйте еще раз через несколько секунд.');
        }
        throw new Error(response.error || 'Ошибка при отправке кода');
      }
      if (response.success) {
        if (response.phone_code_hash) {
          setPhoneCodeHash(response.phone_code_hash);
        }
        setStep('code');
        startCountdown();
        toast({
          title: "Код отправлен",
          description: response.message || "Проверьте Telegram для получения кода подтверждения",
        });
      } else {
        throw new Error(response.error || 'Не удалось отправить код');
      }
    } catch (error) {
      console.error('Ошибка при отправке кода:', error);
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось отправить код подтверждения",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 5) return;
    setIsLoading(true);
    try {
      console.log('Проверка кода:', code, 'для номера:', phoneNumber, 'с hash:', phoneCodeHash);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Таймаут запроса')), 30000)
      );
      const requestPromise = fetch('http://localhost:5001/api/verify_code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneNumber,
          code: code,
          phone_code_hash: phoneCodeHash,
          operator: operatorId,
          account: phoneNumber // <-- теперь всегда номер телефона
        })
      }).then(res => res.json());
      const response = await Promise.race([requestPromise, timeoutPromise]);
      console.log('Ответ проверки кода:', response);
      if (response.error) {
        console.error('Ошибка проверки кода:', response.error);
        if (response.error.includes('Failed to send a request') || 
            response.error.includes('Load failed')) {
          throw new Error('Сервер временно недоступен. Попробуйте еще раз через несколько секунд.');
        }
        throw new Error(response.error || 'Ошибка при проверке кода');
      }
      if (response.two_factor_required) {
        setStep('2fa');
        toast({
          title: "Требуется пароль",
          description: "Введите пароль двухфакторной авторизации",
        });
      } else if (response.success) {
        setTimeout(() => {
          localStorage.setItem('isLoggedIn', 'true');
          navigate('/');
        }, 500);
        toast({
          title: "Успешная авторизация",
          description: "Добро пожаловать в систему",
        });
      } else {
        throw new Error(response.error || 'Неверный код подтверждения');
      }
    } catch (error) {
      console.error('Ошибка при проверке кода:', error);
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Неверный код подтверждения",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Таймаут запроса')), 30000)
      );
      const requestPromise = fetch('http://localhost:5001/api/verify_password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: password,
          operator: operatorId,
          account: phoneNumber, // <-- теперь всегда номер телефона
          phone: phoneNumber,
        })
      }).then(res => res.json());
      const response = await Promise.race([requestPromise, timeoutPromise]);
      if (response.error) {
        if (response.error.includes('Failed to send a request') || 
            response.error.includes('Load failed')) {
          throw new Error('Сервер временно недоступен. Попробуйте еще раз через несколько секунд.');
        }
        throw new Error(response.error);
      }
      if (response.success) {
        navigate('/');
        toast({
          title: "Успешная авторизация",
          description: "Добро пожаловать в систему",
        });
      }
    } catch (error) {
      console.error('Ошибка при проверке пароля:', error);
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Неверный пароль",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startCountdown = () => {
    setCanResend(false);
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResendCode = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/send_code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneNumber,
          operator: operatorId,
          account: phoneNumber // <-- теперь всегда номер телефона
        })
      }).then(res => res.json());
      if (response.success) {
        if (response.phone_code_hash) {
          setPhoneCodeHash(response.phone_code_hash);
        }
        toast({
          title: "Код отправлен повторно",
          description: "Новый код подтверждения отправлен в Telegram",
        });
        startCountdown();
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось отправить код повторно",
        variant: "destructive"
      });
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 'phone':
        return (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                Номер телефона
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+380950000000"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="pl-10 w-full"
                  required
                />
              </div>
              <p className="text-sm text-gray-500">
                Введите номер телефона, привязанный к Telegram
              </p>
            </div>
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium py-2 h-12"
              disabled={isLoading || !phoneNumber}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Отправка кода...
                </div>
              ) : (
                'Получить код'
              )}
            </Button>
          </form>
        );

      case 'code':
        return (
          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Код подтверждения
              </Label>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={5}
                  value={code}
                  onChange={(value) => setCode(value)}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <p className="text-sm text-gray-500 text-center">
                Введите 5-значный код из Telegram
              </p>
            </div>
            
            <div className="text-center">
              {canResend ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleResendCode}
                  className="text-blue-600 hover:text-blue-700"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Отправить код повторно
                </Button>
              ) : (
                <p className="text-sm text-gray-500">
                  Повторная отправка через {countdown} сек
                </p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium py-2 h-12"
              disabled={isLoading || code.length !== 5}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Проверка...
                </div>
              ) : (
                'Войти'
              )}
            </Button>
          </form>
        );

      case '2fa':
        return (
          <form onSubmit={handle2FASubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Пароль двухfaktorной авторизации
              </Label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Введите пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 w-full"
                  required
                />
              </div>
              <p className="text-sm text-gray-500">
                Введите пароль Cloud Password (если установлен)
              </p>
            </div>
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium py-2 h-12"
              disabled={isLoading || !password}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Вход...
                </div>
              ) : (
                'Войти'
              )}
            </Button>
          </form>
        );
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
              <CardTitle className="text-2xl font-bold">
                Авторизация Telegram
              </CardTitle>
              <p className="text-blue-100 text-sm mt-2">
                {step === 'phone' && 'Введите номер телефона'}
                {step === 'code' && `Код отправлен на ${phoneNumber}`}
                {step === '2fa' && 'Двухfaktorная авторизация'}
              </p>
            </CardHeader>
            <CardContent className="p-6">
              {renderStepContent()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Auth;
