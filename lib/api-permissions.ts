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

  if (!hasPermission(userRole, resource, action)) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  return {
    authorized: true,
    session: { user: { role: userRole, id: userId } },
  }
}
