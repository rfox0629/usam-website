/* USA-289: the 2-minute DOS instructional walkthrough, shared by the DOS
 * sign-in page and /dos/walkthrough. Real DOS screens with a made-up demo
 * workspace; no sound, with the steps on screen, in captions, and as text.
 * WebM (VP9) is listed first for Chrome, Firefox, and Android; Safari plays
 * the H.264 MP4. Phones get the 720p files. */
export const dosWalkthroughVideo = {
  captions: "/videos/dos/dos-walkthrough-v1.en.vtt",
  duration: "1:52",
  poster: "/videos/dos/dos-walkthrough-v1-poster.jpg",
  sources: [
    { media: "(max-width: 900px)", src: "/videos/dos/dos-walkthrough-v1-720p.webm", type: "video/webm" },
    { media: "(max-width: 900px)", src: "/videos/dos/dos-walkthrough-v1-720p.mp4", type: "video/mp4" },
    { src: "/videos/dos/dos-walkthrough-v1-1080p.webm", type: "video/webm" },
    { src: "/videos/dos/dos-walkthrough-v1-1080p.mp4", type: "video/mp4" },
  ],
} as const;

// Seconds into the video where each step starts.
export const dosWalkthroughChapters = [
  {
    at: 4.4,
    detail: "Open DOS from your welcome email. New to DOS? Choose Email me a sign-in link and open the link on the same device. Used DOS before? Sign in the way you usually do.",
    title: "Sign in",
  },
  { at: 24, detail: "Home shows who needs you today: birthdays, meetings, and check-ins.", title: "Home" },
  {
    at: 35.7,
    detail: "People keeps everyone you're discipling. Open a person to see your last and next meeting, the Journey you're walking through, and what you've committed to.",
    title: "People",
  },
  { at: 59.7, detail: "Meetings shows what's coming up and what still needs logging. Tap Log Meeting when you're done.", title: "Meetings" },
  { at: 77.3, detail: "Prayer keeps every request you've promised to pray, with the people it belongs to, and what God has answered.", title: "Prayer" },
  {
    at: 89.4,
    detail: "DOS is a web app, so there's nothing to download. iPhone, in Safari: tap Share, then Add to Home Screen, then Add. Android, in Chrome: tap ⋮, then Install app or Add to Home screen.",
    title: "Add DOS to your phone",
  },
] as const;

export function walkthroughClock(seconds: number) {
  const whole = Math.floor(seconds);

  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}
