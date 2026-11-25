import { NextResponse, type NextRequest } from "next/server";
import { asSystem } from "@/lib/db";
import { entraConfig, isEntraEnabled, verifyIdToken } from "@/lib/auth/entra";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/auth/session";

function fail(req: NextRequest, msg: string) {
  return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(msg)}`, req.url));
}

export async function GET(req: NextRequest) {
  if (!isEntraEnabled()) return fail(req, "Entra ID is niet geconfigureerd");
  const cfg = entraConfig()!;
  const params = req.nextUrl.searchParams;
  let stored: { state: string; nonce: string; verifier: string; next: string };
  try {
    stored = JSON.parse(req.cookies.get("di_oidc")?.value ?? "");
  } catch {
    return fail(req, "Inlogsessie verlopen, probeer opnieuw");
  }
  if (!params.get("code") || params.get("state") !== stored.state) return fail(req, "Ongeldige inlogpoging");

  const tokenRes = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: cfg.clientId, client_secret: cfg.clientSecret, grant_type: "authorization_code",
      code: params.get("code")!, redirect_uri: cfg.redirectUri, code_verifier: stored.verifier,
    }),
  });
  if (!tokenRes.ok) return fail(req, "Token kon niet worden opgehaald");
  const { id_token } = (await tokenRes.json()) as { id_token?: string };
  if (!id_token) return fail(req, "Geen ID-token ontvangen");

  let claims;
  try {
    claims = await verifyIdToken(id_token, stored.nonce);
  } catch {
    return fail(req, "ID-token ongeldig");
  }
  // Alleen vooraf geregistreerde gebruikers (geen automatische aanmaak): koppel op oid of e-mail
  const user = await asSystem((db) =>
    db.one<{ id: string }>(
      `update users set external_id = coalesce(external_id, $1), last_login_at = now()
        where is_active and (external_id = $1 or (external_id is null and lower(email) = $2)) returning id`,
      [claims.oid, claims.email],
    ),
  );
  if (!user) return fail(req, "Uw account heeft (nog) geen toegang. Neem contact op met de beheerder.");
  const next = stored.next?.startsWith("/") && !stored.next.startsWith("//") ? stored.next : "/";
  const res = NextResponse.redirect(new URL(next, req.url));
  res.cookies.set(SESSION_COOKIE, await signSession(user.id), sessionCookieOptions);
  res.cookies.set("di_oidc", "", { path: "/api/auth/entra", maxAge: 0 });
  return res;
}
