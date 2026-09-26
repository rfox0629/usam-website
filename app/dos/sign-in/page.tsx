import type { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
import { safeDosNextPath } from "@/src/lib/auth/reset-next";
import { dosAppMetadata, dosAppViewport } from "@/src/lib/dos/brand-metadata";
import { getDosAuthorization } from "@/src/lib/dos/auth";
import { dosSignIn } from "./actions";
import { DosSignInVideo } from "./DosSignInVideo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...dosAppMetadata,
  description: "Sign in to DOS, the Discipleship Operating System.",
  title: { absolute: "Sign in | DOS" },
};

export const viewport: Viewport = dosAppViewport;

const errors: Record<string, string> = {
  "auth-link": "That sign-in link didn't work or has expired. Send yourself a new one.",
  config: "Sign-in isn't available right now. Please try again shortly.",
  "email-missing": "Enter your email address.",
  invalid: "That email and password didn't match. Try again, or email yourself a sign-in link.",
  "link-failed": "We couldn't send a sign-in link just now. Please try again in a moment.",
  "missing-auth-code": "That sign-in link didn't work or has expired. Send yourself a new one.",
  "missing-auth-token": "That sign-in link didn't work or has expired. Send yourself a new one.",
  "password-missing": "Enter your password, or choose Email me a sign-in link.",
  "reset-failed": "We couldn't send a password email just now. Please try again in a moment.",
};

// USA-289: the one DOS sign-in page. Requests go to /dos/setup; staff use the
// Operations sign-in (/login?next=/operations), which is not linked from DOS.
export default async function DosSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; magic?: string; next?: string; reset?: string; signedOut?: string }>;
}) {
  const params = await searchParams;
  const next = safeDosNextPath(params.next);
  const authorization = await getDosAuthorization();

  if (authorization.status === "authorized" && !params.signedOut) {
    redirect(next);
  }

  const error = params.error ? errors[params.error] ?? errors["auth-link"] : undefined;
  const notice = params.magic === "email-sent"
    ? "Check your email. If this address has DOS access, a sign-in link is on its way. Open it on this device."
    : params.reset === "email-sent"
      ? "Check your email for a link to set or reset your password."
      : params.reset === "success"
        ? "Your password is set. Sign in below."
        : params.signedOut === "1"
          ? "You're signed out."
          : undefined;

  return (
    <div className="dsi">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <header className="top">
        <div className="wrap">
          <span className="ident">
            <DosMark />
            <span>
              <span className="word">Discipleship Operating System</span>
              <span className="attrib">An initiative of USA Missionaries</span>
            </span>
          </span>
        </div>
      </header>
      <main className="wrap grid">
        <section aria-labelledby="dsi-title" className="card">
          <p className="eyebrow">DOS</p>
          <h1 id="dsi-title">Sign in to DOS</h1>
          <p className="lede">Open your DOS workspace.</p>
          {error ? <p className="msg err" role="alert">{error}</p> : null}
          {notice ? <p className="msg ok" role="status">{notice}</p> : null}
          <form action={dosSignIn} className="form">
            <input name="next" type="hidden" value={next} />
            <label className="label" htmlFor="dsi-email">Email</label>
            <input autoComplete="email" className="control" id="dsi-email" inputMode="email" name="email" required type="email" />
            <label className="label pwlabel" htmlFor="dsi-password">Password</label>
            <input autoComplete="current-password" className="control" id="dsi-password" name="password" type="password" />
            <button className="btn primary" name="intent" type="submit" value="password">Sign in</button>
            <p className="or"><span>or</span></p>
            <button className="btn secondary" formNoValidate name="intent" type="submit" value="link">Email me a sign-in link</button>
            <p className="hint">New to DOS, or no password yet? Use the sign-in link. It opens DOS on this device.</p>
            {/* Last in the form so Enter always means Sign in. */}
            <p className="alt">
              <button className="textbtn" formNoValidate name="intent" type="submit" value="reset">Forgot or set password</button>
              <a href="/dos/setup">Request DOS access</a>
            </p>
          </form>
        </section>
        <DosSignInVideo />
      </main>
      <footer className="foot">
        <div className="wrap">
          <span>Meet. Minister. Multiply.</span>
          <span>An initiative of USA Missionaries</span>
        </div>
      </footer>
    </div>
  );
}

