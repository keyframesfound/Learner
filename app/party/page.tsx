import PartyGate from "@/components/PartyGate";
import { raidSources } from "@/lib/party";
import { enrolledModuleIds, viewer } from "@/lib/repo";
import "./party.css";

export default async function PartyPage() {
  /* the lobby names (and can switch) the class a raid draws from; the header
     keeps no second label of its own */
  const v = await viewer();
  const allowed = v && v.role === "student" ? await enrolledModuleIds(v.id) : undefined;
  const sources = await raidSources(allowed);
  return <PartyGate sources={sources} />;
}
