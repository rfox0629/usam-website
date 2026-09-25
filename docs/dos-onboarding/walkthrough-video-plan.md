# DOS walkthrough video: plan and tracking

Status: **not recorded**. The welcome email does not link a video until the last checklist item below is done.

Tracked in Linear under USA-289 (walkthrough video workstream). The workspace hit its issue limit, so this has no separate issue yet.

## Goal

A concise demo, 3–4 minutes, linked from the DOS welcome email. It shows a newly approved person how to sign in, put DOS on their phone, and find their way around. It is recorded on a demo workspace with synthetic data only.

## Rules for recording

- Use a demo account and a demo workspace only, for example `demo.walkthrough@usamissionaries.org`. Never use a real workspace.
- Use synthetic people only: "Jordan Rivers", "Sam Taylor", "Riley Brooks". No real names, notes, prayer requests, phone numbers, or emails on screen.
- Turn off notifications on the recording phone. Set the clock to 9:41, full battery.
- Record the phone at 390×844 (iPhone, Safari) and the desktop at 1440×900 (Chrome).
- Burn in captions or provide them. Keep the voiceover warm and plain.

## Script and shot list

| # | Time | Shot | Voiceover |
|---|------|------|-----------|
| 1 | 0:00–0:15 | The welcome email on the phone, "Your DOS access is ready" | "Welcome to DOS. Your request was approved, and your workspace is ready. Here's how to get started." |
| 2 | 0:15–0:45 | Tap **Sign in to DOS** → the DOS sign-in page → **Email me a sign-in link** → the email arrives → tap the link → Home | "Tap Sign in. The first time, choose Email me a sign-in link, enter your email, and open the link on the same phone. It signs you straight in. You can set a password later if you prefer." |
| 3 | 0:45–1:15 | iPhone: Safari → Share → **Add to Home Screen** → Open as Web App on → Add → the DOS icon on the home screen. Then Android: Chrome → ⋮ → **Install app** / **Add to Home screen** | "Put DOS on your home screen. On iPhone, open DOS in Safari, tap Share, then Add to Home Screen. On Android, open Chrome's menu and tap Install app or Add to Home screen. Now DOS opens like an app." |
| 4 | 1:15–1:45 | **Home**: today's items and follow-ups | "Home shows what matters today: people to follow up with, meetings, and prayers you've promised." |
| 5 | 1:45–2:10 | **My Record** | "My Record is your own discipleship record: your rhythms, meetings, and growth." |
| 6 | 2:10–2:40 | **People**: open a synthetic person, add a note, set a follow-up | "People is everyone you're walking with. Open a person to see your history together and plan the next step." |
| 7 | 2:40–3:05 | **Meetings**: log a meeting | "After you meet with someone, log it in a few taps so nothing is forgotten." |
| 8 | 3:05–3:30 | **Groups and Journeys**: a group, a Journey or reading plan in progress | "Groups keep your small groups together, and Journeys walk people through reading plans and guided steps." |
| 9 | 3:30–3:50 | The welcome email's "Need help?" section, and the support address | "If you need help, just reply to your welcome email, or write to the support address in it." |
| 10 | 3:50–4:00 | The DOS mark | "Every person remembered. Every promise kept. Welcome to DOS." |

> The in-app **Help and Support** row under More does not link anywhere yet, so the video points to the welcome email for help. If that row gets a destination before recording, show it in shot 9 instead.

## Recording plan

1. Create the demo workspace through the normal flow: submit `/dos/setup` as the demo person, then approve it in Operations. This also exercises the real path.
2. Seed the synthetic people, one group, one Journey assignment, and two logged meetings through the app UI.
3. Screen-record the phone (iOS screen recording) and the desktop (a screen recorder at 1440×900). Record the voiceover separately.
4. Edit to 3–4 minutes and add captions. Export 1080p H.264.
5. Host it at a stable HTTPS URL that plays signed-out. Suggested: an unlisted YouTube video or Vimeo, or a Vercel Blob / Supabase Storage public file behind `usamissionaries.org`.

## Publish checklist (Done when)

- [ ] Script approved by Ryan
- [ ] Recorded on the demo workspace with synthetic data only (reviewed frame by frame for real data)
- [ ] Captions checked
- [ ] Published. Final URL: `________________`
- [ ] Verified it plays signed-out on iPhone Safari and Android Chrome
- [ ] `DOS_WALKTHROUGH_VIDEO_URL` set in Vercel **Production** to the final HTTPS URL, then redeployed
- [ ] A test welcome email (approve a test request) shows the link and the link plays
- [ ] Final URL recorded in Linear

Until `DOS_WALKTHROUGH_VIDEO_URL` is set, the email says: "A short walkthrough video is on the way. We will send you the link as soon as it is ready."
