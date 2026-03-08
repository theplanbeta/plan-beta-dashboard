// Shared data for marketing site — used by both server and client components

export const selfPacedCourse = {
  id: "a1-self-paced",
  title: "German A1 Foundation",
  subtitle: "Self-Paced Course",
  description:
    "Learn German at your own pace with 100+ video lessons, exercises, and native speaker audio. Perfect for working professionals and people with shift duties who can't attend fixed live sessions.",
  duration: "Lifetime access",
  level: "Beginner",
  features: [
    "100+ video lessons",
    "Practice exercises after each lesson",
    "Audio from native German speakers",
    "Malayalam explanations",
    "Taught by Aparna Bose (Founder)",
    "Lifetime access to all updates",
  ],
  stats: {
    videos: "100+",
    exercises: "50+",
    audio: "Native",
    access: "Lifetime",
  },
}

export const courses = [
  {
    id: "a1-live",
    title: "German A1",
    outcomeTitle: "A1 — Your Foundation for Germany",
    subtitle: "Beginner",
    description:
      "The first step to your German life. Build the basics you need for visa applications, simple conversations, and your Goethe A1 exam.",
    duration: "8 weeks",
    level: "Beginner",
    features: [
      "Live classes 5x/week",
      "Small batch (max 15)",
      "Recordings included",
      "Direct doubt clearing",
    ],
    popular: true,
    color: "from-emerald-500 to-green-600",
  },
  {
    id: "a2-live",
    title: "German A2",
    outcomeTitle: "A2 — Everyday Life in Germany",
    subtitle: "Elementary",
    description:
      "Handle daily life in Germany with confidence. From grocery shopping to doctor visits — the language skills you need to settle in.",
    duration: "10 weeks",
    level: "Elementary",
    features: [
      "Live classes 5x/week",
      "Speaking practice",
      "Grammar deep-dive",
      "A2 exam preparation",
    ],
    popular: false,
    color: "from-blue-500 to-indigo-600",
  },
  {
    id: "b1-live",
    title: "German B1",
    outcomeTitle: "B1 — The Level That Opens German Jobs",
    subtitle: "Intermediate",
    description:
      "The gateway to German work visas. B1 is required for most jobs — clear it and unlock nursing, IT, and engineering careers in Germany.",
    duration: "12 weeks",
    level: "Intermediate",
    features: [
      "Live classes 5x/week",
      "Business German",
      "Interview prep",
      "B1 Goethe exam prep",
    ],
    popular: false,
    color: "from-purple-500 to-violet-600",
  },
  {
    id: "b2-live",
    title: "German B2",
    outcomeTitle: "B2 — Professional Recognition in Germany",
    subtitle: "Upper Intermediate",
    description:
      "The level that gets your qualifications recognised. Required for nursing registration, medical practice, and senior professional roles in Germany.",
    duration: "14 weeks",
    level: "Upper Intermediate",
    features: [
      "Live classes 5x/week",
      "Professional German",
      "Medical/Technical vocab",
      "B2 Goethe/TELC prep",
    ],
    popular: false,
    color: "from-rose-500 to-red-600",
  },
]

export const testimonials = [
  {
    name: "Aiswarya Menon",
    role: "Nursing Professional",
    location: "Now in Munich",
    content:
      "Plan Beta transformed my career. The structured approach helped me clear B1 in just 8 months. Now I'm working as a nurse in Germany!",
    rating: 5,
    avatar: "A",
    fromCity: "Kochi",
    course: "A1 to B2",
    nowWorkingAs: "Nurse at Klinikum rechts der Isar",
    inCity: "Munich",
  },
  {
    name: "Rahul Krishnan",
    role: "IT Engineer",
    location: "Now in Berlin",
    content:
      "The live classes were exactly what I needed. Unlike other courses, here I could actually practice speaking. The teachers were always available.",
    rating: 5,
    avatar: "R",
    fromCity: "Thiruvananthapuram",
    course: "A1 to B1",
    nowWorkingAs: "Software Developer at SAP",
    inCity: "Berlin",
  },
  {
    name: "Sneha Thomas",
    role: "Medical Student",
    location: "Preparing for Germany",
    content:
      "I tried many apps before Plan Beta. The difference is the human touch — real teachers who understand Malayalam speakers' challenges with German.",
    rating: 5,
    avatar: "S",
    fromCity: "Thrissur",
    course: "A1 to B1",
    nowWorkingAs: "Medical Student at Charité",
    inCity: "Berlin",
  },
]

export const stats = [
  { number: 2500, suffix: "+", label: "Students Trained" },
  { number: 95, suffix: "%", label: "Exam Pass Rate" },
  { number: 4.8, suffix: "★", label: "Student Rating", decimal: true },
  { number: 500, suffix: "+", label: "Now in Germany" },
]

