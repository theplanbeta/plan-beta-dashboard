"use client"

import { AnimateInView } from "@/components/marketing/AnimateInView"

const depositTiers = [
  { level: "B2 Level", deposit: "No deposit required", highlight: true },
  { level: "B1 Level", deposit: "Rs. 20,000/-" },
  { level: "A2 Level", deposit: "Rs. 30,000/-" },
  { level: "A1 Level", deposit: "Rs. 40,000/-" },
  { level: "No Language Proficiency", deposit: "Rs. 55,000/-" },
]

export function NurseEligibility() {
  return (
    <section className="py-20 bg-[#111]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <AnimateInView className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Eligibility & Requirements
            </h2>
            <p className="text-lg text-gray-400">
              BSc Nursing or GNM Nursing — freshers and experienced nurses are both welcome.
            </p>
          </AnimateInView>

          <div className="grid sm:grid-cols-2 gap-6 mb-16">
            <AnimateInView delay={0.1} direction="left">
              <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-8 text-center">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">BSc / GNM Nursing</h3>
                <p className="text-gray-400">BSc Nursing or GNM Nursing degree. Freshers and experienced nurses welcome.</p>
              </div>
            </AnimateInView>
            <AnimateInView delay={0.2} direction="right">
              <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-8 text-center">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">B2 Level German</h3>
                <p className="text-gray-400">B2 level pass required — we help you get there</p>
              </div>
            </AnimateInView>
          </div>

          {/* Security Deposit Table */}
          <AnimateInView delay={0.3}>
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden">
              <div className="px-8 py-6 border-b border-white/[0.06]">
                <h3 className="text-xl font-bold text-white mb-2">Security Deposit Policy</h3>
                <p className="text-sm text-gray-400">
                  A refundable security deposit is required based on your current language proficiency. The full deposit is refunded upon successful issuance of your job contract.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-white/[0.03]">
                      <th className="text-left px-8 py-3 text-sm font-semibold text-white">Language Level</th>
                      <th className="text-right px-8 py-3 text-sm font-semibold text-white">Deposit Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {depositTiers.map((tier) => (
                      <tr key={tier.level} className={tier.highlight ? "bg-green-500/10" : ""}>
                        <td className="px-8 py-4 text-sm text-white font-medium">
                          {tier.level}
                          {tier.highlight && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 bg-green-500/10 text-green-400 text-xs font-medium rounded-full">
                              No deposit
                            </span>
                          )}
                        </td>
                        <td className={`px-8 py-4 text-sm text-right font-semibold ${tier.highlight ? "text-green-400" : "text-white"}`}>
                          {tier.deposit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-8 py-4 bg-white/[0.03] border-t border-white/[0.06]">
                <p className="text-xs text-gray-500">
                  This policy ensures compliance with employer requirements and supports successful placement. For further details, please contact us.
                </p>
              </div>
            </div>
          </AnimateInView>
        </div>
      </div>
    </section>
  )
}
