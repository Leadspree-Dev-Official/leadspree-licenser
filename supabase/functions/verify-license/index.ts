import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface VerifyRequest {
  api_key: string;
  license_key: string;
  software_id?: string;
}

// Simple in-memory rate limiter (resets on function cold start)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30; // 30 requests per minute per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count++;
  if (entry.count > MAX_REQUESTS_PER_WINDOW) {
    console.warn(`Rate limit exceeded for IP: ${ip}`);
    return true;
  }

  return false;
}

// --- Normalization helpers ---
function normalizeKey(raw: unknown): string {
  // Ensure string, trim, strip zero-width, collapse whitespace, convert Unicode dashes to ASCII hyphen
  const s = String(raw ?? '')
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '') // zero-width
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-') // all kinds of dashes -> '-'
    .replace(/\s+/g, '') // drop spaces entirely (keys shouldn't contain spaces)
    .trim();
  return s;
}

const MAX_API_KEY_LENGTH = 128;
const MAX_LICENSE_KEY_LENGTH = 64;
const MAX_SOFTWARE_ID_LENGTH = 64;

// Split patterns: API keys are usually more permissive than license keys
const LICENSE_KEY_PATTERN = /^[A-Za-z0-9-]+$/;                 // strict: alnum + hyphen
const API_KEY_PATTERN = /^[A-Za-z0-9._\-:=+/]+$/;              // allow common API key chars

function validateAndNormalizeInput(data: VerifyRequest): { valid: true; api_key: string; license_key: string } | { valid: false; message: string } {
  const api_key = normalizeKey(data.api_key);
  const license_key = normalizeKey(data.license_key);
  const software_id = data.software_id ? normalizeKey(data.software_id) : undefined;

  if (!api_key) return { valid: false, message: 'Missing api_key' };
  if (!license_key) return { valid: false, message: 'Missing license_key' };

  if (api_key.length > MAX_API_KEY_LENGTH) return { valid: false, message: 'api_key exceeds maximum length' };
  if (license_key.length > MAX_LICENSE_KEY_LENGTH) return { valid: false, message: 'license_key exceeds maximum length' };
  if (software_id && software_id.length > MAX_SOFTWARE_ID_LENGTH) return { valid: false, message: 'software_id exceeds maximum length' };

  if (!API_KEY_PATTERN.test(api_key)) return { valid: false, message: 'Invalid api_key format' };
  if (!LICENSE_KEY_PATTERN.test(license_key)) return { valid: false, message: 'Invalid license_key format' };

  // mutate-safe return of normalized values
  (data as any).api_key = api_key;
  (data as any).license_key = license_key;
  if (software_id) (data as any).software_id = software_id;

  return { valid: true, api_key, license_key };
}

// Consistent response timing to prevent timing attacks
async function delayResponse(startTime: number, minDelayMs: number = 200): Promise<void> {
  const elapsed = Date.now() - startTime;
  if (elapsed < minDelayMs) {
    await new Promise(resolve => setTimeout(resolve, minDelayMs - elapsed));
  }
}

Deno.serve(async (req) => {
  const startTime = Date.now();

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Only allow POST for verification
    if (req.method !== 'POST') {
      await delayResponse(startTime);
      return new Response(
        JSON.stringify({ valid: false, message: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('cf-connecting-ip')
      || 'unknown';

    // Check rate limit
    if (isRateLimited(clientIP)) {
      await delayResponse(startTime);
      return new Response(
        JSON.stringify({ valid: false, message: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    let requestData: VerifyRequest;
    try {
      requestData = await req.json();
    } catch {
      await delayResponse(startTime);
      return new Response(
        JSON.stringify({ valid: false, message: 'Invalid request body. Send JSON with Content-Type: application/json' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate + normalize input
    const validation = validateAndNormalizeInput(requestData);
    if (!validation.valid) {
      await delayResponse(startTime);
      return new Response(
        JSON.stringify({ valid: false, message: validation.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { api_key, license_key, software_id } = requestData;

    // Create Supabase client with service role key for admin access
    const supabaseUrl = Deno.env.get('DB_URL')!;
    const supabaseServiceKey = Deno.env.get('SERVICE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify API key is valid and active
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('id')
      .eq('key_string', api_key)
      .eq('is_active', true)
      .single();

    if (apiKeyError || !apiKeyData) {
      console.log('Invalid API key attempt from IP:', clientIP);
      await delayResponse(startTime);
      return new Response(
        JSON.stringify({ valid: false, message: 'Invalid or inactive API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update last_used_at for the API key (non-blocking)
    supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKeyData.id)
      .then(() => {}).catch(() => {});

    // Verify license key
    let licenseQuery = supabase
      .from('licenses')
      .select('license_key, buyer_name, buyer_email, is_active, start_date, end_date, created_at, software:software_id(id, name, version, type)')
      .eq('license_key', license_key)
      .eq('is_active', true);

    if (software_id) {
      licenseQuery = licenseQuery.eq('software_id', software_id);
    }

    const { data: licenseData, error: licenseError } = await licenseQuery.single();

    if (licenseError || !licenseData) {
      console.log('License verification failed from IP:', clientIP, '- Key not found or inactive');
      await delayResponse(startTime);
      return new Response(
        JSON.stringify({
          valid: false,
          message: 'License key not found or inactive'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // License is valid
    await delayResponse(startTime);
    return new Response(
      JSON.stringify({
        valid: true,
        message: 'License key is valid',
        license: {
          license_key: licenseData.license_key,
          software: (licenseData.software as unknown) as { id: string; name: string; version: string; type: string },
          buyer_name: licenseData.buyer_name,
          buyer_email: licenseData.buyer_email,
          is_active: licenseData.is_active,
          status: licenseData.is_active ? 'Active' : 'Inactive',
          start_date: licenseData.start_date,
          end_date: licenseData.end_date,
          created_at: licenseData.created_at,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error verifying license:', error);
    await delayResponse(startTime);
    return new Response(
      JSON.stringify({ valid: false, message: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
