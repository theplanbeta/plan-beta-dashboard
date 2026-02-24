// Shared data for marketing site — used by both server and client components

export const courses = [
  {
    id: "a1-live",
    title: "German A1",
    subtitle: "Beginner",
    description:
      "Start from zero. Interactive live classes with expert instructors, 5 days a week.",
    price: 14000,
    originalPrice: 17500,
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
    subtitle: "Elementary",
    description:
      "Build conversation skills and grammar mastery. Prepare for everyday situations.",
    price: 16000,
    originalPrice: 20000,
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
    subtitle: "Intermediate",
    description:
      "The level required for work visas. Achieve real conversational fluency.",
    price: 18000,
    originalPrice: 22500,
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
  },
  {
    name: "Rahul Krishnan",
    role: "IT Engineer",
    location: "Now in Berlin",
    content:
      "The live classes were exactly what I needed. Unlike other courses, here I could actually practice speaking. The teachers were always available.",
    rating: 5,
    avatar: "R",
  },
  {
    name: "Sneha Thomas",
    role: "Medical Student",
    location: "Preparing for Germany",
    content:
      "I tried many apps before Plan Beta. The difference is the human touch — real teachers who understand Malayalam speakers' challenges with German.",
    rating: 5,
    avatar: "S",
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
    title: "Career Guidance",
    description:
      "Mentorship from professionals already in Germany. We help beyond just language.",
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
      "Our courses follow the Common European Framework (CEFR). A1 takes you from zero to basic conversation. A2 enables simple everyday communication. B1 qualifies you for work permits and university admission in Germany.",
  },
  {
    question: "How long does it take to complete each level?",
    answer:
      "With our live classes: A1 takes 8 weeks, A2 takes 10 weeks, and B1 takes 12 weeks. Self-paced courses give you 3-6 months of access to complete at your own speed.",
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
      "Absolutely. B1 level is the minimum requirement for most work visas. Many of our students are now working in Germany in nursing, IT, engineering, and other fields.",
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
