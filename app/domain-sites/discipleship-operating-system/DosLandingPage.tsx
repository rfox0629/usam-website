"use client";

import { useEffect, useState, type FormEvent } from "react";
import { getString, submitPublicForm } from "@/components/forms/submitPublicForm";

const USAM_URL = "https://usamissionaries.org";
const DOS_MARKETING_SOURCE = "dos_marketing";

const interestOptions = [
  "Learn more about DOS",
  "Schedule a walkthrough",
  "Request early access",
  "Explore DOS for an organization",
] as const;

type RequestStatus = "error" | "idle" | "success";

const dosV4Css = `
.dos-v4{
  --black:#070D14;
  --navy:#0A1622;
  --navy-2:#0F2233;
  --blue:#378ADD;
  --blue-hi:#6FB2F0;
  --blue-ink:#1E6FBF;
  --blue-tint:#EDF5FC;
  --green:#2E7D5B;
  --green-hi:#63C79A;
  --green-tint:#EAF5F0;
  --ink:#0E1822;
  --muted:#5E6B78;
  --faint:#8A96A3;
  --line:#E6EAEE;
  --dline:rgba(255,255,255,.09);
  --max:1120px;
  background:#fff;
  color:var(--ink);
  font-family:'Inter',system-ui,sans-serif;
  font-size:1.03rem;
  font-feature-settings:"cv11","ss01";
  line-height:1.6;
  min-height:100vh;
  overflow-x:hidden;
  -webkit-font-smoothing:antialiased;
}
.dos-v4 *{box-sizing:border-box}
.dos-v4 ::selection{background:var(--blue);color:#fff}
.dos-v4 a{color:inherit}
.dos-v4 :focus-visible{outline:2px solid var(--blue);outline-offset:3px;border-radius:6px}
.dos-v4 .wrap{max-width:var(--max);margin:0 auto;padding:0 clamp(1.25rem,5vw,3rem)}
.dos-v4 .mono{font-family:'Rajdhani',sans-serif}
.dos-v4 .eyebrow{font-family:'Rajdhani',sans-serif;font-size:.72rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--blue-ink)}
.dos-v4 h1,.dos-v4 h2{font-family:'Oswald',sans-serif;font-weight:700;letter-spacing:0;line-height:1.04}

.dos-v4 .logo{display:flex;align-items:center;gap:.7rem;text-decoration:none}
.dos-v4 .logo svg{display:block;flex:none}
.dos-v4 .logo .txt{line-height:1}
.dos-v4 .logo .word{font-family:'Oswald',sans-serif;font-weight:700;font-size:1.15rem;letter-spacing:0}
.dos-v4 .logo .full{font-family:'Rajdhani',sans-serif;font-size:.52rem;letter-spacing:.14em;text-transform:uppercase;margin-top:.3rem}
@media (max-width:560px){.dos-v4 .logo .full{display:none}}

.dos-v4 header{position:sticky;top:0;z-index:50;background:rgba(7,13,20,.78);backdrop-filter:blur(16px);border-bottom:1px solid var(--dline)}
.dos-v4 .nav{display:flex;align-items:center;justify-content:space-between;height:66px}
.dos-v4 header .logo .word{color:#fff}
.dos-v4 header .logo .full{color:#7E92A5}
.dos-v4 .nav-actions{display:flex;align-items:center;gap:.85rem}
.dos-v4 .return-link{font-size:.88rem;font-weight:500;text-decoration:none;color:#9DB0C2;white-space:nowrap}
.dos-v4 .return-link:hover{color:#fff}
.dos-v4 .btn{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;text-decoration:none;font-weight:600;font-size:.95rem;padding:.78rem 1.5rem;border-radius:10px;transition:background .18s,color .18s,border-color .18s,box-shadow .18s,transform .18s}
.dos-v4 button.btn{font-family:inherit;cursor:pointer}
.dos-v4 .btn-primary{background:var(--blue);color:#fff;border:1px solid var(--blue)}
.dos-v4 .btn-primary:hover{background:var(--blue-hi);border-color:var(--blue-hi);box-shadow:0 8px 24px rgba(55,138,221,.35)}
.dos-v4 .btn-ghost-d{border:1px solid rgba(255,255,255,.22);color:#fff;background:transparent}
.dos-v4 .btn-ghost-d:hover{border-color:#fff}
.dos-v4 .btn-ghost-l{border:1px solid var(--line);color:var(--ink);background:#fff}
.dos-v4 .btn-ghost-l:hover{border-color:var(--ink)}
.dos-v4 .nav .btn{padding:.52rem 1.1rem;font-size:.88rem}
@media (max-width:640px){.dos-v4 .nav{gap:.65rem}.dos-v4 .nav-actions{gap:.55rem}.dos-v4 .return-link{font-size:.74rem}.dos-v4 .nav .btn{padding:.48rem .72rem;font-size:.78rem}}
@media (max-width:360px){.dos-v4 .return-link{font-size:.7rem}.dos-v4 .nav .btn{padding:.44rem .6rem;font-size:.74rem}}

.dos-v4 .hero{
  background:
    radial-gradient(75% 55% at 78% 0%,rgba(55,138,221,.28),transparent 62%),
    radial-gradient(45% 40% at 12% 100%,rgba(46,125,91,.14),transparent 65%),
    var(--black);
  color:#fff;position:relative;overflow:hidden;
  padding:clamp(4.5rem,10vh,7rem) 0 clamp(4.5rem,10vh,7rem);
}
.dos-v4 .hero::before{
  content:"";position:absolute;inset:0;pointer-events:none;
  background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);
  background-size:64px 64px;
  mask-image:radial-gradient(80% 70% at 60% 20%,#000 0%,transparent 75%);
}
.dos-v4 .hero .wrap{position:relative}
.dos-v4 .hero-grid{display:grid;grid-template-columns:minmax(0,6fr) minmax(0,5fr);gap:clamp(2.5rem,6vw,5rem);align-items:center}
@media (max-width:880px){.dos-v4 .hero-grid{grid-template-columns:1fr}}
.dos-v4 .hero .eyebrow{color:var(--blue-hi)}
.dos-v4 .hero h1{font-size:clamp(2.6rem,5.8vw,4.2rem);max-width:14ch;margin-top:1rem}
.dos-v4 .hero h1 .hl{background:linear-gradient(92deg,var(--blue-hi),#B8DCFA);-webkit-background-clip:text;background-clip:text;color:transparent}
.dos-v4 .hero .lede{margin-top:1.5rem;max-width:31rem;font-size:1.13rem;color:#A9BACB;line-height:1.7}
.dos-v4 .cta-row{display:flex;gap:.85rem;flex-wrap:wrap;margin-top:2.2rem}
.dos-v4 .hero .micro{margin-top:1.4rem;font-family:'Rajdhani',sans-serif;font-size:.72rem;font-weight:600;letter-spacing:.08em;color:#5F7488}

.dos-v4 .canvas{position:relative;min-height:clamp(360px,42vw,470px)}
.dos-v4 .moment{
  position:absolute;border-radius:8px;padding:1rem 1.15rem;max-width:262px;width:calc(100% - 2rem);
  background:linear-gradient(160deg,rgba(255,255,255,.09),rgba(255,255,255,.04));
  border:1px solid rgba(255,255,255,.14);
  backdrop-filter:blur(10px);
  box-shadow:0 24px 60px rgba(0,0,0,.45);
}
.dos-v4 .moment .k{display:flex;align-items:center;gap:.5rem;font-family:'Rajdhani',sans-serif;font-size:.62rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#7E92A5}
.dos-v4 .moment .k i{width:6px;height:6px;border-radius:50%;background:var(--blue);flex:none;box-shadow:0 0 10px rgba(55,138,221,.9)}
.dos-v4 .moment.g .k i{background:var(--green-hi);box-shadow:0 0 10px rgba(99,199,154,.8)}
.dos-v4 .moment .m{font-size:.94rem;font-weight:550;color:#F2F7FB;margin-top:.45rem;line-height:1.45}
.dos-v4 .moment .s{font-size:.8rem;color:#93A5B6;margin-top:.2rem}
.dos-v4 .moment .pill{display:inline-block;margin-top:.65rem;font-size:.68rem;font-weight:600;padding:.24rem .7rem;border-radius:999px;background:rgba(55,138,221,.18);color:var(--blue-hi);border:1px solid rgba(55,138,221,.3)}
.dos-v4 .moment.g .pill{background:rgba(99,199,154,.14);color:var(--green-hi);border-color:rgba(99,199,154,.3)}
.dos-v4 .bar{height:4px;border-radius:999px;background:rgba(255,255,255,.12);margin-top:.7rem;overflow:hidden}
.dos-v4 .bar b{display:block;height:100%;width:60%;border-radius:999px;background:linear-gradient(90deg,var(--blue),var(--blue-hi))}
@media (max-width:880px){
  .dos-v4 .canvas{min-height:0;display:grid;gap:.85rem}
  .dos-v4 .moment{position:static;max-width:none}
}

.dos-v4 .story{padding:clamp(5rem,11vh,8rem) 0;background:#fff}
.dos-v4 .story h2{font-size:clamp(2.1rem,4.6vw,3.4rem);color:var(--ink);max-width:14ch;margin-top:.9rem}
.dos-v4 .q-list{margin-top:clamp(2.5rem,6vh,3.5rem);max-width:54rem}
.dos-v4 .q{
  display:grid;grid-template-columns:auto 1fr;gap:clamp(1rem,3vw,2rem);align-items:baseline;
  padding:1.6rem 0;border-top:1px solid var(--line);
  font-size:clamp(1.15rem,2vw,1.45rem);font-weight:450;letter-spacing:0;line-height:1.45;color:var(--ink);
}
.dos-v4 .q:last-of-type{border-bottom:1px solid var(--line)}
.dos-v4 .q .lead{font-family:'Rajdhani',sans-serif;font-size:.95rem;color:#C3CDD6;font-weight:600}
.dos-v4 .q em{font-style:normal;color:var(--blue-ink)}
.dos-v4 .turn{max-width:44rem;margin-top:clamp(2.5rem,6vh,3.5rem)}
.dos-v4 .turn p{font-size:1.15rem;color:var(--muted);line-height:1.7}
.dos-v4 .turn p strong{color:var(--ink);font-weight:650}

.dos-v4 .system{
  background:
    radial-gradient(70% 60% at 20% 0%,rgba(55,138,221,.2),transparent 60%),
    var(--navy);
  color:#fff;padding:clamp(5rem,11vh,8rem) 0;position:relative;overflow:hidden;
}
.dos-v4 .system::before{
  content:"";position:absolute;inset:0;pointer-events:none;
  background-image:linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px);
  background-size:64px 64px;
  mask-image:radial-gradient(70% 60% at 30% 30%,#000,transparent 78%);
}
.dos-v4 .system .wrap{position:relative}
.dos-v4 .system .eyebrow{color:var(--blue-hi)}
.dos-v4 .system h2{font-size:clamp(2rem,4.2vw,3.1rem);max-width:15ch;margin-top:.9rem}
.dos-v4 .system .lede{margin-top:1.3rem;color:#A9BACB;font-size:1.12rem;max-width:38rem;line-height:1.7}
.dos-v4 .promise-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--dline);border:1px solid var(--dline);border-radius:8px;overflow:hidden;margin-top:clamp(2.5rem,6vh,3.5rem)}
@media (max-width:960px){.dos-v4 .promise-grid{grid-template-columns:1fr 1fr}}
@media (max-width:600px){.dos-v4 .promise-grid{grid-template-columns:1fr}}
.dos-v4 .promise{background:rgba(255,255,255,.03);padding:1.9rem 1.6rem;transition:background .2s}
.dos-v4 .promise:hover{background:rgba(255,255,255,.06)}
.dos-v4 .promise .n{font-family:'Rajdhani',sans-serif;font-size:.66rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--blue-hi)}
.dos-v4 .promise.gr .n{color:var(--green-hi)}
.dos-v4 .promise h3{font-size:1.22rem;font-weight:650;letter-spacing:0;color:#fff;margin-top:.6rem}
.dos-v4 .promise p{font-size:.94rem;color:#93A5B6;margin-top:.55rem;line-height:1.6}
.dos-v4 .system .guard{margin-top:2rem;font-size:.9rem;color:#7E92A5;max-width:40rem}

.dos-v4 .fruit{padding:clamp(4.5rem,10vh,7rem) 0;background:#fff;border-bottom:1px solid var(--line)}
.dos-v4 .fruit-grid{display:grid;grid-template-columns:minmax(0,5fr) minmax(280px,4fr);gap:clamp(2.5rem,6vw,5rem);align-items:center}
@media (max-width:820px){.dos-v4 .fruit-grid{grid-template-columns:1fr}.dos-v4 .fruit-visual{order:-1}}
.dos-v4 .fruit h2{font-size:clamp(2.1rem,4.4vw,3.2rem);color:var(--ink);max-width:13ch;margin-top:.9rem}
.dos-v4 .fruit p{font-size:1.12rem;color:var(--muted);line-height:1.7;max-width:39rem;margin-top:1.3rem}
.dos-v4 .fruit-visual{position:relative;min-height:280px;display:grid;place-items:center}
.dos-v4 .fruit-ring{position:relative;width:min(100%,310px);aspect-ratio:1;border:1px solid var(--line);border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 50% 50%,rgba(55,138,221,.1),transparent 55%)}
.dos-v4 .fruit-ring::before,.dos-v4 .fruit-ring::after{content:"";position:absolute;border-radius:50%;border:1px solid rgba(55,138,221,.26)}
.dos-v4 .fruit-ring::before{inset:13%}
.dos-v4 .fruit-ring::after{inset:28%}
.dos-v4 .fruit-core{position:relative;z-index:1;display:grid;place-items:center;width:94px;height:94px;border-radius:50%;background:var(--blue);color:#fff;text-align:center;font-family:'Rajdhani',sans-serif;font-size:.68rem;font-weight:700;letter-spacing:.13em;text-transform:uppercase;box-shadow:0 18px 42px rgba(55,138,221,.28)}
.dos-v4 .fruit-note{position:absolute;z-index:2;border:1px solid var(--line);border-radius:999px;background:#fff;color:var(--ink);font-size:.78rem;font-weight:650;padding:.38rem .78rem;box-shadow:0 12px 28px rgba(14,24,34,.08)}
.dos-v4 .fruit-note.one{top:18%;left:2%}
.dos-v4 .fruit-note.two{right:0;top:46%}
.dos-v4 .fruit-note.three{bottom:17%;left:14%}

.dos-v4 .intel{background:#FAFBFC;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:clamp(5rem,11vh,8rem) 0}
.dos-v4 .intel h2{font-size:clamp(2.1rem,4.4vw,3.2rem);color:var(--ink);max-width:16ch;margin-top:.9rem}
.dos-v4 .intel .lede{margin-top:1.3rem;color:var(--muted);font-size:1.12rem;max-width:38rem;line-height:1.7}
.dos-v4 .intel-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(1.25rem,3vw,2.5rem);margin-top:clamp(2.5rem,6vh,3.5rem)}
@media (max-width:820px){.dos-v4 .intel-grid{grid-template-columns:1fr;max-width:34rem}}
.dos-v4 .intel-item .idx{font-family:'Rajdhani',sans-serif;font-size:.7rem;font-weight:600;letter-spacing:.14em;color:var(--blue-ink);display:block}
.dos-v4 .intel-item h3{font-size:1.18rem;font-weight:650;letter-spacing:0;margin-top:.75rem;color:var(--ink)}
.dos-v4 .intel-item p{font-size:.96rem;color:var(--muted);margin-top:.55rem;max-width:30rem;line-height:1.65}
.dos-v4 .posture{
  margin-top:clamp(3.5rem,8vh,5rem);border-top:1px solid var(--line);
  padding-top:clamp(2.75rem,6vh,4rem);
  display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:clamp(2rem,5vw,4.5rem);align-items:center;
}
@media (max-width:820px){.dos-v4 .posture{grid-template-columns:1fr}}
.dos-v4 .posture .label h3{font-size:1.35rem;font-weight:700;letter-spacing:0;color:var(--ink)}
.dos-v4 .posture .label p{font-size:.96rem;color:var(--muted);margin-top:.6rem;max-width:26rem;line-height:1.65}
.dos-v4 .posture blockquote{border-left:2px solid var(--blue);padding-left:clamp(1.25rem,3vw,2rem)}
.dos-v4 .posture blockquote p{font-family:'Inter',system-ui,sans-serif;font-style:italic;font-weight:400;font-size:clamp(1.3rem,2.4vw,1.7rem);line-height:1.45;color:var(--ink)}
.dos-v4 .posture blockquote p+p{margin-top:.8rem}
.dos-v4 .posture blockquote em{color:var(--blue-ink)}
.dos-v4 .posture .support{font-family:'Rajdhani',sans-serif;font-size:.72rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--faint);margin-top:1.3rem}

.dos-v4 .trust{padding:clamp(4.5rem,10vh,7rem) 0;background:#fff}
.dos-v4 .trust-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(1.5rem,4vw,3rem)}
@media (max-width:820px){.dos-v4 .trust-grid{grid-template-columns:1fr;max-width:34rem}}
.dos-v4 .trust h3{font-size:1.1rem;font-weight:650;letter-spacing:0;color:var(--ink)}
.dos-v4 .trust p{font-size:.95rem;color:var(--muted);margin-top:.5rem;max-width:30rem}
.dos-v4 .trust .idx{font-family:'Rajdhani',sans-serif;font-size:.7rem;font-weight:600;letter-spacing:.14em;color:var(--blue-ink);display:block;margin-bottom:.8rem}

.dos-v4 .final{
  background:
    radial-gradient(60% 60% at 50% 115%,rgba(55,138,221,.34),transparent 70%),
    var(--black);
  color:#fff;text-align:center;padding:clamp(5rem,11vh,8rem) 0;position:relative;overflow:hidden;
}
.dos-v4 .final .wrap{position:relative}
.dos-v4 .final .eyebrow{color:var(--blue-hi)}
.dos-v4 .final h2{font-size:clamp(2rem,4.6vw,3.3rem);max-width:17ch;margin:.9rem auto 0}
.dos-v4 .final p{max-width:32rem;margin:1.4rem auto 0;color:#A9BACB;font-size:1.1rem}
.dos-v4 .final .cta-row{justify-content:center}
.dos-v4 .final .micro{margin-top:1.5rem;font-family:'Rajdhani',sans-serif;font-size:.72rem;font-weight:600;letter-spacing:.08em;color:#5F7488}

.dos-v4 footer{background:var(--black);border-top:1px solid var(--dline);padding:2.4rem 0 2.8rem;font-size:.9rem;color:#7E92A5}
.dos-v4 .foot{display:flex;flex-wrap:wrap;gap:1.25rem;justify-content:space-between;align-items:center}
.dos-v4 .foot nav{display:flex;gap:1.4rem;flex-wrap:wrap}
.dos-v4 .foot a{text-decoration:none}
.dos-v4 .foot a:hover{color:#fff}
.dos-v4 footer .logo .word{color:#fff}
.dos-v4 footer .logo .full{color:#5F7488}

.dos-v4 .modal-backdrop{position:fixed;inset:0;z-index:100;background:rgba(7,13,20,.82);backdrop-filter:blur(12px);overflow-y:auto;padding:1.2rem}
.dos-v4 .modal-shell{min-height:100%;display:flex;align-items:center;justify-content:center}
.dos-v4 .modal-panel{position:relative;width:min(100%,720px);border:1px solid var(--line);border-radius:8px;background:#fff;color:var(--ink);box-shadow:0 28px 80px rgba(0,0,0,.35);padding:clamp(1.3rem,4vw,2.2rem)}
.dos-v4 .modal-close{position:absolute;right:1rem;top:1rem;width:38px;height:38px;border:1px solid var(--line);border-radius:999px;background:#fff;color:var(--muted);font:inherit;font-size:1.35rem;line-height:1;cursor:pointer}
.dos-v4 .modal-close:hover{border-color:var(--ink);color:var(--ink)}
.dos-v4 .modal-header{padding-right:3rem}
.dos-v4 .modal-header h2{font-size:clamp(1.75rem,4vw,2.45rem);max-width:none;margin-top:.6rem;color:var(--ink)}
.dos-v4 .modal-header p{font-size:.98rem;color:var(--muted);max-width:35rem;margin-top:.8rem;line-height:1.65}
.dos-v4 .request-form{display:grid;gap:1rem;margin-top:1.5rem}
.dos-v4 .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
@media (max-width:640px){.dos-v4 .form-grid{grid-template-columns:1fr}.dos-v4 .modal-backdrop{padding:.8rem}.dos-v4 .modal-panel{padding:1.2rem}.dos-v4 .modal-header{padding-right:2.7rem}}
.dos-v4 .field{display:grid;gap:.35rem}
.dos-v4 .field span{font-size:.78rem;font-weight:650;color:var(--ink)}
.dos-v4 .field input,.dos-v4 .field select,.dos-v4 .field textarea{width:100%;border:1px solid var(--line);border-radius:8px;background:#fff;color:var(--ink);font:inherit;font-size:.94rem;padding:.72rem .82rem}
.dos-v4 .field textarea{min-height:118px;resize:vertical}
.dos-v4 .field input:focus,.dos-v4 .field select:focus,.dos-v4 .field textarea:focus{outline:2px solid rgba(55,138,221,.35);border-color:var(--blue)}
.dos-v4 .field.full{grid-column:1 / -1}
.dos-v4 .hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
.dos-v4 .privacy-note{font-size:.82rem;color:var(--muted);margin:0}
.dos-v4 .form-actions{display:flex;align-items:center;gap:.85rem;flex-wrap:wrap}
.dos-v4 .form-message{border:1px solid rgba(55,138,221,.28);border-radius:8px;background:var(--blue-tint);color:var(--ink);padding:.95rem 1rem;font-size:.94rem;line-height:1.55}
.dos-v4 .form-message.error{border-color:rgba(185,28,28,.26);background:#FEF2F2;color:#7F1D1D}

.dos-v4 .reveal{opacity:0;transform:translateY(14px);transition:opacity .6s ease,transform .6s ease}
.dos-v4 .reveal.in{opacity:1;transform:none}
@media (prefers-reduced-motion:reduce){.dos-v4 .reveal{opacity:1;transform:none;transition:none}}
`;

