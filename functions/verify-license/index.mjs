import { Client, Databases, Query } from "node-appwrite";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60000;
const MAX_REQUESTS_PER_WINDOW = 30;

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > MAX_REQUESTS_PER_WINDOW;
}

const MAX_API_KEY_LENGTH = 128;
const MAX_LICENSE_KEY_LENGTH = 64;
const keyPattern = /^[A-Za-z0-9\-]+$/;

function validateInput(data) {
  if (!data || typeof data !== "object") return { valid: false, message: "Invalid body" };
  if (!data.api_key) return { valid: false, message: "api_key missing" };
  if (!data.license_key) return { valid: false, message: "license_key missing" };
  if (data.api_key.length > MAX_API_KEY_LENGTH) return { valid: false, message: "api_key too long" };
  if (data.license_key.length > MAX_LICENSE_KEY_LENGTH) return { valid: false, message: "license_key too long" };
  if (!keyPattern.test(data.api_key) || !keyPattern.test(data.license_key)) return { valid: false, message: "Invalid key format" };
  return { valid: true };
}

async function delayResponse(start, minDelay = 200) {
  const elapsed = Date.now() - start;
  if (elapsed < minDelay) await new Promise(r => setTimeout(r, minDelay - elapsed));
}

function getClient(env) {
  const client = new Client()
    .setEndpoint(env.APPWRITE_ENDPOINT)
    .setProject(env.APPWRITE_PROJECT_ID)
    .setKey(env.APPWRITE_API_KEY);

  return { db: new Databases(client), Query };
}

export default async ({ req, res, env, log }) => {
  const startTs = Date.now();

  if (req.method === "OPTIONS") return res.send(null, 204, corsHeaders);

  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["cf-connecting-ip"] ||
    req.headers["x-appwrite-client-ip"] ||
    "unknown";

  try {
    if (isRateLimited(ip)) {
      await delayResponse(startTs);
      return res.send(JSON.stringify({ valid: false, message: "Rate limit exceeded" }), 429, {
        ...corsHeaders,
        "Content-Type": "application/json"
      });
    }

    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    }
    catch { return res.send(JSON.stringify({ valid: false, message: "Invalid JSON" }), 400, corsHeaders); }

    const v = validateInput(body);
    if (!v.valid) {
      return res.send(JSON.stringify({ valid: false, message: v.message }), 400, corsHeaders);
    }

    const { db, Query } = getClient(env);

    const { api_key, license_key, software_id } = body;

    const apiRes = await db.listDocuments(env.DB_ID, env.COL_API_KEYS, [
      Query.equal("key_string", api_key),
      Query.equal("is_active", true),
      Query.limit(1)
    ]);

    const apiKeyRow = apiRes.documents?.[0];
    if (!apiKeyRow) {
      await delayResponse(startTs);
      return res.send(JSON.stringify({ valid: false, message: "Invalid API key" }), 401, corsHeaders);
    }

    db.updateDocument(env.DB_ID, env.COL_API_KEYS, apiKeyRow.$id, {
      last_used_at: new Date().toISOString()
    }).catch(() => { });

    const filters = [
      Query.equal("license_key", license_key),
      Query.equal("is_active", true),
      Query.limit(1)
    ];

    if (software_id) filters.push(Query.equal("software_id", software_id));

    const licRes = await db.listDocuments(env.DB_ID, env.COL_LICENSES, filters);
    const license = licRes.documents?.[0];

    if (!license) {
      await delayResponse(startTs);
      return res.send(JSON.stringify({ valid: false, message: "License invalid or inactive" }), 200, corsHeaders);
    }

    let software = null;
    try {
      const s = await db.getDocument(env.DB_ID, env.COL_SOFTWARE, license.software_id);
      software = { id: s.$id, name: s.name, version: s.version, type: s.type };
    } catch { }

    await delayResponse(startTs);

    return res.send(JSON.stringify({
      valid: true,
      message: "License valid",
      license: {
        license_key,
        software,
        buyer_name: license.buyer_name,
        buyer_email: license.buyer_email,
        start_date: license.start_date,
        end_date: license.end_date,
        created_at: license.created_at
      }
    }), 200, {
      ...corsHeaders,
      "Content-Type": "application/json"
    });

  } catch (err) {
    log(err);
    await delayResponse(startTs);
    return res.send(JSON.stringify({ valid: false, message: "Internal server error" }), 500, corsHeaders);
  }
};
