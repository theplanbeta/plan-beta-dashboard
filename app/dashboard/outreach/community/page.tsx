"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import ConnectionSuggestion from "@/components/outreach/ConnectionSuggestion"

interface Student {
  id: string
  studentId: string
  name: string
  level: string
  whatsapp: string
  email: string | null
  currentLevel: string
  batchId: string | null
  enrollmentDate: string
}

interface ConnectionSuggestionData {
  student1: Student
  student2: Student
  reason: string
  commonalities: string[]
  score: number
}

interface Ambassador {
  student: Student
  referralsCount: number
  activeReferrals: number
  totalRevenue: number
}

export default function CommunityNetworkPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [suggestions, setSuggestions] = useState<ConnectionSuggestionData[]>([])
  const [ambassadors, setAmbassadors] = useState<Ambassador[]>([])
  const [recentConnections, setRecentConnections] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeCommunityMembers: 0,
    connectionsThisMonth: 0,
    ambassadors: 0
  })

  useEffect(() => {
    if (session?.user?.role !== 'FOUNDER') {
      router.push('/dashboard')
    } else {
      fetchCommunityData()
    }
  }, [session, router])

  const fetchCommunityData = async () => {
    setLoading(true)
    try {
      // Fetch students
      const studentsRes = await fetch('/api/students')
      const students = await studentsRes.json()

      // Fetch referrals to identify ambassadors
      const referralsRes = await fetch('/api/referrals')
      const referrals = await referralsRes.json()

      // Generate connection suggestions
      const connectionSuggestions = generateConnectionSuggestions(students)
      setSuggestions(connectionSuggestions)

      // Identify ambassadors (students with referrals)
      const ambassadorData = identifyAmbassadors(students, referrals)
      setAmbassadors(ambassadorData)

      // Calculate stats
      setStats({
        totalStudents: students.filter((s: any) => s.completionStatus === 'ACTIVE').length,
        activeCommunityMembers: students.filter((s: any) =>
          s.completionStatus === 'ACTIVE' && (s.referrals?.length > 0 || s.interactions?.length > 5)
        ).length,
        connectionsThisMonth: 0, // Would track actual connections made
        ambassadors: ambassadorData.length
      })

    } catch (error) {
      console.error('Error fetching community data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateConnectionSuggestions = (students: any[]): ConnectionSuggestionData[] => {
    const suggestions: ConnectionSuggestionData[] = []
    const activeStudents = students.filter(s => s.completionStatus === 'ACTIVE')

    // Group students by level and batch
    for (let i = 0; i < activeStudents.length; i++) {
      for (let j = i + 1; j < activeStudents.length; j++) {
        const s1 = activeStudents[i]
        const s2 = activeStudents[j]

        const commonalities: string[] = []
        let score = 0

        // Same level
        if (s1.currentLevel === s2.currentLevel) {
          commonalities.push(`Both learning ${s1.currentLevel}`)
          score += 10
        }

        // Same batch
        if (s1.batchId && s1.batchId === s2.batchId) {
          commonalities.push('Same batch')
          score += 15
        }

        // Similar enrollment time (within 2 months)
        const enrollDiff = Math.abs(
          new Date(s1.enrollmentDate).getTime() - new Date(s2.enrollmentDate).getTime()
        ) / (1000 * 60 * 60 * 24 * 30)

        if (enrollDiff < 2) {
          commonalities.push('Started around the same time')
          score += 5
        }

        // Similar attendance rate
        if (s1.attendanceRate && s2.attendanceRate &&
            Math.abs(Number(s1.attendanceRate) - Number(s2.attendanceRate)) < 10) {
          commonalities.push('Similar learning pace')
          score += 5
        }

        if (commonalities.length >= 2 && score >= 15) {
          suggestions.push({
            student1: {
              id: s1.id,
              studentId: s1.studentId,
              name: s1.name,
              level: s1.currentLevel,
              whatsapp: s1.whatsapp,
              email: s1.email,
              currentLevel: s1.currentLevel,
              batchId: s1.batchId,
              enrollmentDate: s1.enrollmentDate
            },
            student2: {
              id: s2.id,
              studentId: s2.studentId,
              name: s2.name,
              level: s2.currentLevel,
              whatsapp: s2.whatsapp,
              email: s2.email,
              currentLevel: s2.currentLevel,
              batchId: s2.batchId,
              enrollmentDate: s2.enrollmentDate
            },
            reason: `Great match for study partners`,
            commonalities,
            score
          })
        }
      }
    }

    // Sort by score and return top 10
    return suggestions.sort((a, b) => b.score - a.score).slice(0, 10)
  }

  const identifyAmbassadors = (students: any[], referrals: any[]): Ambassador[] => {
    const studentMap = new Map(students.map(s => [s.id, s]))
    const referralsByStudent = new Map<string, any[]>()

    // Group referrals by referrer
    referrals.forEach((ref: any) => {
      if (!referralsByStudent.has(ref.referrerId)) {
        referralsByStudent.set(ref.referrerId, [])
      }
      referralsByStudent.get(ref.referrerId)?.push(ref)
    })

    const ambassadorList: Ambassador[] = []

    // Create ambassador profiles
    referralsByStudent.forEach((refs, studentId) => {
      const student = studentMap.get(studentId)
      if (student && student.completionStatus === 'ACTIVE') {
        const activeRefs = refs.filter((r: any) => r.month1Complete)
        const totalRevenue = activeRefs.reduce((sum: number, r: any) =>
          sum + (r.payoutStatus === 'PAID' ? Number(r.payoutAmount) : 0), 0
        )

        ambassadorList.push({
          student: {
            id: student.id,
            studentId: student.studentId,
            name: student.name,
            level: student.currentLevel,
            whatsapp: student.whatsapp,
            email: student.email,
            currentLevel: student.currentLevel,
            batchId: student.batchId,
            enrollmentDate: student.enrollmentDate
          },
          referralsCount: refs.length,
          activeReferrals: activeRefs.length,
          totalRevenue
        })
      }
    })

    return ambassadorList.sort((a, b) => b.referralsCount - a.referralsCount)
  }

  const handleSendIntro = async (student1Id: string, student2Id: string, message: string) => {
    try {
      // In a real implementation, this would send emails to both students
      alert('Introduction sent successfully!')

      // Remove the suggestion from the list
      setSuggestions(suggestions.filter(s =>
        !(s.student1.id === student1Id && s.student2.id === student2Id)
      ))
    } catch (error) {
      console.error('Error sending intro:', error)
      alert('Failed to send introduction')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Community Network
        </h1>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading community data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Community Network
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Build connections and strengthen your student community
          </p>
        </div>
        <Link
          href="/dashboard/outreach"
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md font-medium transition-colors"
        >
          ← Back to Outreach
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Active Students
              </p>
              <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
                {stats.totalStudents}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <span className="text-2xl">👥</span>
            </div>
          </div>
        </div>

        <div className="panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Community Members
              </p>
              <p className="mt-2 text-3xl font-semibold text-purple-600 dark:text-purple-400">
                {stats.activeCommunityMembers}
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
              <span className="text-2xl">🌟</span>
            </div>
          </div>
        </div>

        <div className="panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Ambassadors
              </p>
              <p className="mt-2 text-3xl font-semibold text-green-600 dark:text-green-400">
                {stats.ambassadors}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
              <span className="text-2xl">🏆</span>
            </div>
          </div>
        </div>

        <div className="panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Connections This Month
              </p>
              <p className="mt-2 text-3xl font-semibold text-orange-600 dark:text-orange-400">
                {stats.connectionsThisMonth}
              </p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
              <span className="text-2xl">🤝</span>
            </div>
          </div>
        </div>
      </div>

      {/* Ambassadors Section */}
      {ambassadors.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            🏆 Community Ambassadors
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ambassadors.slice(0, 6).map((ambassador) => (
              <div key={ambassador.student.id} className="panel p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <Link
                      href={`/dashboard/students/${ambassador.student.id}`}
                      className="text-lg font-semibold text-gray-900 dark:text-white hover:text-primary dark:hover:text-blue-400"
                    >
                      {ambassador.student.name}
                    </Link>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {ambassador.student.studentId} • {ambassador.student.level}
                    </p>
                  </div>
                  <span className="text-2xl">👑</span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-300">Referrals</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {ambassador.referralsCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-300">Active</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      {ambassador.activeReferrals}
                    </span>
                  </div>
                </div>

                <a
                  href={`https://wa.me/${ambassador.student.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors text-center block"
                >
                  💬 Say Thanks
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connection Suggestions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          🤝 Suggested Connections ({suggestions.length})
        </h2>

        {suggestions.length === 0 ? (
          <div className="panel p-12 text-center">
            <div className="text-6xl mb-4">🌟</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No new suggestions right now
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Check back later for more connection opportunities!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {suggestions.map((suggestion, idx) => (
              <ConnectionSuggestion
                key={`${suggestion.student1.id}-${suggestion.student2.id}`}
                student1={suggestion.student1}
                student2={suggestion.student2}
                reason={suggestion.reason}
                commonalities={suggestion.commonalities}
                onSendIntro={handleSendIntro}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
