import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ 
    ok: true, 
    dbUrl: process.env.DATABASE_URL ? "set" : "missing",
    authSecret: process.env.AUTH_SECRET ? "set" : "missing",
    googleId: process.env.GOOGLE_CLIENT_ID ? "set" : "missing",
  });
}