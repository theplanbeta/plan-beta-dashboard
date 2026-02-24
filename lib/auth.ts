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

        // Trigger backup on successful login (fire and forget)
        if (typeof window === 'undefined') {
          const backupUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/cron/backup`
          console.log('🔄 Triggering backup on login...')

          fetch(backupUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.CRON_SECRET}`,
            },
          })
            .then(res => {
              if (res.ok) {
                return res.json().then(data => {
                  if (data.skipped) {
                    console.log('⏭️  Backup skipped (recent backup exists)')
                  } else {
                    console.log('✅ Backup triggered successfully')
                  }
                })
              } else {
                console.error('❌ Backup endpoint returned error:', res.status)
              }
            })
            .catch(err => {
              console.error('❌ Failed to trigger backup:', err.message)
              // Silently fail - backup is not critical for login
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
