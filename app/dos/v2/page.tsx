import type { Metadata } from "next";
import { PeopleHomeV2Prototype } from "@/src/components/dos/v2/PeopleHomeV2Prototype";

export const metadata: Metadata = {
  title: "People + Home V2 | DOS",
  robots: {
    follow: false,
    index: false,
  },
};

export default function DosPeopleHomeV2Page() {
  return <PeopleHomeV2Prototype />;
}
