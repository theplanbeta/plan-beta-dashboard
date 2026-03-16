"use client"

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { getTrackingData, getVisitorId, trackEvent } from "@/lib/tracking"
import { InstagramEmbed } from "@/components/marketing/InstagramEmbed"

const countries = [
  "India", "Nepal", "Sri Lanka", "Bangladesh", "Pakistan",
  "Philippines", "Vietnam", "Indonesia", "Nigeria", "Kenya",
  "Egypt", "Turkey", "Brazil", "Mexico", "Other",
]

const qualifications = [
  { value: "10th", label: "10th Standard" },
  { value: "12th", label: "12th Standard / HSC" },
  { value: "diploma", label: "Diploma" },
  { value: "bachelors", label: "Bachelor's Degree" },
  { value: "masters", label: "Master's Degree" },
  { value: "phd", label: "PhD" },
]

const professions = [
  { value: "nursing", label: "Nursing" },
  { value: "it", label: "IT / Software" },
  { value: "engineering", label: "Engineering" },
  { value: "healthcare", label: "Healthcare (Non-Nursing)" },
  { value: "hospitality", label: "Hospitality" },
  { value: "accounting", label: "Accounting / Finance" },
  { value: "teaching", label: "Teaching" },
  { value: "student", label: "Student" },
  { value: "other", label: "Other" },
]

const experienceLevels = [
  { value: "0", label: "No experience (Fresher)" },
  { value: "1-2", label: "1-2 years" },
  { value: "3-5", label: "3-5 years" },
  { value: "5-10", label: "5-10 years" },
  { value: "10+", label: "10+ years" },
]

const germanLevels = [
  { value: "none", label: "None / Just starting" },
  { value: "A1", label: "A1 (Beginner)" },
  { value: "A2", label: "A2 (Elementary)" },
  { value: "B1", label: "B1 (Intermediate)" },
  { value: "B2", label: "B2 (Upper Intermediate)" },
  { value: "C1", label: "C1 (Advanced)" },
]

const inputClasses =
  "w-full px-4 py-3 bg-[#1a1a1a] border border-white/[0.1] rounded-lg text-white placeholder:text-gray-600 focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"

interface PathwayResult {
  eligibilityScore: number
  recommendedVisa: string
  visaDescription: string
  requiredGermanLevel: string
  currentLevelAssessment: string
  timelineMonths: number
  timeline: { month: string; action: string }[]
  salaryRange: { min: number; max: number }
  keyRequirements: string[]
  strengths: string[]
  challenges: string[]
  alternativePathways: string[]
  professionSpecificNotes: string
}

function getScoreColor(score: number) {
  if (score >= 75) return "text-emerald-400"
  if (score >= 50) return "text-amber-400"
  return "text-red-400"
}

function getScoreBg(score: number) {
  if (score >= 75) return "bg-emerald-500/20 border-emerald-500/30"
  if (score >= 50) return "bg-amber-500/20 border-amber-500/30"
  return "bg-red-500/20 border-red-500/30"
}

function getScoreRing(score: number) {
  if (score >= 75) return "stroke-emerald-400"
  if (score >= 50) return "stroke-amber-400"
  return "stroke-red-400"
}

