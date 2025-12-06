"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, Play, X, Check, X as XIcon, AlertTriangle, Gift, Info } from "lucide-react"
import Footer from "./footer"
import ProcessFlowSection from "./process-flow-section"

function PurchaseModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [formData, setFormData] = useState({ name: "", email: "" })
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    console.log("[v0] Purchase form submitted:", formData)
    setIsSuccess(true)
    setTimeout(() => {
      console.log("[v0] Purchase completed successfully")
      onClose()
      setFormData({ name: "", email: "" })
      setIsSuccess(false)
    }, 2000)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-[#1a1a1a] rounded-2xl max-w-md w-full mx-4 shadow-2xl border border-[#B45309]"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {isSuccess ? (
              <div className="p-8 text-center">
                <motion.div
                  className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                >
                  <Check size={32} className="text-green-500" />
                </motion.div>
                <h3 className="text-xl font-bold text-white mb-2">All Set!</h3>
                <p className="text-gray-400">Check your email for next steps.</p>
              </div>
            ) : (
              <>
                <div className="px-8 py-6 border-b border-[#B45309] flex justify-between items-center bg-[#B45309]">
                  <h2 className="text-xl font-bold text-white">Get Your AI Clone</h2>
                  <button onClick={onClose} className="p-1 hover:bg-[#92400E] rounded-lg text-white">
                    <X size={24} />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Full Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Your name"
                      className="w-full px-4 py-2 rounded-lg bg-[#2a2a2a] border border-[#B45309] text-white placeholder-gray-500 focus:outline-none focus:border-[#F59E0B]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Email Address</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="you@example.com"
                      className="w-full px-4 py-2 rounded-lg bg-[#2a2a2a] border border-[#B45309] text-white placeholder-gray-500 focus:outline-none focus:border-[#F59E0B]"
                      required
                    />
                  </div>
                  <motion.button
                    type="submit"
                    className="w-full py-3 bg-[#B45309] text-white rounded-lg font-semibold hover:bg-[#92400E] transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Complete Purchase — $37
                  </motion.button>
                  <p className="text-xs text-gray-500 text-center">30-day money-back guarantee</p>
                </form>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function FAQAccordion({ faqs }: { faqs: Array<{ q: string; a: string }> }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const prefersReducedMotion =
    typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false

  return (
    <div className="space-y-4">
      {faqs.map((faq, idx) => (
        <motion.div
          key={idx}
          className="border border-gray-300 rounded-lg overflow-hidden bg-white"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
          viewport={{ once: true, margin: "-100px" }}
        >
          <button
            onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
            className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors text-left"
            aria-expanded={openIndex === idx}
          >
            <span className="font-semibold text-gray-900">{faq.q}</span>
            <motion.div
              animate={{ rotate: openIndex === idx ? 180 : 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
            >
              <ChevronDown size={20} className="text-[#C89356]" />
            </motion.div>
          </button>
          <AnimatePresence>
            {openIndex === idx && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
              >
                <div className="px-6 py-4 bg-gray-50 text-gray-900 border-t border-gray-200">{faq.a}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  )
}

// Helper function to route to process flow section
const routeToProcessFlow = () => {
  if (typeof window !== "undefined") {
    const currentPath = window.location.pathname
    if (currentPath === "/ai-clone") {
      // Already on ai-clone page, just scroll to section
      setTimeout(() => {
        const section = document.getElementById("process-flow")
        if (section) {
          section.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      }, 100)
    } else {
      // Navigate to ai-clone page with hash
      window.location.href = "/ai-clone#process-flow"
    }
  }
}

export default function AiClonePage() {
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false)
  const prefersReducedMotion =
    typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false

  const faqs = [
    {
      q: "How do unlimited campaigns work?",
      a: "We take full responsibility for planning, creating, launching, and optimizing your ads without any restrictions on the number of campaigns. Whether you need multiple projects for different communities, retargeting flows, or seasonal pushes — everything is included. Our team handles all strategy, creative direction, copywriting, audience testing, and ongoing refinements to ensure your campaigns consistently perform. You simply tell us your goals, and we execute.",
    },
    {
      q: "Will the ads run from my Ads Manager?",
      a: "Yes. All campaigns are launched directly from your own Meta Ads Manager for full transparency and control. This means: You retain 100% ownership of the data, You can monitor performance anytime, Budgets remain fully under your control. We only manage and optimize — you stay the account owner. We believe in absolute transparency — no hidden accounts or third-party setups.",
    },
    {
      q: "Do I get full access to the CRM?",
      a: "Absolutely. You maintain full ownership and access to the CRM. We help you integrate, automate, and structure the CRM so your leads flow in seamlessly real-time, and your team always knows what's happening. You can track: Every lead in real-time, Lead quality and status, Agent performance, Follow-ups and conversion reports. This ensures you have complete visibility over the pipeline at all times.",
    },
    {
      q: "Can you help set up tracking and automations?",
      a: "Yes. We fully handle your technical setup, including: Pixel + API installation, Lead routing, CRM integration, Automated follow-ups via SMS/WhatsApp/email, Custom dashboards. This ensures your system runs smoothly and every lead is captured and followed correctly.",
    },
    {
      q: "What kind of reporting will I receive?",
      a: "We provide transparent and easy-to-understand reports, including: Weekly performance summaries, Spend breakdown, Lead quality assessment, Campaign-level insights, Next-step recommendations.",
    },
  ]

  return (
    <main className="bg-black min-h-screen">
      <PurchaseModal isOpen={isPurchaseOpen} onClose={() => setIsPurchaseOpen(false)} />

      {/* Hero Section */}
      {/* ================= FIXED HERO SECTION ================= */}
      <section className="relative bg-[#C89356] overflow-visible z-0 pt-6 pb-25 rounded-b-[80px] md:rounded-b-[120px]">

        {/* Top Navigation */}
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <img src="/logo-white.png" alt="Signature" className="w-36" />

            <button
              onClick={routeToProcessFlow}
              className="hidden sm:block bg-white text-[#111] px-6 py-3 rounded-full font-semibold shadow-xl hover:scale-[1.02] transition"
            >
              Get Your AI Clone
            </button>
          </div>
        </div>

        {/* HEADINGS */}
        <div className="text-center max-w-4xl mx-auto px-6">
          <p className="text-white/95 text-[24px] mb-4 font-bold">No camera. No editing. No tech skills.</p>

          <h1 className="text-white font-extrabold text-[35px] md:text-[50px] leading-[0.9] drop-shadow-xl">
            Create Your AI Clone
          </h1>

          <p className="text-[#0b0b0b] text-[40px] md:text-[45px] font-semibold mt-3 mb-10">
            In Just 30 mins
          </p>
        </div>

        {/* VIDEO SECTION */}
        <div className="max-w-5xl mx-auto relative z-10 px-6">
          <div className="relative rounded-[50px] overflow-visible shadow-[0_35px_90px_rgba(0,0,0,0.6)]">

            <img
              src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1600&h=900&fit=crop"
              className="w-full rounded-[50px]"
            />

            {/* Bottom Vignette */}
            <div
              className="absolute inset-x-0 bottom-0 rounded-b-[50px]"
              style={{
                height: "150px",
                background:
                  "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.65) 60%, rgba(0,0,0,0.9) 100%)"
              }}
            />

            {/* Play Button */}
            <button
              className="absolute inset-0 m-auto w-[90px] h-[90px] rounded-full flex items-center justify-center"
              style={{
                background:
                  "radial-gradient(circle at 30% 30%, #ffc37c 0%, #ff9533 40%, #EA580C 100%)",
                boxShadow: "0 15px 45px rgba(234,88,12,0.45)"
              }}
            >
              <Play size={34} className="text-white ml-0.5" />
            </button>
          </div>
        </div>

        {/* Real Estate Section */}
        <div className="mt-12 text-center max-w-4xl mx-auto px-6">
          <motion.h2
            className="text-white font-bold text-[32px] md:text-[35px] lg:text-[30px] leading-tight mb-8 drop-shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            Real Estate Agents Are Using AI To Get
            <br />
            <span className="text-[36px] md:text-[56px] lg:text-[30px]">3x More Luxury Listings</span>
          </motion.h2>

          <motion.button
            onClick={() => setIsPurchaseOpen(true)}
            className="bg-white text-black rounded-full px-6 py-4 font-semibold text-lg shadow-[0_20px_60px_rgba(0,0,0,0.3)] hover:scale-[1.03] transition"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            Get Your AI Clone At $37
          </motion.button>
        </div>

        {/* LARGE ROUNDED BOTTOM CURVE */}
        <div className="absolute left-0 right-0 bottom-0 -z-10 h-[300px] overflow-hidden">
          <svg viewBox="0 0 1920 300" preserveAspectRatio="none" className="w-full h-full">
            <path
              d="M0 0 H1920 V120 Q960 350 0 120 Z"
              fill="#C89356"
            />
          </svg>
        </div>
      </section>
      {/* ================= END HERO SECTION ================= */}

      <section className="w-full py-20 bg-black flex flex-col items-center">
        {/* Title */}
        <h2 className="text-4xl md:text-4xl font-semibold text-white mb-14">
          Our AI <span className="text-[#D7A059]">Clones</span>
        </h2>

        {/* Image Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 px-6 md:px-0">
          {/* Card 1 */}
          <div className="w-[260px] h-[380px] bg-[#111] rounded-xl overflow-hidden shadow-lg">
            <img
              src="https://images.unsplash.com/photo-1689636430443-f9e8fb1ae5c4?auto=format&fit=crop&w=500&q=80"
              className="w-full h-full object-cover"
              alt="Unsplash sample 1"
            />
          </div>

          {/* Card 2 */}
          <div className="w-[260px] h-[380px] bg-[#111] rounded-xl overflow-hidden shadow-lg">
            <img
              src="https://images.unsplash.com/photo-1688349927079-7c5403e028cd?auto=format&fit=crop&w=500&q=80"
              className="w-full h-full object-cover"
              alt="Unsplash sample 2"
            />
          </div>

          {/* Card 3 */}
          <div className="w-[260px] h-[380px] bg-[#111] rounded-xl overflow-hidden shadow-lg">
            <img
              src="https://images.unsplash.com/photo-1687869483463-0bbf335b4398?auto=format&fit=crop&w=500&q=80"
              className="w-full h-full object-cover"
              alt="Unsplash sample 3"
            />
          </div>

          {/* Card 4 */}
          <div className="w-[260px] h-[380px] bg-[#111] rounded-xl overflow-hidden shadow-lg">
            <img
              src="https://images.unsplash.com/photo-1688024549809-c2b1ad13b681?auto=format&fit=crop&w=500&q=80"
              className="w-full h-full object-cover"
              alt="Unsplash sample 4"
            />
          </div>
        </div>
      </section>

      {/* Compare Options Section (adjusted widths/heights & subtler accents) */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Compare Your <span className="text-[#C89356]">Options</span>
            </h2>
            <p className="text-xl text-gray-700">See why 500+ agents choose the smart way.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {/* Old Way */}
            <motion.div
              className="relative flex-1 rounded-2xl border border-gray-200 bg-white p-8 flex flex-col min-h-[520px]"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              {/* small gold badge centered top */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-[#C89356] text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Expensive
                </span>
              </div>

              {/* small subtle gold corner (non-blurry) */}
              <div
                aria-hidden
                className="absolute -top-2 right-6 w-28 h-12 rounded-xl bg-gradient-to-br from-[#F5D8B0] to-transparent opacity-70"
              />

              <div className="text-center mb-6 mt-6">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <XIcon size={24} className="text-gray-700" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 tracking-wide">OLD WAY</h3>
                </div>
                <p className="text-gray-600 mb-4 text-lg font-medium italic">Hire Videographer</p>

                <div className="bg-gray-100 rounded-xl py-5 mb-6 mx-10">
                  <div className="text-4xl md:text-5xl font-bold text-gray-900">$500</div>
                </div>
              </div>

              <ul className="space-y-3 mt-2 flex-grow">
                {["Wait for scheduling", "Travel to location", "Expensive equipment", "Revision fees"].map(
                  (item, i) => (
                    <li key={i} className="flex items-center gap-3 text-gray-700">
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <XIcon size={12} className="text-gray-700" />
                      </div>
                      <span className="text-sm">{item}</span>
                    </li>
                  )
                )}
              </ul>

              <div className="mt-6 pt-6 border-t border-gray-200 text-center text-sm text-gray-600">
                50 videos = <span className="text-[#C89356] font-semibold">$25,000</span>
              </div>
            </motion.div>

            {/* DIY Way */}
            <motion.div
              className="relative flex-1 rounded-2xl border border-gray-200 bg-white p-8 flex flex-col min-h-[520px]"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.06 }}
              viewport={{ once: true }}
            >
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-[#C89356] text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Time Sink
                </span>
              </div>

              <div
                aria-hidden
                className="absolute -top-2 right-6 w-28 h-12 rounded-xl bg-gradient-to-br from-[#F5D8B0] to-transparent opacity-70"
              />

              <div className="text-center mb-6 mt-6">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <AlertTriangle size={24} className="text-gray-700" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 tracking-wide">DIY WAY</h3>
                </div>
                <p className="text-gray-600 mb-4 text-lg font-medium italic">Learn Video Editing</p>

                <div className="bg-gray-100 rounded-xl py-5 mb-6 mx-10">
                  <div className="text-4xl md:text-5xl font-bold text-gray-900">$3K+</div>
                </div>
              </div>

              <ul className="space-y-3 mt-2 flex-grow">
                {[
                  "100+ hours learning",
                  "Software subscriptions",
                  "Online courses",
                  "Months to learn",
                  "Still looks amateur",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-700">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <XIcon size={12} className="text-gray-700" />
                    </div>
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 pt-6 border-t border-gray-200 text-center text-sm text-gray-600">
                Time = Money Lost
              </div>
            </motion.div>

            {/* Smart Way (toned down gradient; equal width) */}
            <motion.div
              className="relative flex-1 rounded-2xl border-2 border-green-600 p-8 flex flex-col min-h-[520px] bg-gradient-to-b from-emerald-500 to-emerald-600"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.12 }}
              viewport={{ once: true }}
              whileHover={{ y: -6 }}
            >
              <div className="absolute -top-3 right-8">
                <span className="bg-[#FCD34D] text-gray-900 px-4 py-1 rounded-full text-sm font-semibold">
                  Best Value
                </span>
              </div>

              {/* subtle circular icon */}
              <div className="text-center mb-6 mt-6">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                    <Check size={24} className="text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white tracking-wide">SMART WAY</h3>
                </div>
                <p className="text-white/90 mb-4 text-lg font-medium italic">AgentClone AI</p>

                <div className="bg-emerald-600 rounded-xl py-5 mb-6 mx-10 shadow-inner">
                  <div className="text-4xl md:text-5xl font-bold text-white">$37</div>
                </div>
              </div>

              <ul className="space-y-3 mt-2 flex-grow text-white">
                {[
                  "No Subscription Fees",
                  "Get your AI Avatar Clone (With Voice, Facial Expression & Body Language Cloning)",
                  "No skills needed",
                  "Get one free video of your AI Avatar with your script/prompt & post it on any Social Media Channel",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-1">
                      <Check size={12} className="text-white" />
                    </div>
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 pt-6 border-t border-emerald-500 text-center text-sm text-white/90">
                <div className="mb-3">You save: <span className="font-semibold">$24,963!</span></div>
                <button
                  className="w-full py-4 rounded-full text-black font-semibold text-lg flex items-center justify-center gap-3 shadow-lg"
                  style={{
                    background: "linear-gradient(90deg,#f7c361 0%, #f1a23a 50%, #e28f2c 100%)",
                    boxShadow: "0 10px 24px rgba(0,0,0,0.12), inset 0 6px 18px rgba(255,255,255,0.08)",
                    paddingLeft: "2.25rem",
                    paddingRight: "2.25rem",
                  }}
                >
                  <span>Get Your AI Clone At $37</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12h14M13 5l6 7-6 7" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

              </div>
            </motion.div>
          </div>
        </div>
      </section>




      {/* The Process Section - Interactive Flow */}
      <ProcessFlowSection />

      {/* Pricing Section */}
      {/* Compare / Pricing CTA Section — pixel-fit to screenshots */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-3xl mx-auto">
          <motion.div
            className="text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            {/* Headline */}
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4 text-black leading-tight">
              Ready to Transform{" "}
              <span className="text-[#C89356]">Your Real Estate Business?</span>
            </h2>

            {/* Sub-headline */}
            <p className="text-lg md:text-xl text-gray-800 mb-8">
              Join 500+ agents who are already using AI to dominate their market
            </p>

            {/* Green Bonus Banner */}
            {/* Green Bonus Banner — Bigger Version */}
            <motion.div
              className="relative bg-emerald-600 text-white rounded-[22px] px-8 py-7 mb-8 mx-auto max-w-2xl border-2 border-white/40 shadow-[0_25px_55px_rgba(0,0,0,0.08)]"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <div className="flex flex-col items-center justify-center">
                <div className="flex items-center justify-center gap-4 mb-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Gift size={26} className="text-amber-300" />
                  </div>

                  {/* Bigger Title */}
                  <div className="text-xl md:text-2xl font-extrabold uppercase tracking-wide">
                    YOUR BONUS IS LOCKED IN!
                  </div>
                </div>

                {/* Bigger subtitle */}
                <div className="text-base md:text-lg opacity-95 font-medium">
                  SSL Encrypted Payment &nbsp;•&nbsp; 30 Day Refund
                </div>
              </div>
            </motion.div>

            {/* White pricing card with warm gold border */}
            <motion.div
              className="relative bg-white rounded-[18px] p-8 border shadow-[0_30px_60px_rgba(16,24,32,0.06)] mb-8 mx-auto"
              style={{ borderColor: "#EBCB9A", borderWidth: 2 }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <div className="max-w-xl mx-auto text-center">
                <div className="text-gray-900 text-base mb-4">
                  Total Value: <span className="line-through">$2,085</span>
                </div>

                <div className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-4 leading-none">
                  $37
                </div>

                <div className="text-emerald-600 font-semibold text-lg mb-4">
                  98% OFF - BLACK FRIDAY ONLY
                </div>

                <div className="flex items-center justify-center gap-2 text-gray-700 text-sm">
                  <Info size={18} className="text-gray-700" />
                  <span>Price Will Jump to $97 tonight</span>
                </div>
              </div>
            </motion.div>

            {/* Gold pill CTA (pixel-match gradient + soft glow) */}
            <motion.button
              onClick={routeToProcessFlow}
              className="mx-auto block mt-2 mb-12 rounded-full font-semibold"
              style={{
                // gradient tuned to the screenshot
                background: "linear-gradient(90deg,#F6C066 0%, #F0A43A 50%, #E38826 100%)",
                color: "#111827",
                padding: "0.9rem 3.2rem",
                fontSize: "1.05rem",
                boxShadow:
                  "0 18px 36px rgba(227,129,38,0.18), inset 0 6px 18px rgba(255,255,255,0.08)",
              }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center gap-3">
                <span>Get Your AI Clone At $37</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M5 12h14M13 5l6 7-6 7"
                    stroke="#111827"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* ================ Compare Options — REPLACE THIS ENTIRE SECTION ================ */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-black text-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
              Select On <span className="text-[#C89356]">Top Service</span>
            </h2>
            <p className="text-xl text-gray-300">See why 500+ agents choose the smart way.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* ------------------------------------------------------------- */}
            {/* LEFT CARD — CARAMEL WITH GRID + 'Most Popular' BADGE         */}
            {/* ------------------------------------------------------------- */}
            <motion.div
              className="relative rounded-[28px] p-10 bg-[#C89356] border-4 border-white shadow-[0_25px_70px_rgba(0,0,0,0.65)] overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              {/* MOST POPULAR BADGE */}
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-white text-black px-5 py-1 rounded-full text-sm font-semibold shadow-lg">
                Most Popular
              </div>

              {/* GRID PATTERN OVERLAY TOP ONLY */}
              <div
                className="absolute top-0 left-0 w-full h-1/2 opacity-[0.22] pointer-events-none"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px)",
                  backgroundSize: "32px 32px",
                }}
              />

              <div className="relative text-left mb-6 z-10">
                <h3 className="text-[26px] font-bold text-black mb-2 leading-tight">
                  Multiple AI Content Avatar
                </h3>
                <p className="text-black/85 mb-6 leading-relaxed">
                  Ideal deal for: A consistent pipeline of avatar-led short-form content
                </p>
                <div className="text-4xl font-bold text-black mb-6">499 USD</div>
                <hr className="border-black/30 mb-6" />
              </div>

              {/* INCLUDED LIST */}
              <div className="relative z-10 mb-6">
                <h4 className="font-semibold text-black mb-4 text-lg">What's Included</h4>
                <ul className="space-y-4 text-black/90">
                  {[
                    "Reels Scripting & Creative Direction",
                    "Capture of up to 5 AI Avatar Clones (With Voice, Facial Expression & Body Language Cloning)",
                    "15 Reels included (professionally edited)",
                    "Social media management included",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      {/* WHITE CIRCLE + GOLD CHECK */}
                      <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shadow">
                        <Check size={15} className="text-[#C89356]" />
                      </div>
                      <span className="text-base leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* WHITE BUTTON WITH INNER GLOW */}
              <motion.button
                onClick={routeToProcessFlow}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="relative w-full mt-4 rounded-full py-4 font-bold text-black"
                style={{
                  background: "#ffffff",
                  boxShadow:
                    "0 18px 40px rgba(0,0,0,0.35), inset 0 6px 12px rgba(255,255,255,0.95)",
                }}
              >
                Purchase Now
              </motion.button>
            </motion.div>

            {/* ------------------------------------------------------------- */}
            {/* RIGHT CARD — WHITE WITH GOLD HIGHLIGHT + ORANGE BUTTON        */}
            {/* ------------------------------------------------------------- */}
            <motion.div
              className="relative rounded-[28px] p-10 bg-white border-4 border-white shadow-[0_25px_70px_rgba(0,0,0,0.65)] overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
            >
              {/* WARM GOLD HIGHLIGHT CORNER */}
              <div
                className="absolute top-0 right-0 w-60 h-60 opacity-40 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(circle at top right, rgba(240,180,80,0.45), rgba(255,255,255,0) 70%)",
                  filter: "blur(22px)",
                }}
              />

              <div className="relative text-left mb-6 z-10">
                <h3 className="text-[26px] font-bold text-gray-900 mb-2 leading-tight">
                  Plug & Play System
                </h3>
                <p className="text-gray-700 mb-6 leading-relaxed">
                  Ideal for: Fully managed Avatars + Social Media content management across all channels end-to-end.
                </p>
                <div className="text-4xl font-bold text-gray-900 mb-6">999 USD</div>
                <hr className="border-gray-300 mb-6" />
              </div>

              {/* INCLUDED LIST */}
              <div className="relative z-10 mb-6">
                <h4 className="font-semibold text-gray-900 mb-4 text-lg">What's Included</h4>
                <ul className="space-y-4 text-gray-800">
                  {[
                    "Reels Scriptwriting & Monthly content calendar",
                    "Capture of up to 24 custom AI Avatars/Clones (With Voice, Facial Expression & Body Language Cloning)",
                    "30 Reels included (professionally edited)",
                    "Social Media Management included",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      {/* GOLD CIRCLE + WHITE CHECK */}
                      <div className="w-7 h-7 rounded-full bg-[#F59E0B] flex items-center justify-center shadow">
                        <Check size={15} className="text-white" />
                      </div>
                      <span className="text-base leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* ORANGE GRADIENT BUTTON — EXACT MATCH */}
              <motion.button
                onClick={routeToProcessFlow}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="relative w-full mt-4 rounded-full py-4 font-bold text-black"
                style={{
                  background: "linear-gradient(90deg,#EA580C,#F59E0B)",
                  boxShadow:
                    "0 22px 55px rgba(234,88,12,0.35), inset 0 6px 15px rgba(255,255,255,0.15)",
                }}
              >
                Purchase Now
              </motion.button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ================ end replacement ================ */}

      {/* ================= Get Results Section — REPLACEMENT ================= */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-[#C89356]">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="relative"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            {/* big rounded white card */}
            <div className="relative mx-6 sm:mx-8 lg:mx-12 rounded-[36px] bg-white overflow-hidden border-2 border-white/90 shadow-[0_35px_90px_rgba(0,0,0,0.32)]">
              {/* decorative soft golden rays (top-left & top-right) */}
              <div aria-hidden className="absolute inset-x-0 top-0 pointer-events-none" style={{ height: 220 }}>
                <div
                  style={{
                    position: "absolute",
                    left: 56,
                    top: -84,
                    width: 520,
                    height: 340,
                    background:
                      "radial-gradient(closest-side, rgba(200,150,100,0.22), rgba(200,150,100,0.06) 35%, rgba(255,255,255,0) 60%)",
                    filter: "blur(44px)",
                    transform: "rotate(-8deg)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    right: 56,
                    top: -84,
                    width: 520,
                    height: 340,
                    background:
                      "radial-gradient(closest-side, rgba(200,150,100,0.18), rgba(200,150,100,0.05) 35%, rgba(255,255,255,0) 60%)",
                    filter: "blur(44px)",
                    transform: "rotate(8deg)",
                  }}
                />
              </div>

              <div className="relative px-6 sm:px-10 lg:px-16 py-20">
                {/* floating avatars (replace src with your bitmoji images) */}
                <img
                  src="/path/to/bitmoji-left.png"
                  alt="avatar-left"
                  className="absolute left-12 top-40 w-12 h-12 rounded-full bg-white shadow-md object-cover"
                  style={{ zIndex: 30 }}
                />
                <img
                  src="/path/to/bitmoji-right.png"
                  alt="avatar-right"
                  className="absolute right-14 top-28 w-12 h-12 rounded-full bg-white shadow-md object-cover"
                  style={{ zIndex: 30 }}
                />

                {/* Headline */}
                <h2 className="text-center">
                  <span className="text-4xl md:text-5xl font-extrabold text-black">Get </span>
                  <span className="text-4xl md:text-5xl font-extrabold" style={{ color: "#C89356" }}>
                    Results
                  </span>
                  <span className="text-4xl md:text-5xl font-extrabold text-black"> Now.</span>
                  {/* small orange heart accent */}
                  <span className="inline-block align-middle ml-3">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M12 21s-6.716-4.686-9.333-7.104C-0.222 10.84 3.333 6 7.5 8.5 9.354 9.73 12 12 12 12s2.646-2.27 4.5-3.5C20.667 6 24.222 10.84 21.333 13.896 18.716 16.314 12 21 12 21z" fill="#F97316" />
                    </svg>
                  </span>
                </h2>

                <p className="mt-6 text-center text-lg text-gray-600 max-w-2xl mx-auto">
                  See your profiles grow, and let's boost your brand's earnings together.
                </p>

                {/* CTA centered */}
                <div className="mt-10 flex justify-center">
                  <motion.button
                    onClick={routeToProcessFlow}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    className="rounded-full px-10 py-4 font-bold text-lg md:text-xl"
                    style={{
                      background: "linear-gradient(90deg,#F6C066 0%, #F0A43A 50%, #E38826 100%)",
                      boxShadow: "0 28px 60px rgba(227,129,38,0.18), 0 8px 40px rgba(227,129,38,0.12), inset 0 6px 18px rgba(255,255,255,0.08)",
                      color: "#111827",
                    }}
                  >
                    Get Your AI Clone At $37
                  </motion.button>
                </div>

                <p className="mt-4 text-center font-semibold text-gray-700">Offer Expiring Soon</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ================= end replacement ================= */}

      {/* FAQ Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            className="text-4xl md:text-5xl font-bold mb-4 text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <span className="text-gray-900">Frequently Asked </span>
            <span className="text-[#C89356]">Questions</span>
          </motion.h2>
          <motion.p
            className="text-center text-gray-700 mb-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            Find answers to common queries about our services, pricing, and support to help you make informed
            decisions with confidence.
          </motion.p>
          <FAQAccordion faqs={faqs} />
        </div>
      </section>

      <Footer />
    </main>
  )
}