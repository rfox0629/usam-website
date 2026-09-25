import { createHmac } from "node:crypto";
const SECRET = process.env.JWT_SECRET;
const b64 = (v) => Buffer.from(JSON.stringify(v)).toString("base64url");
const sign = (c) => { const h = b64({ alg: "HS256", typ: "JWT" }), b = b64(c); return `${h}.${b}.${createHmac("sha256", SECRET).update(`${h}.${b}`).digest("base64url")}`; };
console.log(`NEXT_PUBLIC_SUPABASE_ANON_KEY=${sign({ role: "anon", iss: "local", exp: 4102444800 })}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY=${sign({ role: "service_role", iss: "local", exp: 4102444800 })}`);
