import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, type UserRole } from './permissions'

export async function checkPermission(
  resource: string,
  action: 'read' | 'create' | 'update' | 'delete'
): Promise<
  | { authorized: true; session: { user: { role: UserRole; id: string } } }
  | { authorized: false; response: NextResponse }
> {
  const session = await getServerSession(authOptions)

  if (!session || !session.user) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const userRole = session.user.role as UserRole
  const userId = session.user.id as string

  console.log(`🔐 Permission check: user=${session.user.email || userId}, role=${userRole}, resource=${resource}, action=${action}`)

  if (!hasPermission(userRole, resource, action)) {
    console.log(`❌ Permission DENIED: ${userRole} cannot ${action} ${resource}`)
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  console.log(`✅ Permission GRANTED: ${userRole} can ${action} ${resource}`)

  return {
    authorized: true,
    session: { user: { role: userRole, id: userId } },
  }
}
