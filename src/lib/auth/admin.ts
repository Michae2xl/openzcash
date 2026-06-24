import { headers } from "next/headers";

/**
 * Whether the current request carries a valid admin session.
 *
 * Source of truth is the middleware: it verifies the signed session cookie and
 * stamps `x-admin` on the request headers (always overwriting any client-sent
 * value), so reading it here cannot be forged from the browser.
 */
export async function getIsAdmin(): Promise<boolean> {
  return (await headers()).get("x-admin") === "1";
}
