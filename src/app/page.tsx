import { AdVaultApp } from "@/components/AdVaultApp";
import { getConnectorStatus } from "@/lib/supabase";

export default function HomePage() {
  const status = getConnectorStatus();
  return <AdVaultApp initialStatus={status} />;
}
