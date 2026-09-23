/* supabase-js talks to <url>/rest/v1/...; PostgREST serves at the root. */
import http from "node:http";

http.createServer((req, res) => {
  const path = req.url.replace(/^\/rest\/v1/, "") || "/";
  const upstream = http.request({ headers: req.headers, host: "127.0.0.1", method: req.method, path, port: Number(process.env.USA282_PGRST_PORT ?? 55321) }, (up) => {
    res.writeHead(up.statusCode ?? 500, up.headers);
    up.pipe(res);
  });
  upstream.on("error", (error) => { res.writeHead(502); res.end(String(error)); });
  req.pipe(upstream);
}).listen(Number(process.env.PROXY_PORT ?? 55320), "127.0.0.1", () => console.log("rest proxy ready"));
