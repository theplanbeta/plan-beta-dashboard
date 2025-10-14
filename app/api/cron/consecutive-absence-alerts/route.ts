import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * Cron job to send alerts for students with 2+ consecutive absences
 * Should run daily after attendance is typically marked
 *
 * This endpoint sends notifications to:
 * - The student (if email notifications enabled)
 * - The batch teacher (if assigned)
 * - Admins (FOUNDER role users)
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
        email: {
          not: null,
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

    if (atRiskStudents.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No students with consecutive absences found",
        count: 0,
      })
    }

    // Get all admin users (FOUNDER role)
    const admins = await prisma.user.findMany({
      where: {
        role: "FOUNDER",
        active: true,
        email: {
          not: null,
        },
      },
    })

    const results = {
      studentsProcessed: 0,
      studentEmailsSent: 0,
      teacherEmailsSent: 0,
      adminEmailsSent: 0,
      errors: [] as string[],
    }

    for (const student of atRiskStudents) {
      results.studentsProcessed++

      const absenceCount = student.consecutiveAbsences
      const isHighRisk = absenceCount >= 3

      // 1. Send email to student (if notifications enabled)
      if (student.emailNotifications && student.emailAttendance && student.email) {
        try {
          await resend.emails.send({
            from: "Plan Beta <noreply@planb-edu.com>",
            to: student.email,
            subject: `${isHighRisk ? "⚠️ Urgent" : "📢"} Attendance Alert - ${absenceCount} Consecutive Absences`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: ${isHighRisk ? "#dc2626" : "#f59e0b"};">
                  ${isHighRisk ? "⚠️ Urgent Attendance Alert" : "📢 Attendance Notice"}
                </h2>

                <p>Hi ${student.name},</p>

                <p>We've noticed you've missed <strong>${absenceCount} consecutive classes</strong>.</p>

                ${
                  isHighRisk
                    ? `<div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 12px; margin: 20px 0;">
                    <p style="margin: 0; color: #991b1b;">
                      <strong>This is a critical attendance alert.</strong> Missing classes can significantly impact your progress and language learning journey.
                    </p>
                  </div>`
                    : `<div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0;">
                    <p style="margin: 0; color: #92400e;">
                      We're here to support you! If you're facing any challenges attending classes, please let us know.
                    </p>
                  </div>`
                }

                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #374151;">Your Attendance Stats</h3>
                  <p><strong>Current Attendance Rate:</strong> ${student.attendanceRate.toFixed(1)}%</p>
                  <p><strong>Classes Attended:</strong> ${student.classesAttended} / ${student.totalClasses}</p>
                  <p><strong>Consecutive Absences:</strong> ${absenceCount} classes</p>
                  ${student.batch ? `<p><strong>Batch:</strong> ${student.batch.batchCode} (${student.batch.level})</p>` : ""}
                </div>

                <p>
                  ${
                    isHighRisk
                      ? "Please reach out to your teacher or our support team immediately. We're committed to helping you get back on track!"
                      : "Let's work together to improve your attendance. Consistent participation is key to achieving your language learning goals!"
                  }
                </p>

                <p style="margin-top: 30px;">
                  If you have any questions or need support, please don't hesitate to contact us.
                </p>

                <p>
                  Best regards,<br/>
                  <strong>Plan Beta Team</strong>
                </p>

                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
                <p style="font-size: 12px; color: #6b7280;">
                  You're receiving this email because you have attendance notifications enabled.
                  To update your preferences, please contact our support team.
                </p>
              </div>
            `,
          })
          results.studentEmailsSent++
        } catch (error) {
          console.error(`Failed to send email to student ${student.name}:`, error)
          results.errors.push(`Student ${student.name}: ${error}`)
        }
      }

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
                    <li>Student has been notified via email${student.emailNotifications ? "" : " (if enabled)"}</li>
                    <li>Batch teacher has been alerted${student.batch?.teacher ? "" : " (if assigned)"}</li>
                    <li>Churn risk status updated to: ${student.churnRisk}</li>
                  </ul>

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
