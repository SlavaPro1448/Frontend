
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🚀 Edge Function called:', req.method, req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight handled');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📥 Processing request...');
    
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('📋 Request body received:', JSON.stringify(requestBody, null, 2));
    } catch (parseError) {
      console.log('❌ Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { action, operator, phone, code, phone_code_hash, password } = requestBody;

    // Basic validation
    if (!action) {
      console.log('❌ Missing action parameter');
      return new Response(
        JSON.stringify({ success: false, error: 'Missing action parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('🔧 Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseKey
    });
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('❌ Missing Supabase configuration');
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Python API URL and parse it properly
    let PYTHON_API_URL = Deno.env.get('PYTHON_API_URL');
    
    if (!PYTHON_API_URL) {
      console.log('❌ Missing Python API URL');
      return new Response(
        JSON.stringify({ success: false, error: 'Python API URL не настроен. Проверьте переменные окружения.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean the URL - remove trailing slash and any path components
    // Extract only the base URL (protocol + host + port)
    try {
      const url = new URL(PYTHON_API_URL);
      PYTHON_API_URL = `${url.protocol}//${url.host}`;
    } catch (error) {
      console.log('❌ Invalid Python API URL:', PYTHON_API_URL);
      return new Response(
        JSON.stringify({ success: false, error: 'Неверный формат Python API URL' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('🐍 Python API URL check:', {
      hasPythonUrl: !!PYTHON_API_URL,
      baseUrl: PYTHON_API_URL
    });

    console.log('🎯 Processing action:', action);

    // Helper function to make requests to Python API with retry logic
    const callPythonAPI = async (endpoint: string, body: any, maxRetries = 2): Promise<any> => {
      // Construct full URL properly - используем только базовый URL + эндпоинт
      const fullUrl = `${PYTHON_API_URL}${endpoint}`;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`🔄 Attempt ${attempt}/${maxRetries} to call Python API:`, fullUrl);
        
        try {
          const fetchPromise = fetch(fullUrl, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(body),
          });

          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Таймаут соединения с Python API (30 секунд)')), 30000)
          );

          const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;

          console.log('📡 Python API response status:', response.status);
          console.log('📡 Python API response URL:', response.url);
          
          const responseText = await response.text();
          console.log('📋 Python API raw response (length:', responseText.length, '):', responseText.substring(0, 1000));
          
          if (!response.ok) {
            console.log('❌ Python API error:', response.status, response.statusText);
            
            let errorMessage = `Ошибка Python API: HTTP ${response.status}`;
            try {
              const errorData = JSON.parse(responseText);
              if (errorData.error) {
                errorMessage = errorData.error;
                
                // Check if this is an asyncio error that we can retry
                if (errorMessage.includes('asyncio event loop') || 
                    errorMessage.includes('event loop') ||
                    errorMessage.includes('loop must not change')) {
                  console.log('🔄 Detected asyncio error, will retry...');
                  if (attempt < maxRetries) {
                    console.log(`⏳ Waiting 2 seconds before retry ${attempt + 1}...`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    continue; // Retry
                  }
                  errorMessage = 'Сервер временно недоступен. Попробуйте еще раз через несколько секунд.';
                }
              }
            } catch (parseError) {
              console.log('⚠️ Не удалось разобрать ответ об ошибке как JSON');
              errorMessage = `HTTP ${response.status}: ${responseText}`;
            }
            
            return { success: false, error: errorMessage };
          }

          let data;
          try {
            data = JSON.parse(responseText);
          } catch (parseError) {
            console.log('❌ JSON parse error:', parseError);
            return { success: false, error: 'Неверный ответ от Python API' };
          }

          console.log('📋 Python API parsed data:', JSON.stringify(data, null, 2));
          return data;
          
        } catch (fetchError) {
          console.log(`❌ Fetch error on attempt ${attempt}:`, fetchError);
          
          // Check if this is a network error that we can retry
          if ((fetchError.message.includes('Failed to fetch') || 
               fetchError.message.includes('NetworkError') ||
               fetchError.message.includes('Таймаут')) && attempt < maxRetries) {
            console.log(`⏳ Network error, waiting 2 seconds before retry ${attempt + 1}...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue; // Retry
          }
          
          let errorMessage = 'Не удалось подключиться к серверу авторизации';
          if (fetchError.message.includes('Таймаут')) {
            errorMessage = 'Превышено время ожидания соединения с сервером';
          } else if (fetchError.message.includes('Failed to fetch') || fetchError.message.includes('NetworkError')) {
            errorMessage = 'Сервер авторизации недоступен. Попробуйте позже.';
          }
          
          return { success: false, error: errorMessage };
        }
      }
      
      return { success: false, error: 'Максимальное количество попыток исчерпано' };
    };

    // Handle sendCode action
    if (action === 'sendCode') {
      if (!phone || !operator) {
        console.log('❌ Missing required parameters for sendCode');
        return new Response(
          JSON.stringify({ success: false, error: 'Missing required parameters: phone and operator' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('📞 Calling Python API send_code endpoint');
      
      const result = await callPythonAPI('/api/send_code', { phone: phone, operator: operator });
      
      if (result.success) {
        console.log('✅ Code sent successfully');
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: result.message || 'Код отправлен в Telegram',
            phone_code_hash: result.phone_code_hash
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        console.log('❌ Python API returned error:', result.error);
        return new Response(
          JSON.stringify({ success: false, error: result.error || 'Не удалось отправить код' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Handle verifyCode action
    if (action === 'verifyCode') {
      if (!phone || !code || !phone_code_hash || !operator) {
        console.log('❌ Missing required parameters for verifyCode:', { 
          phone: !!phone, 
          code: !!code, 
          phone_code_hash: !!phone_code_hash, 
          operator: !!operator 
        });
        return new Response(
          JSON.stringify({ success: false, error: 'Отсутствуют обязательные параметры для проверки кода' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('🔐 Calling Python API verify_code endpoint');
      console.log('🔐 Verification params:', { phone, code, phone_code_hash, operator });
      
      const requestBodyForPython = { 
        phone: phone, 
        code: code, 
        phone_code_hash: phone_code_hash,
        operator: operator 
      };
      console.log('🔐 Отправляем запрос на проверку:', JSON.stringify(requestBodyForPython));
      
      const result = await callPythonAPI('/api/verify_code', requestBodyForPython);
      
      if (result.success) {
        console.log('✅ Code verified successfully');
        
        // Update database with authentication status
        try {
          const { error: dbError } = await supabase
            .from('telegram_accounts')
            .update({ 
              is_authenticated: true,
              session_data: result.session_data ? JSON.stringify(result.session_data) : null,
              last_active: new Date().toISOString()
            })
            .eq('operator_id', operator)
            .eq('phone_number', phone);

          if (dbError) {
            console.log('❌ Database update error:', dbError);
          } else {
            console.log('✅ Database updated successfully');
          }
        } catch (dbError) {
          console.log('❌ Database operation failed:', dbError);
        }
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: result.message || 'Успешная авторизация',
            needs_password: result.two_factor_required || false
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        console.log('❌ Python API returned verification error:', result.error);
        return new Response(
          JSON.stringify({ success: false, error: result.error || 'Неверный код подтверждения' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Handle checkPassword action for 2FA
    if (action === 'checkPassword') {
      if (!phone || !password || !operator) {
        console.log('❌ Missing required parameters for checkPassword');
        return new Response(
          JSON.stringify({ success: false, error: 'Отсутствуют обязательные параметры для проверки пароля' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('🛡️ Calling Python API verify_password endpoint');
      
      const result = await callPythonAPI('/api/verify_password', { 
        phone: phone, 
        password: password,
        operator: operator 
      });
      
      if (result.success) {
        console.log('✅ 2FA verified successfully');
        
        // Update database with authentication status
        try {
          const { error: dbError } = await supabase
            .from('telegram_accounts')
            .update({ 
              is_authenticated: true,
              session_data: result.session_data ? JSON.stringify(result.session_data) : null,
              last_active: new Date().toISOString()
            })
            .eq('operator_id', operator)
            .eq('phone_number', phone);

          if (dbError) {
            console.log('❌ Database update error:', dbError);
          } else {
            console.log('✅ Database updated successfully');
          }
        } catch (dbError) {
          console.log('❌ Database operation failed:', dbError);
        }
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: result.message || 'Успешная авторизация'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        console.log('❌ Python API returned 2FA error:', result.error);
        return new Response(
          JSON.stringify({ success: false, error: result.error || 'Неверный пароль' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // For other actions, return a simple response for now
    console.log('⚠️ Action not implemented yet:', action);
    return new Response(
      JSON.stringify({ success: false, error: 'Действие не реализовано: ' + action }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.log('💥 Unexpected error in Edge Function:', error);
    console.log('💥 Error stack:', error.stack);
    return new Response(
      JSON.stringify({ success: false, error: 'Внутренняя ошибка сервера: ' + error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