export const features = [
  {
    title: "Live Interactive Classes",
    description:
      "Small batch sizes ensure personal attention. Ask questions, practice speaking, and get instant feedback from expert instructors.",
    icon: "video",
    span: 2,
    video: "/videos/bento-classes.mp4",
  },
  {
    title: "Expert Instructors",
    description:
      "Certified German teachers who understand the specific challenges Malayalam speakers face.",
    icon: "teacher",
    span: 1,
    video: "/videos/bento-instructors.mp4",
  },
  {
    title: "Flexible Timing",
    description:
      "Morning and evening batches. Miss a class? Watch the recording anytime.",
    icon: "clock",
    span: 1,
    video: "/videos/bento-timing.mp4",
  },
  {
    title: "Exam-Focused Curriculum",
    description:
      "Designed to help you pass Goethe-Institut exams on your first attempt. 95% of our students do.",
    icon: "target",
    span: 2,
    video: "/videos/bento-exam.mp4",
  },
  {
    title: "Career Placement Support",
    description:
      "From job search to placement — we connect you with employers in Germany. Nurses get end-to-end support: training, Anerkennung, and hospital placement.",
    icon: "briefcase",
    span: 1,
    video: "/videos/bento-career.mp4",
  },
  {
    title: "Certification",
    description:
      "Certificates valued by German universities and employers worldwide.",
    icon: "certificate",
    span: 1,
    video: "/videos/bento-certification.mp4",
  },
]

export const faqs = [
  {
    question: "What level of German will I achieve?",
    answer:
      "Our courses follow the Common European Framework (CEFR). A1 takes you from zero to basic conversation. A2 enables simple everyday communication. B1 qualifies you for work permits and university admission. B2 gives you professional-level fluency required for healthcare, engineering, and academic roles in Germany.",
  },
  {
    question: "How long does it take to complete each level?",
    answer:
      "With our live classes: A1 takes 8 weeks, A2 takes 10 weeks, B1 takes 12 weeks, and B2 takes 14 weeks. Self-paced courses give you 3-6 months of access to complete at your own speed.",
  },
  {
    question: "Do I need any prior knowledge of German?",
    answer:
      "Not at all! Our A1 course starts from absolute zero. We teach you the alphabet, basic words, and build up systematically.",
  },
  {
    question: "What if I miss a live class?",
    answer:
      "All live classes are recorded and available within 24 hours. You can watch them anytime during your course period.",
  },
  {
    question: "Will this help me get a job in Germany?",
    answer:
      "Absolutely. We don't just teach German — we help you get placed. For nurses, we handle the full journey: A1→B2 training, Anerkennung (qualification recognition), and hospital placement. For engineers and IT professionals, we prepare you for Blue Card applications. 500+ of our alumni are now working in Germany.",
  },
]

export const marqueeItems = [
  "Aiswarya is now a nurse in Munich",
  "Rahul landed a tech job in Berlin",
  "Sneha passed B1 on her first attempt",
  "Vishnu got his Blue Card approved",
  "Anjali is studying medicine in Hamburg",
  "Deepak started his engineering career in Stuttgart",
  "Priya cleared A2 in just 10 weeks",
  "Arjun is now a software developer in Frankfurt",
]

export const pathwaySteps = [
  {
    title: "Check Your Eligibility",
    description:
      "Take our free assessment to find out which German level you need for your career goal — nursing, IT, engineering, or studies.",
    icon: "clipboard",
    href: "/contact",
  },
  {
    title: "Start Your German Course",
    description:
      "Join a live batch (A1–B2) with small class sizes, Mon–Fri sessions, and teachers who speak Malayalam.",
    icon: "book",
    href: "/courses",
  },
  {
    title: "Pass Your Goethe/TELC Exam",
    description:
      "Our exam-focused curriculum has a 95% first-attempt pass rate. Get certified at the level German employers require.",
    icon: "award",
    href: "/courses",
  },
  {
    title: "Get Placed in Germany",
    description:
      "We connect you with employers. Nurses get end-to-end placement (training + Anerkennung + hospital job). Engineers get Blue Card guidance. Browse real openings on our job board.",
    icon: "plane",
    href: "/jobs",
  },
  {
    title: "Start Your Life in Germany",
    description:
      "Join 500+ Plan Beta alumni already in Germany. Get settling-in support, job leads, and community from day one.",
    icon: "flag",
    href: "/about",
  },
]

export const alumniHighlights = [
  { name: "Aiswarya M.", role: "Nurse", city: "Munich" },
  { name: "Rahul K.", role: "Software Developer", city: "Berlin" },
  { name: "Anjali R.", role: "Medical Student", city: "Hamburg" },
  { name: "Deepak S.", role: "Mechanical Engineer", city: "Stuttgart" },
  { name: "Priya V.", role: "Care Worker", city: "Frankfurt" },
  { name: "Arjun N.", role: "Data Analyst", city: "Düsseldorf" },
]
