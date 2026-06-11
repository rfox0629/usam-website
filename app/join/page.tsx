import type { Metadata } from "next";
import { UsamJoinClient } from "./usam/UsamJoinClient";

export const metadata: Metadata = {
  title: "Join DOS | USA Missionaries",
  description: "Set up DOS, choose your path, and begin stewarding your field.",
};

export default function JoinPage() {
  return <UsamJoinClient />;
}