function DosMark({ size = 30 }: { size?: number }) {
  return (
    <svg aria-hidden="true" fill="none" height={size} viewBox="0 0 52 52" width={size}>
      <circle cx="26" cy="26" fill="#378ADD" r="4.5" />
      <circle cx="26" cy="26" fill="none" r="11" stroke="#FFFFFF" strokeWidth="3.5" />
      <path d="M40.7 36.3 A18 18 0 1 1 40.7 15.7" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="3.5" />
    </svg>
  );
}

export function DosLandingPage() {
  const [errorMessage, setErrorMessage] = useState("");
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestStatus, setRequestStatus] = useState<RequestStatus>("idle");

  useEffect(() => {
    const revealTargets = Array.from(document.querySelectorAll<HTMLElement>(".dos-v4 .reveal"));
    const observer = typeof IntersectionObserver === "undefined"
      ? null
      : new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("in");
              observer?.unobserve(entry.target);
            }
          });
        }, { threshold: 0.12 });

    if (observer) {
      revealTargets.forEach((target) => observer.observe(target));
    } else {
      revealTargets.forEach((target) => target.classList.add("in"));
    }

    return () => observer?.disconnect();
  }, []);

  useEffect(() => {
    if (!isRequestOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsRequestOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isRequestOpen]);

  function openRequestForm() {
    setErrorMessage("");
    setRequestStatus("idle");
    setIsRequestOpen(true);
  }

  async function handleRequestSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);
    setRequestStatus("idle");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = getString(formData, "email");
    const firstName = getString(formData, "first_name");
    const lastName = getString(formData, "last_name");
    const message = getString(formData, "message");
    const organization = getString(formData, "organization");
    const phone = getString(formData, "phone");
    const primaryInterest = getString(formData, "primary_interest");
    const role = getString(formData, "role");
    const website = getString(formData, "website");

    try {
      await submitPublicForm({
        email,
        firstName,
        formType: "dos_walkthrough_request",
        lastName,
        message,
        payload: {
          email,
          first_name: firstName,
          form_name: "DOS Request Information",
          last_name: lastName,
          message,
          organization_or_ministry_name: organization,
          phone,
          primary_interest: primaryInterest,
          role,
          source: DOS_MARKETING_SOURCE,
          source_path: typeof window === "undefined" ? "" : window.location.pathname,
        },
        phone,
        sourcePage: DOS_MARKETING_SOURCE,
        website,
      });

      form.reset();
      setRequestStatus("success");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to submit this request.");
      setRequestStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="dos-v4" data-domain-site="discipleship-operating-system">
      <style dangerouslySetInnerHTML={{ __html: dosV4Css }} />

      <header>
        <div className="wrap nav">
          <a aria-label="DOS, Discipleship Operating System, home" className="logo" href="#top">
            <DosMark />
            <span className="txt">
              <span className="word">DOS</span>
              <span className="full" style={{ display: "block" }}>Discipleship Operating System</span>
            </span>
          </a>
          <div className="nav-actions">
            <a className="return-link" href={USAM_URL}>USA Missionaries</a>
            <button className="btn btn-primary" onClick={openRequestForm} type="button">Request Information</button>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="wrap hero-grid">
            <div>
              <p className="eyebrow reveal">The operating system for intentional discipleship</p>
              <h1 className="reveal">Never lose a person or a <span className="hl">moment that matters.</span></h1>
              <p className="lede reveal">DOS is one clear, simple place for the people you&apos;re discipling, the prayers you&apos;ve promised, and the rhythms you share, so nothing meaningful slips away.</p>
              <div className="cta-row reveal">
                <button className="btn btn-primary" onClick={openRequestForm} type="button">Request Information</button>
              </div>
              <p className="micro reveal">AVAILABLE BY REQUEST &middot; NO PUBLIC PRICING &middot; NO NOISE</p>
            </div>
            <div className="canvas reveal" role="img" aria-label="Illustrations of the kinds of moments DOS helps you keep">
              <div className="moment" style={{ left: "4%", top: "6%" }}>
                <div className="k"><i aria-hidden="true" />Follow-up</div>
                <div className="m">Coffee with James went deep last week.</div>
                <div className="s">You said you&apos;d check in Thursday.</div>
                <span className="pill">On your radar</span>
              </div>
              <div className="moment g" style={{ right: "2%", top: "38%" }}>
                <div className="k"><i aria-hidden="true" />Answered prayer</div>
                <div className="m">Rachel got the job.</div>
                <div className="s">You&apos;ve been praying since spring.</div>
                <span className="pill">Celebrate this</span>
              </div>
              <div className="moment" style={{ bottom: "5%", left: "10%" }}>
                <div className="k"><i aria-hidden="true" />Shared rhythm</div>
                <div className="m">New Testament sprint, day 18.</div>
                <div className="s">All five of you are still in it.</div>
                <div aria-hidden="true" className="bar"><b /></div>
              </div>
            </div>
          </div>
        </section>

        <section className="story" id="story">
          <div className="wrap">
            <p className="eyebrow reveal">Be honest</p>
            <h2 className="reveal">How many times have you...</h2>
            <div className="q-list">
              <p className="q reveal"><span className="lead">01</span><span>...sat down with someone, landed on a real next step, <em>and forgot to follow up?</em></span></p>
              <p className="q reveal"><span className="lead">02</span><span>...said <em>&quot;I&apos;m praying for you,&quot;</em> with nowhere you actually keep those requests, and pray them?</span></p>
              <p className="q reveal"><span className="lead">03</span><span>...watched God answer a prayer, <em>and never paused to celebrate it?</em></span></p>
              <p className="q reveal"><span className="lead">04</span><span>...started a reading plan or a book study with a few people, and watched it quietly die by week three?</span></p>
              <p className="q reveal"><span className="lead">05</span><span>...wanted real accountability, but had no honest way to keep it going <em>without someone chasing everyone down?</em></span></p>
            </div>
            <div className="turn reveal">
              <p>It&apos;s not that you don&apos;t care. You care deeply. But real ministry means dozens of people, hundreds of conversations, shared commitments, and countless things worth remembering, all held in your head, your notes app, and your best intentions.</p>
              <p style={{ marginTop: "1.1rem" }}><strong>Care at that scale needs a system.</strong></p>
            </div>
          </div>
        </section>

        <section className="system" id="memory">
          <div className="wrap">
            <p className="eyebrow reveal">More than reminders</p>
            <h2 className="reveal">A memory and an accountability partner, in one system.</h2>
            <p className="lede reveal">DOS quietly holds every person, promise, prayer, and shared rhythm, and brings the right one back to you at the right time. You stay present with people. DOS keeps the record.</p>
            <div className="promise-grid">
              <div className="promise reveal">
                <p className="n">Remember</p>
                <h3>Every person, known.</h3>
                <p>The conversations you&apos;ve had, the needs they&apos;ve shared, the story you&apos;re part of. Kept, not scattered.</p>
              </div>
              <div className="promise reveal">
                <p className="n">Follow through</p>
                <h3>Every promise, kept.</h3>
                <p>When you say &quot;I&apos;ll follow up&quot; or &quot;I&apos;m praying for you,&quot; DOS makes sure you actually do. Gently, on time.</p>
              </div>
              <div className="promise reveal">
                <p className="n">Grow together</p>
                <h3>Every rhythm, alive.</h3>
                <p>Scripture sprints, book studies, shared commitments. Accountability that keeps going without anyone chasing anyone down.</p>
              </div>
              <div className="promise gr reveal">
                <p className="n">Celebrate</p>
                <h3>Every answer, seen.</h3>
                <p>Look back and see what God has done: answered prayers, changed lives, and evidence of His faithfulness over time.</p>
              </div>
            </div>
            <p className="guard reveal">That&apos;s the shape of it. The rest is best experienced in a walkthrough, on purpose. We&apos;d rather show you than publish the playbook.</p>
          </div>
        </section>

        <section className="fruit" id="fruit">
          <div className="wrap fruit-grid">
            <div>
              <p className="eyebrow reveal">Visible growth over time</p>
              <h2 className="reveal">You Will Know Them by Their Fruit</h2>
              <p className="reveal">Ministry is more than meetings, notes, and activity. Jesus taught that a tree is known by its fruit. DOS helps ministries remember what happened, follow through faithfully, and see whether discipleship is producing real growth over time.</p>
            </div>
            <div className="fruit-visual reveal" aria-hidden="true">
              <div className="fruit-ring">
                <span className="fruit-core">Fruit Over Time</span>
              </div>
              <span className="fruit-note one">Remember</span>
              <span className="fruit-note two">Follow Through</span>
              <span className="fruit-note three">Discern Growth</span>
            </div>
          </div>
        </section>

        <section className="intel" id="intelligence">
          <div className="wrap">
            <p className="eyebrow reveal">Intelligent by design</p>
            <h2 className="reveal">It doesn&apos;t just remember. It discerns.</h2>
            <p className="lede reveal">Anyone can store notes. DOS understands what it holds: it reads the whole picture of your ministry and turns it into discernment you can act on.</p>
            <div className="intel-grid">
              <div className="intel-item reveal">
                <span className="idx">01</span>
                <h3>It surfaces the right person at the right time.</h3>
                <p>Not a feed of everything. The one conversation, prayer, or follow-up that matters most today, brought to you before it slips.</p>
              </div>
              <div className="intel-item reveal">
                <span className="idx">02</span>
                <h3>It notices what you&apos;d miss.</h3>
                <p>Across months of ministry, patterns emerge: who&apos;s growing, who&apos;s quietly drifting, and what God keeps doing. DOS sees the long arc, so you can respond to it.</p>
              </div>
              <div className="intel-item reveal">
                <span className="idx">03</span>
                <h3>It connects your walk to your ministry.</h3>
                <p>You can&apos;t pour out what you&apos;re not receiving. DOS holds your own time with God alongside the people you care for, and keeps both honest.</p>
              </div>
            </div>
            <div className="posture reveal">
              <div className="label">
                <h3>Intelligence, surrendered.</h3>
                <p>All of that insight exists for one purpose: to help you respond faithfully to what God may be revealing. This is the posture the entire system is built on.</p>
              </div>
              <blockquote>
                <p>Pride says, <em>&quot;Here is my data.&quot;</em></p>
                <p>Humility says, <em>&quot;Here is the data, Lord. What do You want me to do with it?&quot;</em></p>
                <p className="support">Faithfulness over performance</p>
              </blockquote>
            </div>
          </div>
        </section>

        <section className="trust" id="trust">
          <div className="wrap trust-grid">
            <div className="reveal">
              <span className="idx">01</span>
              <h3>Accountability without surveillance</h3>
              <p>Loving accountability that helps people follow through, never systems that make them feel watched. Privacy and dignity by design.</p>
            </div>
            <div className="reveal">
              <span className="idx">02</span>
              <h3>People, never numbers</h3>
              <p>Nothing in DOS reduces a person to a metric. Every view exists to help you care for someone better, not to score them.</p>
            </div>
            <div className="reveal">
              <span className="idx">03</span>
              <h3>Built for disciple-makers</h3>
              <p>For individuals, missionaries, churches, and ministry organizations who take intentional discipleship seriously.</p>
            </div>
          </div>
        </section>

        <section className="final" id="access">
          <div className="wrap">
            <p className="eyebrow reveal">Matthew 28:19-20</p>
            <h2 className="reveal">Built to multiply.</h2>
            <p className="reveal">&quot;Go therefore and make disciples of all nations.&quot; That command is the reason DOS exists: every person remembered, every promise kept, every disciple equipped to make disciples. DOS is not designed to help you become more productive. It is designed to help you faithfully fulfill the Great Commission.</p>
            <div className="cta-row reveal">
              <button className="btn btn-primary" onClick={openRequestForm} type="button">Request Information</button>
            </div>
            <p className="micro reveal">NO SELF-SERVICE SIGNUP &middot; NO CREDIT CARD &middot; A CONVERSATION FIRST</p>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap foot">
          <a aria-label="DOS home" className="logo" href="#top">
            <DosMark size={26} />
            <span className="txt">
              <span className="word">DOS</span>
              <span className="full" style={{ display: "block" }}>An initiative of USA Missionaries</span>
            </span>
          </a>
          <nav aria-label="Footer">
            <button className="btn btn-ghost-d" onClick={openRequestForm} type="button">Request Information</button>
            <a href={USAM_URL}>Powered by USA Missionaries</a>
          </nav>
        </div>
      </footer>

      {isRequestOpen ? (
        <div
          className="modal-backdrop"
          onMouseDown={() => setIsRequestOpen(false)}
          role="presentation"
        >
          <div className="modal-shell">
            <div
              aria-describedby="request-information-description"
              aria-labelledby="request-information-title"
              aria-modal="true"
              className="modal-panel"
              onMouseDown={(event) => event.stopPropagation()}
              role="dialog"
            >
              <button
                aria-label="Close Request Information form"
                className="modal-close"
                onClick={() => setIsRequestOpen(false)}
                type="button"
              >
                &times;
              </button>
              <div className="modal-header">
                <p className="eyebrow">DOS</p>
                <h2 id="request-information-title">Request Information</h2>
                <p id="request-information-description">Tell us where DOS may fit. Someone from USA Missionaries will follow up with more information.</p>
              </div>

              {requestStatus === "success" ? (
                <div className="request-form">
                  <div className="form-message">
                    Thank you. Someone from USA Missionaries will follow up with more information about DOS.
                  </div>
                  <div className="form-actions">
                    <button className="btn btn-primary" onClick={() => setIsRequestOpen(false)} type="button">Close</button>
                  </div>
                </div>
              ) : (
                <form className="request-form" onSubmit={handleRequestSubmit}>
                  <div className="hp" aria-hidden="true">
                    <label>
                      Website
                      <input autoComplete="off" name="website" tabIndex={-1} type="text" />
                    </label>
                  </div>
                  <div className="form-grid">
                    <label className="field">
                      <span>First name</span>
                      <input autoComplete="given-name" autoFocus name="first_name" required type="text" />
                    </label>
                    <label className="field">
                      <span>Last name</span>
                      <input autoComplete="family-name" name="last_name" required type="text" />
                    </label>
                    <label className="field">
                      <span>Email</span>
                      <input autoComplete="email" name="email" required type="email" />
                    </label>
                    <label className="field">
                      <span>Phone</span>
                      <input autoComplete="tel" name="phone" type="tel" />
                    </label>
                    <label className="field">
                      <span>Organization or ministry name</span>
                      <input autoComplete="organization" name="organization" type="text" />
                    </label>
                    <label className="field">
                      <span>Role</span>
                      <input autoComplete="organization-title" name="role" type="text" />
                    </label>
                    <label className="field full">
                      <span>Primary interest</span>
                      <select defaultValue="" name="primary_interest" required>
                        <option disabled value="">Select one</option>
                        {interestOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </label>
                    <label className="field full">
                      <span>Message</span>
                      <textarea name="message" rows={4} />
                    </label>
                  </div>

                  {requestStatus === "error" ? (
                    <div className="form-message error">
                      {errorMessage || "Something went wrong. Please try again."}
                    </div>
                  ) : null}

                  <p className="privacy-note">Your information is used only so USA Missionaries can follow up about DOS.</p>
                  <div className="form-actions">
                    <button className="btn btn-primary" disabled={isSubmitting} type="submit">
                      {isSubmitting ? "Submitting..." : "Submit Request"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
