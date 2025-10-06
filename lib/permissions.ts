// Role-based permissions and access control

export type UserRole = 'FOUNDER' | 'MARKETING' | 'TEACHER'

export interface Permission {
  read: boolean
  create: boolean
  update: boolean
  delete: boolean
}

// Define permissions for each role and resource
export const PERMISSIONS: Record<
  UserRole,
  Record<string, Permission>
> = {
  FOUNDER: {
    students: { read: true, create: true, update: true, delete: true },
    batches: { read: true, create: true, update: true, delete: true },
    payments: { read: true, create: true, update: true, delete: true },
    attendance: { read: true, create: true, update: true, delete: true },
    referrals: { read: true, create: true, update: true, delete: true },
    analytics: { read: true, create: true, update: true, delete: true },
    insights: { read: true, create: true, update: true, delete: true },
    users: { read: true, create: true, update: true, delete: true },
    leads: { read: true, create: true, update: true, delete: true },
    teachers: { read: true, create: true, update: true, delete: true },
  },
  MARKETING: {
    students: { read: true, create: true, update: true, delete: false },
    batches: { read: true, create: true, update: true, delete: false },
    payments: { read: false, create: false, update: false, delete: false },
    attendance: { read: false, create: false, update: false, delete: false },
    referrals: { read: true, create: true, update: true, delete: false },
    analytics: { read: true, create: false, update: false, delete: false },
    insights: { read: true, create: false, update: false, delete: false },
    users: { read: false, create: false, update: false, delete: false },
    leads: { read: true, create: true, update: true, delete: true },
    teachers: { read: true, create: false, update: false, delete: false },
  },
  TEACHER: {
    students: { read: true, create: false, update: true, delete: false },
    batches: { read: true, create: false, update: false, delete: false },
    payments: { read: false, create: false, update: false, delete: false },
    attendance: { read: true, create: true, update: true, delete: true },
    referrals: { read: false, create: false, update: false, delete: false },
    analytics: { read: false, create: false, update: false, delete: false },
    insights: { read: false, create: false, update: false, delete: false },
    users: { read: false, create: false, update: false, delete: false },
    leads: { read: false, create: false, update: false, delete: false },
    teachers: { read: true, create: false, update: false, delete: false },
  },
}

// Navigation items with role-based visibility
export interface NavItem {
  name: string
  href: string
  roles: UserRole[]
  icon?: string
}

export const NAVIGATION: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    roles: ['FOUNDER', 'MARKETING', 'TEACHER'],
  },
  {
    name: 'My Dashboard',
    href: '/dashboard/teacher',
    roles: ['TEACHER'],
  },
  {
    name: 'My Profile',
    href: '/dashboard/profile',
    roles: ['TEACHER'],
  },
  {
    name: 'Leads',
    href: '/dashboard/leads',
    roles: ['FOUNDER', 'MARKETING'],
  },
  {
    name: 'Students',
    href: '/dashboard/students',
    roles: ['FOUNDER', 'MARKETING', 'TEACHER'],
  },
  {
    name: 'Batches',
    href: '/dashboard/batches',
    roles: ['FOUNDER', 'MARKETING', 'TEACHER'],
  },
  {
    name: 'Teachers',
    href: '/dashboard/teachers',
    roles: ['FOUNDER'],
  },
  {
    name: 'Teacher Hours',
    href: '/dashboard/teacher-hours',
    roles: ['FOUNDER'],
  },
  {
    name: 'Attendance',
    href: '/dashboard/attendance',
    roles: ['FOUNDER', 'TEACHER'],
  },
  {
    name: 'Payments',
    href: '/dashboard/payments',
    roles: ['FOUNDER'],
  },
  {
    name: 'Referrals',
    href: '/dashboard/referrals',
    roles: ['FOUNDER', 'MARKETING'],
  },
  {
    name: 'Insights',
    href: '/dashboard/insights',
    roles: ['FOUNDER', 'MARKETING'],
  },
]

// Check if user has permission
export function hasPermission(
  role: UserRole,
  resource: string,
  action: keyof Permission
): boolean {
  const resourcePermissions = PERMISSIONS[role]?.[resource]
  if (!resourcePermissions) return false
  return resourcePermissions[action]
}

// Get allowed navigation items for a role
export function getAllowedNavigation(role: UserRole): NavItem[] {
  return NAVIGATION.filter((item) => item.roles.includes(role))
}

// Check if user can access a route
export function canAccessRoute(role: UserRole, path: string): boolean {
  // Exact match
  const exactMatch = NAVIGATION.find((item) => item.href === path)
  if (exactMatch) {
    return exactMatch.roles.includes(role)
  }

  // Check parent paths
  const pathSegments = path.split('/').filter(Boolean)
  for (let i = pathSegments.length; i > 0; i--) {
    const parentPath = '/' + pathSegments.slice(0, i).join('/')
    const match = NAVIGATION.find((item) => item.href === parentPath)
    if (match) {
      return match.roles.includes(role)
    }
  }

  // Default: deny access to unknown routes
  return false
}

// Filter data based on role and user context
export function canViewStudent(
  role: UserRole,
  userId?: string,
  studentBatchTeacherId?: string | null
): boolean {
  if (role === 'FOUNDER') return true
  if (role === 'MARKETING') return true
  if (role === 'TEACHER' && userId && studentBatchTeacherId === userId) return true
  return false
}

export function canViewBatch(
  role: UserRole,
  userId?: string,
  batchTeacherId?: string | null
): boolean {
  if (role === 'FOUNDER') return true
  if (role === 'MARKETING') return true
  if (role === 'TEACHER' && userId && batchTeacherId === userId) return true
  return false
}
