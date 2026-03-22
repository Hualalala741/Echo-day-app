import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Use the lightweight config (no Prisma) for Edge Middleware
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login).*)"],
};
