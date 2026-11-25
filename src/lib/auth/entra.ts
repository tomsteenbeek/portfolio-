import "server-only";
import { createRemoteJWKSet, jwtVerify } from "jose";

/**
 * Voorbereiding Microsoft Entra ID (OpenID Connect, authorization code + PKCE).
 * Actief wanneer AUTH_MODE=entra en ENTRA_TENANT_ID / ENTRA_CLIENT_ID /
 * ENTRA_CLIENT_SECRET / APP_BASE_URL zijn gezet. Zie SECURITY.md.
 */
export function entraConfig() {
  const tenant = process.env.ENTRA_TENANT_ID;
  const clientId = process.env.ENTRA_CLIENT_ID;
  const clientSecret = process.env.ENTRA_CLIENT_SECRET;
  const baseUrl = process.env.APP_BASE_URL;
  if (!tenant || !clientId || !clientSecret || !baseUrl) return null;
  const authority = `https://login.microsoftonline.com/${tenant}/v2.0`;
  return {
    tenant,
    clientId,
    clientSecret,
    redirectUri: `${baseUrl.replace(/\/$/, "")}/api/auth/entra/callback`,
    authorizeUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
    tokenUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    issuer: authority,
    jwks: createRemoteJWKSet(new URL(`https://login.microsoftonline.com/${tenant}/discovery/v2.0/keys`)),
  };
}

export function isEntraEnabled() {
  return process.env.AUTH_MODE === "entra" && entraConfig() !== null;
}

export function isDevLoginEnabled() {
  if (process.env.AUTH_MODE !== "dev") return false;
  // Nooit in productie, tenzij expliciet (bijv. afgeschermde testomgeving)
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_DEV_LOGIN === "true";
}

export async function verifyIdToken(idToken: string, nonce: string) {
  const cfg = entraConfig();
  if (!cfg) throw new Error("Entra ID niet geconfigureerd");
  const { payload } = await jwtVerify(idToken, cfg.jwks, { issuer: cfg.issuer, audience: cfg.clientId });
  if (payload.nonce !== nonce) throw new Error("Ongeldige nonce");
  return {
    oid: String(payload.oid ?? payload.sub),
    email: String(payload.preferred_username ?? payload.email ?? "").toLowerCase(),
    name: String(payload.name ?? ""),
  };
}
