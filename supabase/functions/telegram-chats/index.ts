
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, phoneNumber, chatId, operatorId } = await req.json();
    console.log('🔥 ЗАПРОС К TELEGRAM API:', { action, phoneNumber, chatId, operatorId });

    const pythonApiUrl = Deno.env.get('PYTHON_API_URL');
    if (!pythonApiUrl) {
      console.error('❌ PYTHON_API_URL не настроен');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Python API URL не настроен'
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('🌐 ОТПРАВКА ЗАПРОСА НА:', pythonApiUrl);

    let apiUrl = '';
    let requestBody = {};

    // Правильное сопоставление действий с маршрутами Python API
    if (action === 'getDialogs') {
      apiUrl = `${pythonApiUrl}/api/chats/${operatorId}?phone=${encodeURIComponent(phoneNumber)}`;
      // GET запрос, тело не нужно
    } else if (action === 'getMessages') {
      apiUrl = `${pythonApiUrl}/api/messages/${operatorId}/${chatId}?phone=${encodeURIComponent(phoneNumber)}`;
      // GET запрос, тело не нужно
    } else {
      console.error('❌ НЕИЗВЕСТНОЕ ДЕЙСТВИЕ:', action);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Неизвестное действие: ${action}`
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('📡 ОТПРАВКА GET ЗАПРОСА НА:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    console.log('📡 СТАТУС ОТВЕТА PYTHON API:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ ОШИБКА PYTHON API:', errorText);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: `Python API ошибка: ${response.status} - ${errorText}`
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await response.json();
    console.log('✅ УСПЕШНЫЙ ОТВЕТ ОТ PYTHON API:', data);

    return new Response(
      JSON.stringify(data),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА EDGE FUNCTION:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: `Критическая ошибка: ${error.message}`
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
