import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyRequest {
  api_key: string;
  license_key: string;
  software_id?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { api_key, license_key, software_id }: VerifyRequest = await req.json();

    if (!api_key || !license_key) {
      return new Response(
        JSON.stringify({ valid: false, message: 'Missing api_key or license_key' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role key for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify API key is valid and active
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('key_string', api_key)
      .eq('is_active', true)
      .single();

    if (apiKeyError || !apiKeyData) {
      console.error('Invalid API key:', apiKeyError);
      return new Response(
        JSON.stringify({ valid: false, message: 'Invalid or inactive API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update last_used_at for the API key
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKeyData.id);

    // Verify license key
    let licenseQuery = supabase
      .from('licenses')
      .select('*, software(*)')
      .eq('license_key', license_key)
      .eq('is_active', true);

    // Optionally filter by software_id if provided
    if (software_id) {
      licenseQuery = licenseQuery.eq('software_id', software_id);
    }

    const { data: licenseData, error: licenseError } = await licenseQuery.single();

    if (licenseError || !licenseData) {
      console.log('License not found or inactive:', licenseError);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          message: 'License key not found or inactive' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // License is valid
    return new Response(
      JSON.stringify({
        valid: true,
        message: 'License key is valid',
        license: {
          license_key: licenseData.license_key,
          software: {
            id: licenseData.software.id,
            name: licenseData.software.name,
            version: licenseData.software.version,
            type: licenseData.software.type,
          },
          buyer_name: licenseData.buyer_name,
          buyer_email: licenseData.buyer_email,
          is_active: licenseData.is_active,
          start_date: licenseData.start_date,
          end_date: licenseData.end_date,
          created_at: licenseData.created_at,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error verifying license:', error);
    return new Response(
      JSON.stringify({ valid: false, message: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
