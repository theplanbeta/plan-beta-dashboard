import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * Cron job to send alerts for students with 2+ consecutive absences
 * Should run daily after attendance is typically marked
 *
 * This endpoint sends notifications to:
 * - The batch teacher (if assigned)
 * - Admins (FOUNDER role users) - for 3+ absences only
 *
 * Note: Student alerts are currently disabled
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Find active students with 2+ consecutive absences
    const atRiskStudents = await prisma.student.findMany({
      where: {
        completionStatus: "ACTIVE",
        consecutiveAbsences: {
          gte: 2, // 2 or more consecutive absences
        },
      },
      include: {
        batch: {
          include: {
            teacher: true,
          },
        },
      },
    })

    // Filter out students without email addresses
    const studentsWithEmail = atRiskStudents.filter(s => s.email)

    if (atRiskStudents.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No students with consecutive absences found",
        count: 0,
      })
    }

    // Get all admin users (FOUNDER role)
    const allAdmins = await prisma.user.findMany({
      where: {
        role: "FOUNDER",
        active: true,
      },
    })

    // Filter admins with email addresses
    const admins = allAdmins.filter(admin => admin.email)

    const results = {
      studentsProcessed: 0,
      studentEmailsSent: 0,
      teacherEmailsSent: 0,
      adminEmailsSent: 0,
      errors: [] as string[],
    }

    for (const student of studentsWithEmail) {
      results.studentsProcessed++

      const absenceCount = student.consecutiveAbsences
      const isHighRisk = absenceCount >= 3

      // 1. Send email to student - DISABLED FOR NOW
      // Student alerts are currently suppressed. Only teacher and admin alerts are active.
      // if (student.emailNotifications && student.emailAttendance && student.email) {
      //   try {
      //     await resend.emails.send({
      //       from: "Plan Beta <noreply@planb-edu.com>",
      //       to: student.email,
      //       subject: `${isHighRisk ? "⚠️ Urgent" : "📢"} Attendance Alert - ${absenceCount} Consecutive Absences`,
      //       html: `...`
      //     })
      //     results.studentEmailsSent++
      //   } catch (error) {
      //     console.error(`Failed to send email to student ${student.name}:`, error)
      //     results.errors.push(`Student ${student.name}: ${error}`)
      //   }
      // }

      // 2. Send email to batch teacher (if assigned)
      if (student.batch?.teacher?.email) {
        try {
          await resend.emails.send({
            from: "Plan Beta <noreply@planb-edu.com>",
            to: student.batch.teacher.email,
            subject: `${isHighRisk ? "⚠️ Urgent" : "📊"} Student Attendance Alert: ${student.name}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: ${isHighRisk ? "#dc2626" : "#f59e0b"};">
                  ${isHighRisk ? "⚠️ Urgent Student Alert" : "📊 Student Attendance Notice"}
                </h2>

                <p>Hi ${student.batch.teacher.name},</p>

                <p>
                  Your student <strong>${student.name}</strong> from batch <strong>${student.batch.batchCode}</strong>
                  has missed <strong>${absenceCount} consecutive classes</strong>.
                </p>

                ${
                  isHighRisk
                    ? `<div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 12px; margin: 20px 0;">
                    <p style="margin: 0; color: #991b1b;">
                      <strong>Action Required:</strong> This student is at high risk of dropping out.
                      Please reach out to them as soon as possible.
                    </p>
                  </div>`
                    : `<div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0;">
                    <p style="margin: 0; color: #92400e;">
                      <strong>Recommended:</strong> Consider reaching out to check if they're facing any challenges.
                    </p>
                  </div>`
                }

                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #374151;">Student Details</h3>
                  <p><strong>Name:</strong> ${student.name}</p>
                  <p><strong>Student ID:</strong> ${student.studentId}</p>
                  <p><strong>Batch:</strong> ${student.batch.batchCode} (${student.batch.level})</p>
                  <p><strong>Contact:</strong> ${student.whatsapp}</p>
                  <p><strong>Email:</strong> ${student.email || "Not provided"}</p>
                  <hr style="border: none; border-top: 1px solid #d1d5db; margin: 10px 0;" />
                  <p><strong>Attendance Rate:</strong> ${student.attendanceRate.toFixed(1)}%</p>
                  <p><strong>Classes Attended:</strong> ${student.classesAttended} / ${student.totalClasses}</p>
                  <p><strong>Consecutive Absences:</strong> ${absenceCount} classes</p>
                  ${student.lastAbsenceDate ? `<p><strong>Last Absence:</strong> ${new Date(student.lastAbsenceDate).toLocaleDateString()}</p>` : ""}
                </div>

                <p>
                  Early intervention can make a significant difference in student retention.
                  A quick check-in call or message might help identify and resolve any issues they're facing.
                </p>

                <p style="margin-top: 30px;">
                  Thank you for your attention to this matter.
                </p>

                <p>
                  Best regards,<br/>
                  <strong>Plan Beta Team</strong>
                </p>
              </div>
            `,
          })
          results.teacherEmailsSent++
        } catch (error) {
          console.error(`Failed to send email to teacher for student ${student.name}:`, error)
          results.errors.push(`Teacher for ${student.name}: ${error}`)
        }
      }

      // 3. Send consolidated alert to admins (only for high-risk cases with 3+ absences)
      if (isHighRisk) {
        for (const admin of admins) {
          if (!admin.email) continue

          try {
            await resend.emails.send({
              from: "Plan Beta <noreply@planb-edu.com>",
              to: admin.email,
              subject: `⚠️ High-Risk Student Alert: ${student.name} - ${absenceCount} Consecutive Absences`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #dc2626;">⚠️ High-Risk Student Alert</h2>

                  <p>Hi ${admin.name},</p>

                  <p>
                    Student <strong>${student.name}</strong> has reached <strong>${absenceCount} consecutive absences</strong>
                    and is at high risk of dropping out.
                  </p>

                  <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 12px; margin: 20px 0;">
                    <p style="margin: 0; color: #991b1b;">
                      <strong>Immediate attention recommended.</strong> This student may require administrative intervention.
                    </p>
                  </div>

                  <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #374151;">Student Information</h3>
                    <p><strong>Name:</strong> ${student.name}</p>
                    <p><strong>Student ID:</strong> ${student.studentId}</p>
                    <p><strong>Batch:</strong> ${student.batch ? `${student.batch.batchCode} (${student.batch.level})` : "Not assigned"}</p>
                    <p><strong>Teacher:</strong> ${student.batch?.teacher?.name || "Not assigned"}</p>
                    <p><strong>Contact:</strong> ${student.whatsapp}</p>
                    <p><strong>Email:</strong> ${student.email || "Not provided"}</p>
                    <hr style="border: none; border-top: 1px solid #d1d5db; margin: 10px 0;" />
                    <p><strong>Attendance Rate:</strong> ${student.attendanceRate.toFixed(1)}%</p>
                    <p><strong>Classes Attended:</strong> ${student.classesAttended} / ${student.totalClasses}</p>
                    <p><strong>Consecutive Absences:</strong> ${absenceCount} classes</p>
                    <p><strong>Payment Status:</strong> ${student.paymentStatus}</p>
                    <p><strong>Churn Risk:</strong> <span style="color: #dc2626; font-weight: bold;">${student.churnRisk}</span></p>
                  </div>

                  <p>
                    <strong>Actions taken:</strong>
                  </p>
                  <ul>
                    <li>Batch teacher has been alerted${student.batch?.teacher ? "" : " (if assigned)"}</li>
                    <li>Churn risk status updated to: ${student.churnRisk}</li>
                    <li>Visual warning indicator added to student dashboard</li>
                  </ul>
                  <p style="font-size: 12px; color: #6b7280; font-style: italic;">
                    Note: Student email alerts are currently disabled. Only teachers and admins receive notifications.
                  </p>

                  <p style="margin-top: 30px;">
                    Best regards,<br/>
                    <strong>Plan Beta Automated Alert System</strong>
                  </p>
                </div>
              `,
            })
            results.adminEmailsSent++
          } catch (error) {
            console.error(`Failed to send admin alert for student ${student.name}:`, error)
            results.errors.push(`Admin alert for ${student.name}: ${error}`)
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.studentsProcessed} students with consecutive absences`,
      ...results,
    })
  } catch (error) {
    console.error("Error in consecutive absence alerts cron:", error)
    return NextResponse.json(
      {
        error: "Failed to process consecutive absence alerts",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