function DosMark() {
  return (
    <svg aria-hidden="true" fill="none" height="28" viewBox="0 0 52 52" width="28">
      <circle cx="26" cy="26" fill="#378ADD" r="4.5" />
      <circle cx="26" cy="26" fill="none" r="11" stroke="#FFFFFF" strokeWidth="3.5" />
      <path d="M40.7 36.3 A18 18 0 1 1 40.7 15.7" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="3.5" />
    </svg>
  );
}

const css = `
.dsi{--navy:#0A1622;--blue:#378ADD;--blue-hi:#6FB2F0;--blue-ink:#1E6FBF;--blue-deep:#255F97;--tint:#EDF5FC;--ink:#0E1822;--muted:#5E6B78;--line:#E6EAEE;--field:#C9D2DA;--red:#B42318;
  min-height:100vh;display:flex;flex-direction:column;background:linear-gradient(180deg,var(--tint) 0,#fff 60%);color:var(--ink);font-family:'Inter',system-ui,sans-serif;line-height:1.6;-webkit-font-smoothing:antialiased;overflow-wrap:break-word}
.dsi *{box-sizing:border-box}
.dsi p,.dsi h1,.dsi h2,.dsi li,.dsi label,.dsi span{color:inherit}
.dsi .wrap{width:100%;max-width:1080px;margin:0 auto;padding:0 1.25rem}
@media (min-width:768px){.dsi .wrap{padding:0 2rem}}
.dsi .top{background:#000;border-bottom:1px solid rgba(255,255,255,.12)}
.dsi .top .wrap{display:flex;align-items:center;padding-top:.9rem;padding-bottom:.9rem}
.dsi .ident{display:flex;align-items:center;gap:.7rem;color:#fff}
.dsi .ident .word{display:block;font-family:'Oswald',sans-serif;font-weight:700;font-size:1.05rem;letter-spacing:.06em;text-transform:uppercase;line-height:1.1;color:#fff}
.dsi .ident .attrib{display:block;font-family:'Rajdhani',sans-serif;font-size:10px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:#8FA3B6}
@media (max-width:479px){.dsi .ident .word{font-size:.9rem}}
.dsi .grid{display:grid;gap:1.5rem;padding-top:2rem;padding-bottom:3rem;align-items:start}
@media (min-width:900px){.dsi .grid{grid-template-columns:minmax(0,420px) minmax(0,1fr);gap:2.5rem;padding-top:3rem}}
.dsi .card{background:#fff;border:1px solid var(--line);box-shadow:0 18px 44px rgba(14,24,34,.08);padding:1.75rem 1.5rem}
@media (min-width:640px){.dsi .card{padding:2rem 2rem 1.75rem}}
.dsi .eyebrow{margin:0;font-family:'Rajdhani',sans-serif;font-size:12px;font-weight:700;letter-spacing:.28em;text-transform:uppercase;color:var(--blue-ink)}
.dsi h1{margin:.5rem 0 0;font-family:'Oswald',sans-serif;font-weight:700;font-size:2.1rem;line-height:1.05;color:var(--ink)}
.dsi .lede{margin:.4rem 0 0;color:var(--muted)}
.dsi .msg{margin:1.1rem 0 0;padding:.75rem .9rem;font-size:.93rem;border-left:4px solid}
.dsi .msg.err{background:#FEF3F2;border-color:var(--red);color:#7A271A}
.dsi .msg.ok{background:var(--tint);border-color:var(--blue-ink);color:#123A63}
.dsi .form{margin-top:1.4rem;display:grid;gap:.45rem}
.dsi .label{font-size:.9rem;font-weight:600;color:var(--ink)}
.dsi .pwlabel{margin-top:.7rem}
.dsi .control{width:100%;min-height:50px;border:1px solid var(--field);border-radius:0;background:#fff;padding:.7rem .85rem;font:inherit;font-size:1rem;color:var(--ink);outline:none}
.dsi .control:focus{border-color:var(--blue-ink);box-shadow:0 0 0 3px rgba(55,138,221,.22)}
.dsi .btn{display:flex;align-items:center;justify-content:center;width:100%;min-height:52px;margin-top:.9rem;border:1px solid var(--blue-ink);border-radius:0;cursor:pointer;
  font-family:'Rajdhani',sans-serif;font-size:15px;font-weight:700;letter-spacing:.16em;text-transform:uppercase}
.dsi .btn.primary{background:var(--blue-ink);color:#fff}
.dsi .btn.primary:hover{background:var(--blue-deep);border-color:var(--blue-deep)}
.dsi .btn.secondary{margin-top:0;background:#fff;color:var(--blue-ink)}
.dsi .btn.secondary:hover{background:var(--tint)}
.dsi .btn:focus-visible,.dsi .textbtn:focus-visible,.dsi a:focus-visible{outline:2px solid var(--blue);outline-offset:2px}
.dsi .or{display:flex;align-items:center;gap:.75rem;margin:.9rem 0 .7rem;font-size:.8rem;color:var(--muted);text-transform:uppercase;letter-spacing:.14em}
.dsi .or::before,.dsi .or::after{content:"";flex:1;height:1px;background:var(--line)}
.dsi .hint{margin:.35rem 0 0;font-size:.86rem;color:var(--muted)}
.dsi .textbtn{background:none;border:0;padding:0;font:inherit;font-size:.85rem;color:var(--blue-ink);cursor:pointer;text-decoration:underline;text-underline-offset:3px}
.dsi .alt{display:flex;flex-wrap:wrap;justify-content:space-between;gap:.6rem 1rem;margin:1.1rem 0 0;padding-top:1rem;border-top:1px solid var(--line)}
.dsi .alt a{font-size:.85rem;color:var(--blue-ink);text-decoration:underline;text-underline-offset:3px}
.dsi .video h2{margin:0;font-family:'Oswald',sans-serif;font-weight:700;font-size:1.5rem;line-height:1.1;color:var(--ink)}
.dsi .video .sub{margin:.3rem 0 .9rem;color:var(--muted);font-size:.95rem}
.dsi .frame{position:relative;aspect-ratio:16/9;background:#070D14;border:1px solid var(--line);overflow:hidden}
.dsi .frame video{display:block;width:100%;height:100%;background:#070D14}
.dsi .play{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(7,13,20,.18);border:0;cursor:pointer;padding:0}
.dsi .play span{display:grid;place-items:center;width:84px;height:84px;border-radius:50%;background:var(--blue-ink);box-shadow:0 0 0 7px rgba(255,255,255,.22),0 12px 30px rgba(0,0,0,.35);transition:transform .15s}
.dsi .play:hover span{transform:scale(1.05)}
.dsi .play:focus-visible span{outline:3px solid #fff;outline-offset:4px}
.dsi details{margin-top:.8rem;border:1px solid var(--line);background:#fff}
.dsi summary{cursor:pointer;padding:.75rem .9rem;font-weight:600;font-size:.93rem;color:var(--blue-ink)}
.dsi details ol{margin:0;padding:0 .9rem .8rem 2.1rem;font-size:.92rem;color:var(--ink)}
.dsi details li{margin:.35rem 0}
.dsi details li b{font-weight:600}
.dsi .note{margin:.6rem 0 0;font-size:.84rem;color:var(--muted)}
.dsi .foot{margin-top:auto;background:var(--navy);padding:1.2rem 0}
.dsi .foot .wrap{display:flex;flex-wrap:wrap;justify-content:space-between;gap:.4rem 1.5rem;font-family:'Rajdhani',sans-serif;font-size:11px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:#8FA3B6}
body:has(.dsi){background:#fff !important}
body:has(.dsi) > footer{display:none !important}
`;
