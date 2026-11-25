import { NextResponse } from "next/server";
import { randomBytes, createHash } from "node:crypto";
import { entraConfig, isEntraEnabled } from "@/lib/auth/entra";

export async function GET(req: Request) {
  if (!isEntraEnabled()) return NextResponse.json({ error: "Entra ID is niet geconfigureerd" }, { status: 501 });
  const cfg = entraConfig()!;
  const state = randomBytes(16).toString("base64url");
  const nonce = randomBytes(16).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const next = new URL(req.url).searchParams.get("next") ?? "/";
  const url = new URL(cfg.authorizeUrl);
  url.search = new URLSearchParams({
    client_id: cfg.clientId, response_type: "code", redirect_uri: cfg.redirectUri, response_mode: "query",
    scope: "openid profile email", state, nonce, code_challenge: challenge, code_challenge_method: "S256",
  }).toString();
  const res = NextResponse.redirect(url);
  res.cookies.set("di_oidc", JSON.stringify({ state, nonce, verifier, next }), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/auth/entra", maxAge: 600,
  });
  return res;
}
