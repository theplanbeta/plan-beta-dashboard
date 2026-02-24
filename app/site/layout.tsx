"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import AIChatbot from "@/components/marketing/AIChatbot"
import PushNotificationPrompt from "@/components/marketing/PushNotificationPrompt"
import { trackEvent } from "@/lib/tracking"
import CookieConsent from "@/components/marketing/CookieConsent"
import ConsentAnalytics from "@/components/marketing/ConsentAnalytics"
import TrackingProvider from "@/components/marketing/TrackingProvider"

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Register service worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {})
    }
  }, [])

  const navigation = [
    { name: "Courses", href: "/site/courses" },
    { name: "For Nurses", href: "/site/nurses" },
    { name: "Opportunities", href: "/site/opportunities" },
    { name: "About", href: "/site/about" },
    { name: "Contact", href: "/site/contact" },
  ]

  const isHome = pathname === "/site"
  const navTransparent = isHome && !isScrolled

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          navTransparent
            ? "bg-transparent"
            : "bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm"
        }`}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <Link href="/site" className="flex items-center space-x-3">
              <Image
                src="/blogo.png"
                alt="Plan Beta"
                width={36}
                height={36}
                className="rounded-lg transition-all duration-300"
              />
              <span
                className={`text-lg font-semibold tracking-tight transition-colors duration-300 ${
                  navTransparent ? "text-white" : "text-gray-900"
                }`}
              >
                Plan Beta
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`relative px-4 py-2 text-sm font-medium transition-colors duration-300 ${
                    pathname === item.href
                      ? navTransparent
                        ? "text-white"
                        : "text-primary"
                      : navTransparent
                        ? "text-white/80 hover:text-white"
                        : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {item.name}
                  {pathname === item.href && (
                    <motion.div
                      layoutId="nav-indicator"
                      className={`absolute bottom-0 left-4 right-4 h-0.5 rounded-full ${
                        navTransparent ? "bg-white" : "bg-primary"
                      }`}
                    />
                  )}
                </Link>
              ))}
            </div>

            {/* CTA + Mobile Toggle */}
            <div className="flex items-center gap-3">
              <a
                href="https://courses.planbeta.in/users/sign_in"
                target="_blank"
                rel="noopener noreferrer"
                className={`hidden md:inline-flex items-center px-4 py-2 text-sm font-medium rounded-full transition-all duration-300 ${
                  navTransparent
                    ? "text-white/80 hover:text-white border border-white/30 hover:border-white/60"
                    : "text-gray-600 hover:text-gray-900 border border-gray-300 hover:border-gray-400"
                }`}
              >
                Student Login
              </a>
              <Link
                href="/site/contact"
                className={`hidden md:inline-flex items-center px-5 py-2 text-sm font-semibold rounded-full transition-all duration-300 ${
                  navTransparent
                    ? "bg-white text-gray-900 hover:bg-gray-100 shadow-lg shadow-white/10"
                    : "bg-primary text-white hover:bg-primary-dark shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
                }`}
              >
                Contact Us
              </Link>

              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`md:hidden p-2 rounded-lg transition-colors ${
                  navTransparent
                    ? "text-white hover:bg-white/10"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {isMobileMenuOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="md:hidden overflow-hidden"
              >
                <div className="py-4 space-y-1">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`block px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                        pathname === item.href
                          ? navTransparent
                            ? "bg-white/10 text-white"
                            : "bg-primary/10 text-primary"
                          : navTransparent
                            ? "text-white/80 hover:bg-white/10"
                            : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {item.name}
                    </Link>
                  ))}
                  <div className="pt-2 px-4 space-y-2">
                    <Link
                      href="/site/contact"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block w-full text-center px-4 py-3 bg-primary text-white rounded-full font-semibold"
                    >
                      Contact Us
                    </Link>
                    <a
                      href="https://courses.planbeta.in/users/sign_in"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block w-full text-center px-4 py-3 border border-gray-300 text-gray-700 rounded-full font-medium"
                    >
                      Student Login
                    </a>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>
      </header>

      {/* Main Content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="bg-[#0a0a0a] text-white">
        {/* Brand Statement */}
        <div className="border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
            <p className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-3">
              Dein Weg nach Deutschland.
            </p>
            <p className="text-gray-500 text-lg">Your path to Germany.</p>
          </div>
        </div>

        {/* Footer Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            {/* Brand */}
            <div className="lg:col-span-1">
              <div className="flex items-center space-x-3 mb-6">
                <Image
                  src="/blogo.png"
                  alt="Plan Beta"
                  width={36}
                  height={36}
                  className="rounded-lg"
                />
                <span className="text-lg font-semibold">Plan Beta</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                Kerala&apos;s premier German language institute. Learn German
                with expert instructors and proven methods.
              </p>
              <div className="flex space-x-3">
                {[
                  {
                    href: "https://facebook.com/theplanbeta",
                    label: "Facebook",
                    icon: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
                  },
                  {
                    href: "https://instagram.com/theplanbeta",
                    label: "Instagram",
                    icon: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z",
                  },
                  {
                    href: "https://youtube.com/@planbeta00",
                    label: "YouTube",
                    icon: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
                  },
                ].map((social) => (
                  <motion.a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.15 }}
                    className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                    aria-label={social.label}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d={social.icon} />
                    </svg>
                  </motion.a>
                ))}
              </div>
            </div>

            {/* Courses */}
            <div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-6">
                Courses
              </h3>
              <ul className="space-y-3">
                {[
                  ["A1 Foundation", "/site/courses"],
                  ["A2 Live Classes", "/site/courses"],
                  ["B1 Live Classes", "/site/courses"],
                  ["Speaking Practice", "/site/courses"],
                ].map(([name, href]) => (
                  <li key={name}>
                    <Link
                      href={href}
                      className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      {name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-6">
                Company
              </h3>
              <ul className="space-y-3">
                {[
                  ["About Us", "/site/about"],
                  ["For Nurses", "/site/nurses"],
                  ["Opportunities", "/site/opportunities"],
                  ["Blog", "/site/blog"],
                  ["Contact", "/site/contact"],
                ].map(([name, href]) => (
                  <li key={name}>
                    <Link
                      href={href}
                      className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      {name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-6">
                Get in Touch
              </h3>
              <ul className="space-y-4 text-sm text-gray-400">
                <li>
                  <a
                    href="mailto:hello@planbeta.in"
                    className="hover:text-white transition-colors"
                  >
                    hello@planbeta.in
                  </a>
                </li>
                <li>Mon - Sat, 9 AM - 8 PM IST</li>
                <li>100% Online Classes</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-gray-500 text-sm">
                &copy; {new Date().getFullYear()} Plan Beta. All rights
                reserved.
              </p>
              <div className="flex items-center space-x-6 text-sm">
                <Link
                  href="/privacy"
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  Privacy
                </Link>
                <Link
                  href="/terms"
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  Terms
                </Link>
                <Link
                  href="/terms"
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  Refund Policy
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* WhatsApp Floating Button */}
      <a
        href="https://wa.me/919028396035?text=Hi%20Plan%20Beta!%20I'm%20interested%20in%20learning%20German."
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackEvent("whatsapp_click", { location: "floating_button" })}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-green-500 rounded-full flex items-center justify-center shadow-lg hover:bg-green-600 transition-all hover:scale-110"
        aria-label="Chat on WhatsApp"
      >
        <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>

      {/* AI Chatbot */}
      <AIChatbot />

      {/* Push Notification Prompt */}
      <PushNotificationPrompt />

      {/* Tracking & Analytics */}
      <TrackingProvider />
      <CookieConsent />
      <ConsentAnalytics />
    </div>
  )
}
