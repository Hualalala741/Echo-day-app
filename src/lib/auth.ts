import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

// Full auth: Prisma adapter persists users/accounts, JWT handles sessions
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    ...authConfig.providers,
    Credentials({   // 邮箱密码登录
      // 这个方式下nextAuth不会往数据库里创建session
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials){
        const email = credentials.email as string;
        const password = credentials.password as string;
        if(!email||!password) return null;

        const user = await prisma.user.findUnique({
          where: {email},
        });
        if(!user||!user.passwordHash) return null;

        const isValid = await bcrypt.compare(password, user.passwordHash);
        return isValid ? user : null;
      }
    })

  ]
});
