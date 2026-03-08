"use client"

import { useState } from "react"
import Link from "next/link"

interface Question {
  question: string
  options: { label: string; points: number }[]
}

const QUESTIONS: Question[] = [
  {
    question: "How would you introduce yourself in German?",
    options: [
      { label: "I can't say anything in German", points: 0 },
      { label: "Ich heiße... Ich komme aus...", points: 1 },
      { label: "I can talk about my hobbies and daily routine", points: 2 },
      { label: "I can describe my past experiences and future plans", points: 3 },
      { label: "I can discuss complex topics and debate opinions", points: 4 },
    ],
  },
  {
    question: "Which sentence can you understand when spoken?",
    options: [
      { label: "None of these", points: 0 },
      { label: "\"Wie geht es Ihnen?\" (How are you?)", points: 1 },
      { label: "\"Können Sie mir den Weg zum Bahnhof erklären?\"", points: 2 },
      { label: "A German news broadcast at normal speed", points: 3 },
      { label: "German podcasts, movies, and academic lectures", points: 4 },
    ],
  },
  {
    question: "Can you write an email in German?",
    options: [
      { label: "Not at all", points: 0 },
      { label: "Simple messages (name, address, date)", points: 1 },
      { label: "Short personal emails with basic grammar", points: 2 },
      { label: "Formal business emails with correct register", points: 3 },
      { label: "Complex reports, essays, or formal complaints", points: 4 },
    ],
  },
  {
    question: "How well can you handle a job interview in German?",
    options: [
      { label: "Not at all — I'd need an interpreter", points: 0 },
      { label: "I could answer very basic questions slowly", points: 1 },
      { label: "I could manage with some preparation and pauses", points: 2 },
      { label: "I could handle most questions confidently", points: 3 },
      { label: "Fluently — including technical and situational questions", points: 4 },
    ],
  },
  {
    question: "How do you feel about German grammar?",
    options: [
      { label: "I don't know any German grammar", points: 0 },
      { label: "I know present tense and basic word order", points: 1 },
      { label: "I use Dativ, Akkusativ, and past tenses", points: 2 },
      { label: "I'm comfortable with Konjunktiv and passive voice", points: 3 },
      { label: "I rarely make grammar errors even in complex structures", points: 4 },
    ],
  },
]

function getLevel(score: number): { level: string; description: string; color: string } {
  if (score <= 3) return { level: "A1", description: "Beginner — You're at the start of your German journey", color: "text-blue-400" }
  if (score <= 7) return { level: "A2", description: "Elementary — You can handle basic everyday situations", color: "text-cyan-400" }
  if (score <= 11) return { level: "B1", description: "Intermediate — You can deal with most daily situations in Germany", color: "text-emerald-400" }
  if (score <= 15) return { level: "B2", description: "Upper Intermediate — You can work professionally in German", color: "text-amber-400" }
  return { level: "C1", description: "Advanced — You can use German fluently in academic and professional settings", color: "text-purple-400" }
}

const LEVEL_JOBS: Record<string, string[]> = {
  A1: ["Mini-jobs in warehouses", "Kitchen helper", "Cleaning jobs"],
  A2: ["Werkstudent in international companies", "Hospitality (tourist areas)", "Retail (tourist shops)"],
  B1: ["Werkstudent in German companies", "Customer service", "Administrative assistant"],
  B2: ["Professional roles", "Teaching assistant", "Marketing/communications"],
  C1: ["Management positions", "Legal/medical assistant", "Journalism/media"],
}

export function GermanLevelQuiz() {
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [finished, setFinished] = useState(false)

  const handleAnswer = (points: number) => {
    const newAnswers = [...answers, points]
    setAnswers(newAnswers)
    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ(currentQ + 1)
    } else {
      setFinished(true)
    }
  }

  const reset = () => {
    setCurrentQ(0)
    setAnswers([])
    setFinished(false)
  }

  if (finished) {
    const totalScore = answers.reduce((s, a) => s + a, 0)
    const result = getLevel(totalScore)
    const matchingJobs = LEVEL_JOBS[result.level] || LEVEL_JOBS.A2

    return (
      <div className="space-y-6">
        <div className="bg-[#1a1a1a] border border-white/[0.08] rounded-2xl p-8 text-center">
          <p className="text-sm text-gray-500 mb-2">Your estimated German level</p>
          <p className={`text-6xl font-black ${result.color} mb-3`}>{result.level}</p>
          <p className="text-gray-400 mb-6">{result.description}</p>
          <p className="text-xs text-gray-600">Score: {totalScore}/{QUESTIONS.length * 4}</p>
        </div>

        <div className="bg-[#1a1a1a] border border-white/[0.08] rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-3">Jobs you can target at {result.level}</h3>
          <ul className="space-y-2 mb-4">
            {matchingJobs.map((job, i) => (
              <li key={i} className="flex items-center gap-2 text-gray-400 text-sm">
                <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {job}
              </li>
            ))}
          </ul>
          <Link
            href={`/jobs/student-jobs?germanLevel=${result.level}`}
            className="text-primary text-sm font-semibold hover:text-primary-light transition-colors"
          >
            See {result.level} jobs →
          </Link>
        </div>

        <div className="bg-primary/5 border border-primary/10 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Want to level up?</h3>
          <p className="text-sm text-gray-400 mb-4">
            Plan Beta offers structured {result.level === "C1" ? "advanced" : `${result.level} → ${result.level === "A1" ? "A2" : result.level === "A2" ? "B1" : result.level === "B1" ? "B2" : "C1"}`} German courses.
            Better German opens higher-paying jobs.
          </p>
          <div className="flex gap-3">
            <a
              href="https://wa.me/919028396035?text=Hi!%20I%20took%20the%20German%20level%20quiz%20and%20got%20"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-all"
            >
              Chat About Courses
            </a>
            <Link
              href="/courses"
              className="px-4 py-2 bg-white/5 border border-white/[0.1] text-gray-300 text-sm rounded-lg hover:bg-white/10 transition-all"
            >
              View Courses
            </Link>
          </div>
        </div>

        <button onClick={reset} className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
          Retake quiz
        </button>
      </div>
    )
  }

  const q = QUESTIONS[currentQ]

  return (
    <div>
      {/* Progress */}
      <div className="flex items-center gap-2 mb-6">
        {QUESTIONS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all ${
              i < currentQ ? "bg-primary" : i === currentQ ? "bg-primary/50" : "bg-white/[0.08]"
            }`}
          />
        ))}
      </div>

      <p className="text-sm text-gray-500 mb-2">Question {currentQ + 1} of {QUESTIONS.length}</p>

      <div className="bg-[#1a1a1a] border border-white/[0.08] rounded-2xl p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-white mb-6">{q.question}</h2>
        <div className="space-y-3">
          {q.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleAnswer(opt.points)}
              className="w-full text-left px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-gray-300 hover:bg-white/[0.06] hover:border-white/[0.15] hover:text-white transition-all"
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
