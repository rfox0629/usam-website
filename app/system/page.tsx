import { permanentRedirect } from "next/navigation";

export default function LegacySystemRedirectPage() {
  permanentRedirect("/ecosystem");
}
