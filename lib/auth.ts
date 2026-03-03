import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { prisma } from "./prisma"
import { UserRole } from "@prisma/client"

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            password: true,
            active: true,
            requirePasswordChange: true,
          },
        })

        if (!user || !user.active) {
          return null
        }

        const isPasswordValid = await compare(credentials.password, user.password)

        if (!isPasswordValid) {
          return null
        }

        // Trigger backup on login as safety net (cron can be unreliable)
        // Fire-and-forget — don't block login. 10-min cooldown in backup route prevents spam.
        if (process.env.CRON_SECRET) {
          const backupUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/cron/backup`
          fetch(backupUrl, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${process.env.CRON_SECRET}` },
          }).catch(() => {
            // Silently ignore — backup is best-effort on login
          })
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          requirePasswordChange: user.requirePasswordChange,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.requirePasswordChange = (user as any).requirePasswordChange
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as UserRole
      }
      return session
    },
  },
}
