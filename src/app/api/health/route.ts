import { NextResponse } from "next/server";
import { asSystem } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await asSystem((db) => db.one("select 1"));
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "database-onbereikbaar" }, { status: 503 });
  }
}
