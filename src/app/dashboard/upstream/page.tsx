import { UpstreamAdminClient } from "@/components/upstream/upstream-admin-client";
import { loadUpstreamPage } from "@/app/actions/upstream";

export const dynamic = "force-dynamic";

export default async function UpstreamPage() {
  return <UpstreamAdminClient data={await loadUpstreamPage()} />;
}
