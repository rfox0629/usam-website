import { permanentRedirect } from "next/navigation";

export default function MissionRedirectPage() {
  permanentRedirect("/briefing");
}
