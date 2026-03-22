import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// Lightweight config with NO Prisma — safe to import in Edge Middleware.
// Uses JWT strategy so middleware can verify sessions without DB access.
export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isLoginPage = nextUrl.pathname === "/login";
      if (isLoginPage) {
        return isLoggedIn ? Response.redirect(new URL("/home", nextUrl)) : true;
      }
      return isLoggedIn;
    },
    jwt({ token, user }) {
      // Persist user.id into the token on first sign-in
      if (user?.id) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      // Expose user.id from token to the session
      if (token?.id) session.user.id = token.id as string;
      return session;
    },
  },
};
