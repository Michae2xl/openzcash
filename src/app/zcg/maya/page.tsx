import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Maya liquidity now lives inside the DeFi app (one less front-page tile).
export default function MayaRedirect() {
  redirect("/defi");
}
