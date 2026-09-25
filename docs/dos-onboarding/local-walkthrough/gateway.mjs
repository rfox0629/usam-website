// Local stand-in for Supabase: /rest/v1 -> PostgREST, /auth/v1 -> minimal GoTrue stub.
// Test harness only. Never deployed.
import http from "node:http";
import { createHmac, randomUUID } from "node:crypto";

const SECRET = process.env.JWT_SECRET;
const REST = "http://127.0.0.1:3001";
const passwords = new Map(); // email -> password (seeded test users only)
const log = [];

const b64 = (v) => Buffer.from(typeof v === "string" ? v : JSON.stringify(v)).toString("base64url");
export function sign(claims) {
  const head = b64({ alg: "HS256", typ: "JWT" });
  const body = b64(claims);
  return `${head}.${body}.${createHmac("sha256", SECRET).update(`${head}.${body}`).digest("base64url")}`;
}
function verify(token) {
  const [h, b, s] = (token ?? "").split(".");
  if (!s || createHmac("sha256", SECRET).update(`${h}.${b}`).digest("base64url") !== s) return null;
  const claims = JSON.parse(Buffer.from(b, "base64url").toString());
  return claims.exp && claims.exp * 1000 < Date.now() ? null : claims;
}
const serviceKey = sign({ role: "service_role", iss: "local", exp: 4102444800 });

async function rest(path, { method = "GET", body, profile = "auth" } = {}) {
  const res = await fetch(`${REST}${path}`, {
    body: body ? JSON.stringify(body) : undefined,
    headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json", "Accept-Profile": profile, "Content-Profile": profile, Prefer: "return=representation" },
    method,
  });
  const text = await res.text();
  return { data: text ? JSON.parse(text) : null, status: res.status };
}
const userJson = (row) => ({ id: row.id, aud: "authenticated", role: "authenticated", email: row.email, email_confirmed_at: row.created_at, user_metadata: row.raw_user_meta_data ?? {}, app_metadata: { provider: "email" }, created_at: row.created_at, updated_at: row.created_at });
function session(row) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return { access_token: sign({ sub: row.id, email: row.email, role: "authenticated", aud: "authenticated", exp }), token_type: "bearer", expires_in: 3600, expires_at: exp, refresh_token: randomUUID(), user: userJson(row) };
}
const readBody = (req) => new Promise((resolve) => { let d = ""; req.on("data", (c) => (d += c)); req.on("end", () => resolve(d)); });
const send = (res, status, obj) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(obj === undefined ? "" : JSON.stringify(obj)); };

async function auth(req, res, url) {
  const path = url.pathname.replace(/^\/auth\/v1/, "");
  const raw = await readBody(req);
  const body = raw ? JSON.parse(raw) : {};
  log.push({ method: req.method, path, email: body.email });
  if (path === "/admin/users" && req.method === "POST") {
    const existing = await rest(`/users?email=eq.${encodeURIComponent(body.email.toLowerCase())}`);
    if (existing.data?.length) return send(res, 422, { code: "email_exists", error_code: "email_exists", msg: "A user with this email address has already been registered" });
    if (body.password) passwords.set(body.email.toLowerCase(), body.password);
    const created = await rest("/users", { method: "POST", body: { email: body.email.toLowerCase(), raw_user_meta_data: body.user_metadata ?? {} } });
    return send(res, 200, userJson(created.data[0]));
  }
  if (path === "/user" && req.method === "GET") {
    const claims = verify((req.headers.authorization ?? "").replace(/^Bearer /, ""));
    if (!claims?.sub) return send(res, 401, { code: "bad_jwt", msg: "invalid JWT" });
    const found = await rest(`/users?id=eq.${claims.sub}`);
    return found.data?.[0] ? send(res, 200, userJson(found.data[0])) : send(res, 404, { msg: "User not found" });
  }
  if (path === "/token" && url.searchParams.get("grant_type") === "password") {
    const email = (body.email ?? "").toLowerCase();
    const found = await rest(`/users?email=eq.${encodeURIComponent(email)}`);
    if (!found.data?.[0] || passwords.get(email) !== body.password) return send(res, 400, { error: "invalid_grant", error_description: "Invalid login credentials", code: "invalid_credentials" });
    return send(res, 200, session(found.data[0]));
  }
  if (path === "/token" && url.searchParams.get("grant_type") === "refresh_token") return send(res, 400, { error: "invalid_grant" });
  if (path === "/logout") return send(res, 204);
  if (path === "/otp" || path === "/recover") return send(res, 200, {});
  if (path === "/__seed" && req.method === "POST") {
    const created = await rest("/users", { method: "POST", body: { email: body.email.toLowerCase(), raw_user_meta_data: {} } });
    passwords.set(body.email.toLowerCase(), body.password);
    return send(res, 200, created.data?.[0] ?? created);
  }
  if (path === "/__password" && req.method === "POST") { passwords.set(body.email.toLowerCase(), body.password); return send(res, 200, {}); }
  if (path === "/__log") return send(res, 200, log);
  return send(res, 404, { msg: `stub: ${req.method} ${path} not implemented` });
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  try {
    if (url.pathname.startsWith("/auth/v1")) return await auth(req, res, url);
    if (url.pathname.startsWith("/rest/v1")) {
      const target = `${REST}${url.pathname.replace(/^\/rest\/v1/, "")}${url.search}`;
      const body = ["GET", "HEAD"].includes(req.method) ? undefined : await readBody(req);
      const headers = { ...req.headers }; delete headers.host; delete headers["content-length"];
      // PostgREST trusts the Authorization JWT; the apikey header is Supabase gateway-only.
      if (!headers.authorization && headers.apikey) headers.authorization = `Bearer ${headers.apikey}`;
      const upstream = await fetch(target, { body, headers, method: req.method });
      const out = Buffer.from(await upstream.arrayBuffer());
      const h = {}; upstream.headers.forEach((v, k) => { if (!["content-encoding", "transfer-encoding", "content-length"].includes(k)) h[k] = v; });
      res.writeHead(upstream.status, h); return res.end(out);
    }
    send(res, 404, { msg: "not found" });
  } catch (error) { send(res, 500, { msg: String(error) }); }
}).listen(54321, () => console.log(`gateway on :54321 service=${serviceKey.slice(0, 12)}…`));
