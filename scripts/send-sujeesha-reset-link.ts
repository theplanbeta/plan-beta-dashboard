import { prisma } from '../lib/prisma'
import crypto from 'crypto'

async function sendPasswordReset() {
  const resetToken = crypto.randomBytes(32).toString('hex')
  const resetExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

  await prisma.user.update({
    where: { email: 'sujeeshasureshbabu@gmail.com' },
    data: {
      passwordResetToken: resetToken,
      passwordResetExpiry: resetExpiry
    }
  })

  const resetUrl = `https://planbeta.app/reset-password?token=${resetToken}`

  console.log('🔐 Password Reset Link Generated!')
  console.log('\n📧 Send this link to Sujeesha:')
  console.log(`\n${resetUrl}`)
  console.log('\n⏰ Link expires in 24 hours')
  console.log('\n💡 She can use this to set a new password.')

  await prisma.$disconnect()
}

sendPasswordReset().catch(console.error)
