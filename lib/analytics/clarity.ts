export function isClarityConfigured(): boolean {
  return !!process.env.CLARITY_PROJECT_ID
}

export function getClarityDashboardUrl(): string | null {
  if (!process.env.CLARITY_PROJECT_ID) return null
  return `https://clarity.microsoft.com/projects/view/${process.env.CLARITY_PROJECT_ID}/dashboard`
}

export async function getClaritySummary(): Promise<{
  configured: boolean
  dashboardUrl: string | null
}> {
  return {
    configured: isClarityConfigured(),
    dashboardUrl: getClarityDashboardUrl(),
  }
}