export default function GermanyPathwayPage() {
  const [formData, setFormData] = useState({
    country: "India",
    age: "",
    qualification: "",
    profession: "",
    experience: "",
    germanLevel: "",
    name: "",
    whatsapp: "",
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PathwayResult | null>(null)
  const [error, setError] = useState("")
  const formRef = useRef<HTMLDivElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    trackEvent("pathway_check_start", { profession: formData.profession, germanLevel: formData.germanLevel })

    try {
      // 1. Create lead
      const tracking = getTrackingData()
      const visitorId = getVisitorId()
      const leadPayload = {
        name: formData.name,
        whatsapp: formData.whatsapp.replace(/\+/g, ""),
        utmCampaign: "pathway-checker",
        landingPage: window.location.href,
        visitorId,
        ...tracking,
      }

      const leadRes = await fetch("/api/leads/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leadPayload),
      })

      if (!leadRes.ok) {
        const data = await leadRes.json()
        // Don't block on duplicate lead (429) — still show results
        if (leadRes.status !== 429) {
          throw new Error(data.error || "Failed to submit")
        }
      }

      // 2. Get pathway from Gemini
      const pathwayRes = await fetch("/api/pathway/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country: formData.country,
          age: parseInt(formData.age),
          qualification: formData.qualification,
          profession: formData.profession,
          experience: formData.experience,
          germanLevel: formData.germanLevel,
          name: formData.name,
          whatsapp: formData.whatsapp,
        }),
      })

      const pathwayData = await pathwayRes.json()

      if (!pathwayRes.ok || !pathwayData.success) {
        throw new Error(pathwayData.error || "Failed to check eligibility")
      }

      setResult(pathwayData.pathway)
      trackEvent("pathway_check_complete", {
        score: String(pathwayData.pathway.eligibilityScore),
        visa: pathwayData.pathway.recommendedVisa,
        profession: formData.profession,
      })

      // Scroll to results
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 300)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
      trackEvent("pathway_check_error", { error: String(err) })
    } finally {
      setLoading(false)
    }
  }

  const isFormValid =
    formData.age &&
    formData.qualification &&
    formData.profession &&
    formData.experience &&
    formData.germanLevel &&
    formData.name &&
    formData.whatsapp

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.08] via-transparent to-transparent" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Free Eligibility Assessment
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight mb-6">
              Check Your{" "}
              <span className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
                Germany Eligibility
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10">
              Get a personalized pathway to work in Germany. Our AI analyzes your profile and recommends the best
              visa route, German level needed, salary expectations, and a step-by-step timeline.
            </p>

            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500 mb-10">
              {["Personalized results", "Based on current rules", "100% free"].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {item}
                </div>
              ))}
            </div>

            <button
              onClick={scrollToForm}
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white font-semibold rounded-full hover:bg-primary-dark transition-all shadow-lg shadow-primary/25"
            >
              Check My Eligibility
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white text-center mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Fill Your Profile", desc: "Tell us about your education, profession, and German level" },
              { step: "2", title: "Get Your Pathway", desc: "Get a personalized visa route, timeline, and salary estimate for Germany" },
              { step: "3", title: "Start Learning", desc: "Begin your German course with a clear timeline and goal" },
            ].map((item) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xl mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Practical Tip — Renting in Germany */}
      <section className="py-12 border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
            <InstagramEmbed
              url="https://www.instagram.com/reel/DB3MI2NRCEM/"
              title="How to find an apartment in Germany"
              thumbnail="/instagram/wohnung-guide.jpg"
            />
            <div>
              <span className="px-3 py-1 bg-blue-500/15 text-blue-400 text-xs font-medium rounded-full border border-blue-500/20">
                Life in Germany
              </span>
              <h3 className="text-lg font-semibold text-white mt-3 mb-2">
                How to Find an Apartment (Wohnung) in Germany
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                One of the biggest challenges after arriving in Germany — finding a place to live. Watch our guide on navigating the rental market, understanding Warmmiete vs Kaltmiete, and tips to secure your first Wohnung.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Eligibility Form */}
      <section ref={formRef} className="py-20 border-t border-white/[0.06]" id="checker">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold text-white text-center mb-3">Your Profile</h2>
            <p className="text-gray-400 text-center mb-10">
              Fill in your details to get a personalized Germany pathway
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Country */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Country of Origin</label>
                <select name="country" value={formData.country} onChange={handleChange} className={inputClasses}>
                  {countries.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Age */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Age *</label>
                <input
                  type="number"
                  name="age"
                  min={16}
                  max={70}
                  placeholder="e.g. 28"
                  value={formData.age}
                  onChange={handleChange}
                  required
                  className={inputClasses}
                />
              </div>

              {/* Qualification */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Highest Qualification *</label>
                <select name="qualification" value={formData.qualification} onChange={handleChange} required className={inputClasses}>
                  <option value="">Select qualification</option>
                  {qualifications.map((q) => (
                    <option key={q.value} value={q.value}>{q.label}</option>
                  ))}
                </select>
              </div>

              {/* Profession */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Profession / Field *</label>
                <select name="profession" value={formData.profession} onChange={handleChange} required className={inputClasses}>
                  <option value="">Select profession</option>
                  {professions.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              {/* Experience */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Years of Experience *</label>
                <select name="experience" value={formData.experience} onChange={handleChange} required className={inputClasses}>
                  <option value="">Select experience</option>
                  {experienceLevels.map((e) => (
                    <option key={e.value} value={e.value}>{e.label}</option>
                  ))}
                </select>
              </div>

              {/* German Level */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Current German Level *</label>
                <select name="germanLevel" value={formData.germanLevel} onChange={handleChange} required className={inputClasses}>
                  <option value="">Select your level</option>
                  {germanLevels.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>

              {/* Divider */}
              <div className="border-t border-white/[0.06] pt-6">
                <p className="text-sm text-gray-500 mb-4">
                  Enter your details to see your personalized results
                </p>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Your Name *</label>
                <input
                  type="text"
                  name="name"
                  placeholder="Full name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className={inputClasses}
                />
              </div>

              {/* WhatsApp */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">WhatsApp Number *</label>
                <input
                  type="tel"
                  name="whatsapp"
                  placeholder="e.g. 919876543210"
                  value={formData.whatsapp}
                  onChange={handleChange}
                  required
                  className={inputClasses}
                />
                <p className="text-xs text-gray-600 mt-1">Include country code (e.g. 91 for India)</p>
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !isFormValid}
                className="w-full py-4 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/25"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Analyzing your profile...
                  </span>
                ) : (
                  "Check My Eligibility"
                )}
              </button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* Results Section */}
      <AnimatePresence>
        {result && (
          <motion.section
            ref={resultRef}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="py-20 border-t border-white/[0.06]"
          >
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-3xl font-bold text-white text-center mb-3">
                Your Germany Pathway, {formData.name.split(" ")[0]}
              </h2>
              <p className="text-gray-400 text-center mb-12">
                Here&apos;s your personalized assessment and recommended pathway
              </p>

              {/* Eligibility Score */}
              <div className={`rounded-2xl border p-8 mb-8 text-center ${getScoreBg(result.eligibilityScore)}`}>
                <div className="relative w-32 h-32 mx-auto mb-4">
                  <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="8" className="text-white/10" />
                    <circle
                      cx="60" cy="60" r="52" fill="none" strokeWidth="8"
                      strokeDasharray={`${(result.eligibilityScore / 100) * 327} 327`}
                      strokeLinecap="round"
                      className={getScoreRing(result.eligibilityScore)}
                    />
                  </svg>
                  <span className={`absolute inset-0 flex items-center justify-center text-4xl font-bold ${getScoreColor(result.eligibilityScore)}`}>
                    {result.eligibilityScore}%
                  </span>
                </div>
                <p className="text-lg font-semibold text-white">Eligibility Score</p>
                <p className="text-sm text-gray-400 mt-1">{result.currentLevelAssessment}</p>
              </div>

              {/* Recommended Visa */}
              <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-2xl p-6 mb-6">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Recommended Visa</h3>
                <p className="text-2xl font-bold text-white mb-2">{result.recommendedVisa}</p>
                <p className="text-gray-400 text-sm">{result.visaDescription}</p>
              </div>

              {/* Key Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-5">
                  <p className="text-sm text-gray-500 mb-1">German Level Needed</p>
                  <p className="text-xl font-bold text-white">{result.requiredGermanLevel}</p>
                </div>
                <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-5">
                  <p className="text-sm text-gray-500 mb-1">Timeline</p>
                  <p className="text-xl font-bold text-white">{result.timelineMonths} months</p>
                </div>
                <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-5 col-span-2">
                  <p className="text-sm text-gray-500 mb-1">Expected Salary in Germany</p>
                  <p className="text-xl font-bold text-white">
                    EUR {result.salaryRange.min?.toLocaleString()} - {result.salaryRange.max?.toLocaleString()}/month
                  </p>
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-2xl p-6 mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">Your Step-by-Step Timeline</h3>
                <div className="space-y-4">
                  {result.timeline.map((step, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-xs font-bold">
                          {i + 1}
                        </div>
                        {i < result.timeline.length - 1 && <div className="w-px flex-1 bg-white/10 mt-2" />}
                      </div>
                      <div className="pb-4">
                        <p className="text-sm font-medium text-primary mb-1">{step.month}</p>
                        <p className="text-gray-300 text-sm">{step.action}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strengths & Challenges */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-5">
                  <h3 className="text-sm font-medium text-emerald-400 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Your Strengths
                  </h3>
                  <ul className="space-y-2">
                    {result.strengths.map((s, i) => (
                      <li key={i} className="text-sm text-gray-300">{s}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-5">
                  <h3 className="text-sm font-medium text-amber-400 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Challenges to Address
                  </h3>
                  <ul className="space-y-2">
                    {result.challenges.map((c, i) => (
                      <li key={i} className="text-sm text-gray-300">{c}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Key Requirements */}
              <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-2xl p-6 mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">Key Requirements</h3>
                <ul className="space-y-3">
                  {result.keyRequirements.map((req, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                      <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      {req}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Profession Notes */}
              {result.professionSpecificNotes && (
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 mb-6">
                  <h3 className="text-lg font-semibold text-white mb-2">For Your Profession</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">{result.professionSpecificNotes}</p>
                </div>
              )}

              {/* Alternative Pathways */}
              {result.alternativePathways.length > 0 && (
                <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-2xl p-6 mb-8">
                  <h3 className="text-lg font-semibold text-white mb-3">Alternative Pathways</h3>
                  <ul className="space-y-2">
                    {result.alternativePathways.map((alt, i) => (
                      <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                        <span className="text-gray-600">&#8226;</span>
                        {alt}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Cross-link to Jobs */}
              <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-2xl p-6 mb-8 text-center">
                <h3 className="text-lg font-semibold text-white mb-2">Browse Matching Jobs</h3>
                <p className="text-gray-400 text-sm mb-4">See real German job listings matching your profession</p>
                <Link
                  href={`/jobs${formData.profession ? `?profession=${formData.profession}` : ""}`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 border border-white/20 rounded-full text-white font-medium hover:bg-white/20 transition-all"
                >
                  View Matching Jobs
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>

              {/* CTA */}
              <div className="bg-gradient-to-br from-primary/20 to-emerald-500/10 border border-primary/30 rounded-2xl p-8 text-center">
                <h3 className="text-2xl font-bold text-white mb-3">Start Your German Course Today</h3>
                <p className="text-gray-400 mb-6">
                  Plan Beta offers live online German classes from A1 to B2. Small batches, expert teachers, and a
                  clear path to Germany.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <a
                    href={`https://wa.me/919028396035?text=Hi%20Plan%20Beta!%20I%20just%20checked%20my%20Germany%20eligibility%20(score:%20${result.eligibilityScore}%).%20I'd%20like%20to%20start%20learning%20German.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackEvent("whatsapp_click", { location: "pathway_results" })}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-500 text-white font-semibold rounded-full hover:bg-green-600 transition-all"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    Chat on WhatsApp
                  </a>
                  <Link
                    href="/courses"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-full hover:bg-primary-dark transition-all"
                  >
                    View Courses
                  </Link>
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* FAQ Section */}
      <section className="py-20 border-t border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {[
              {
                q: "Can I work in Germany from India?",
                a: "Yes! Germany actively recruits skilled workers from India. With the right qualification, German language skills, and visa pathway, you can build a successful career in Germany. Key sectors include IT, nursing, engineering, and hospitality.",
              },
              {
                q: "What German level do I need?",
                a: "It depends on your profession. Nursing typically requires B1-B2, IT can start with B1 (some English-only positions exist), healthcare professionals need C1, and most other professions need B1-B2. Learning German significantly improves your chances and salary.",
              },
              {
                q: "How long does it take to reach B1 German?",
                a: "With dedicated study (3-4 hours/day), you can reach A1 in 2-3 months, A2 in another 2-3 months, and B1 in 2-3 more months. Total: 6-9 months. Plan Beta's structured live classes help you reach B1 efficiently.",
              },
              {
                q: "What is the Blue Card?",
                a: "The EU Blue Card is a work and residence permit for highly qualified non-EU workers. You need a recognized university degree and a job offer with a salary of at least EUR 45,300/year (EUR 41,000 for shortage occupations like IT and engineering).",
              },
              {
                q: "Is this eligibility check accurate?",
                a: "Our checker uses current German immigration rules and requirements. While it provides a strong directional assessment, we recommend consulting with an immigration advisor for your specific case. The check is free and gives you a solid starting point.",
              },
              {
                q: "What is Ausbildung?",
                a: "Ausbildung is Germany's vocational training system — a 2-3 year program combining classroom learning with paid on-the-job training. It's an excellent pathway for younger applicants, even without a university degree. You typically need A2-B1 German to start.",
              },
            ].map((item, i) => (
              <FAQItem key={i} question={item.q} answer={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 border-t border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Start Your Journey?
          </h2>
          <p className="text-gray-400 text-lg mb-8">
            Join 500+ students who are already learning German with Plan Beta and building their path to Germany.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://wa.me/919028396035?text=Hi%20Plan%20Beta!%20I%20want%20to%20learn%20German%20and%20move%20to%20Germany."
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent("whatsapp_click", { location: "pathway_bottom_cta" })}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-green-500 text-white font-semibold rounded-full hover:bg-green-600 transition-all shadow-lg"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Chat on WhatsApp
            </a>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-white font-semibold rounded-full hover:bg-primary-dark transition-all shadow-lg shadow-primary/25"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <span className="text-white font-medium pr-4">{question}</span>
        <svg
          className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <p className="px-5 pb-5 text-gray-400 text-sm leading-relaxed">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
