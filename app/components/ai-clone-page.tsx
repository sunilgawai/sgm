/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Play,
  X,
  Check,
  X as XIcon,
  AlertTriangle,
  Gift,
  Info,
  Pause,
} from "lucide-react";
import Footer from "./footer";
import ProcessFlowSection from "./process-flow-section";

function PurchaseModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({ name: "", email: "" });
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("[v0] Purchase form submitted:", formData);
    setIsSuccess(true);
    setTimeout(() => {
      console.log("[v0] Purchase completed successfully");
      onClose();
      setFormData({ name: "", email: "" });
      setIsSuccess(false);
    }, 2000);
  };

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
                <p className="text-gray-400">
                  Check your email for next steps.
                </p>
              </div>
            ) : (
              <>
                <div className="px-8 py-6 border-b border-[#B45309] flex justify-between items-center bg-[#B45309]">
                  <h2 className="text-xl font-bold text-white">
                    Get Your AI Clone
                  </h2>
                  <button
                    onClick={onClose}
                    className="p-1 hover:bg-[#92400E] rounded-lg text-white"
                  >
                    <X size={24} />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Your name"
                      className="w-full px-4 py-2 rounded-lg bg-[#2a2a2a] border border-[#B45309] text-white placeholder-gray-500 focus:outline-none focus:border-[#F59E0B]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
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
                  <p className="text-xs text-gray-500 text-center">
                    30-day money-back guarantee
                  </p>
                </form>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function FAQAccordion({ faqs }: { faqs: Array<{ q: string; a: string }> }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const prefersReducedMotion =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

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
            <span className="font-semibold text-base md:text-lg text-gray-900">
              {faq.q}
            </span>
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
                <div className="px-6 py-4 bg-gray-50 text-gray-900 border-t border-gray-200 text-sm md:text-base">
                  {faq.a}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  );
}

// Helper function to route to process flow section
const routeToProcessFlow = () => {
  if (typeof window !== "undefined") {
    const currentPath = window.location.pathname;
    if (currentPath === "/ai-clone") {
      setTimeout(() => {
        const section = document.getElementById("process-flow");
        if (section) {
          section.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    } else {
      window.location.href = "/ai-clone#process-flow";
    }
  }
};

export default function AiClonePage() {
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [isCheckoutLoading499, setIsCheckoutLoading499] = useState(false);
  const [isCheckoutLoading999, setIsCheckoutLoading999] = useState(false);
  const [isVideoHovered, setIsVideoHovered] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const toggleVideoPlayback = () => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsVideoPlaying(!isVideoPlaying);
    }
  };

  const handleCheckout = async () => {
    setIsCheckoutLoading(true);
    try {
      setTimeout(() => {
        const section = document.getElementById("process-flow");
        if (section) {
          section.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);

      const response = await fetch("/api/v1/checkout/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: "ai-clone",
          amount: 37,
          currency: "usd",
          buyer: {
            email: "customer@example.com",
            phone: "+1234567890",
          },
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error(
          "Checkout error:",
          data.error || "Failed to create checkout session"
        );
        alert(data.error || "Failed to start checkout. Please try again.");
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      alert(err.message || "Failed to start checkout. Please try again.");
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  const handleCheckout499 = async () => {
    setIsCheckoutLoading499(true);
    try {
      const response = await fetch("/api/v1/checkout/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: "multiple-ai-content-avatar",
          amount: 499,
          currency: "usd",
          buyer: {
            email: "customer@example.com",
            phone: "+1234567890",
          },
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error(
          "Checkout error:",
          data.error || "Failed to create checkout session"
        );
        alert(data.error || "Failed to start checkout. Please try again.");
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      alert(err.message || "Failed to start checkout. Please try again.");
    } finally {
      setIsCheckoutLoading499(false);
    }
  };

  const handleCheckout999 = async () => {
    setIsCheckoutLoading999(true);
    try {
      const response = await fetch("/api/v1/checkout/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: "plug-play-system",
          amount: 999,
          currency: "usd",
          buyer: {
            email: "customer@example.com",
            phone: "+1234567890",
          },
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error(
          "Checkout error:",
          data.error || "Failed to create checkout session"
        );
        alert(data.error || "Failed to start checkout. Please try again.");
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      alert(err.message || "Failed to start checkout. Please try again.");
    } finally {
      setIsCheckoutLoading999(false);
    }
  };

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
  ];

  return (
    <main className="bg-black min-h-screen">
      <PurchaseModal
        isOpen={isPurchaseOpen}
        onClose={() => setIsPurchaseOpen(false)}
      />

      {/* Hero Section */}
      {/* ================= FIXED HERO SECTION ================= */}
      <section className="relative bg-[#C89356] overflow-visible z-0 pt-20 sm:pt-24 md:pt-28 pb-16 sm:pb-20 md:pb-25 rounded-b-[60px] sm:rounded-b-[80px] md:rounded-b-[120px]">
        {/* HEADINGS */}
        <div className="text-center max-w-4xl mx-auto px-4 sm:px-6">
          <p className="text-white/95 unbounded text-base sm:text-lg md:text-xl lg:text-2xl mb-3 font-medium">
            No camera. No editing. No tech skills.
          </p>

          <h1 className="text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal drop-shadow-xl leading-tight mb-2">
            Create Your AI Clone
          </h1>

          <p className="text-[#0b0b0b] unbounded text-base sm:text-lg md:text-xl font-semibold leading-none mb-8 sm:mb-10">
            In Just 30 mins
          </p>
        </div>

        {/* VIDEO SECTION */}
        <div className="max-w-7xl mx-auto relative z-10 px-4 sm:px-6 md:px-8 lg:px-16 xl:px-32">
          <div className="relative rounded-[30px] sm:rounded-[40px] md:rounded-[50px] overflow-hidden shadow-[0_15px_40px_rgba(0,0,0,0.6)]">
            <div
              className="relative w-full"
              style={{ paddingTop: "56.25%" }}
              onMouseEnter={() => setIsVideoHovered(true)}
              onMouseLeave={() => setIsVideoHovered(false)}
            >
              <video
                ref={videoRef}
                src="https://res.cloudinary.com/dnhbh2owd/video/upload/v1765114222/test_bfhqve.mp4"
                autoPlay
                muted
                loop
                playsInline
                className="absolute top-0 left-0 w-full h-full object-cover rounded-[30px] sm:rounded-[40px] md:rounded-[50px]"
              />

              {/* Play/Pause Button Overlay - Only visible on hover */}
              <button
                onClick={toggleVideoPlayback}
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-all duration-300 z-20 ${
                  isVideoHovered ? "opacity-100" : "opacity-0"
                }`}
                aria-label={isVideoPlaying ? "Pause video" : "Play video"}
              >
                {isVideoPlaying ? (
                  <Pause className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white" />
                ) : (
                  <Play className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white ml-1" />
                )}
              </button>

              {/* Bottom Vignette */}
              <div
                className="absolute inset-x-0 bottom-0 rounded-b-[30px] sm:rounded-[40px] md:rounded-b-[50px] pointer-events-none"
                style={{
                  height: "150px",
                  background:
                    "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.65) 60%, rgba(0,0,0,0.9) 100%)",
                }}
              />
            </div>
          </div>
        </div>

        {/* Real Estate Section */}
        <div className="mt-10 sm:mt-12 md:mt-16 text-center max-w-4xl mx-auto px-4 sm:px-6">
          <motion.h2
            className="text-white text-xl sm:text-2xl md:text-3xl lg:text-4xl leading-tight mb-6 drop-shadow-lg font-normal"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            Real Estate Agents Are
            <br /> Using AI To Get
            <br />
            <span className="text-base sm:text-lg md:text-xl font-medium text-black">
              3x More Luxury Listings
            </span>
          </motion.h2>

          <motion.button
            onClick={routeToProcessFlow}
            className="bg-white text-black rounded-full px-6 sm:px-8 py-3 font-semibold text-sm sm:text-base md:text-lg hover:scale-[1.03] transition"
            style={{
              boxShadow:
                "0 0 15px rgba(255,255,255,0.3), 0 0 30px rgba(255,255,255,0.2), 0 20px 60px rgba(0,0,0,0.3)",
            }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            whileHover={{
              scale: 1.05,
              boxShadow:
                "0 0 20px rgba(255,255,255,0.4), 0 0 40px rgba(255,255,255,0.3), 0 20px 60px rgba(0,0,0,0.3)",
            }}
            whileTap={{ scale: 0.98 }}
          >
            Get Your AI Clone At $37
          </motion.button>
        </div>

        {/* LARGE ROUNDED BOTTOM CURVE */}
        <div className="absolute left-0 right-0 bottom-0 -z-10 h-[200px] sm:h-[250px] md:h-[300px] overflow-hidden">
          <svg
            viewBox="0 0 1920 300"
            preserveAspectRatio="none"
            className="w-full h-full"
          >
            <path d="M0 0 H1920 V120 Q960 350 0 120 Z" fill="#C89356" />
          </svg>
        </div>
      </section>
      {/* ================= END HERO SECTION ================= */}

      {/* AI Clones Section */}
      <section className="w-full py-12 md:py-16 lg:py-20 bg-black flex flex-col items-center px-6 sm:px-6">
        {/* Title */}
        <div className="flex flex-wrap justify-center items-center gap-2 md:gap-4 md:mb-10">
          <h2 className="text-3xl sm:text-4xl md:text-5xl text-white">
            Our AI
          </h2>
          <h1 className="text-[#D7A059] font-medium text-3xl sm:text-4xl md:text-5xl">
            Clones
          </h1>
        </div>

        {/* Outer container */}
        <div className="w-full max-w-6xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="bg-[#111] rounded-lg overflow-hidden shadow-lg w-full max-w-[360px] aspect-[9/16] mx-auto relative"
              >
                {/* Responsive iframe wrapper */}
                <iframe
                  src="https://player.cloudinary.com/embed/?cloud_name=dnhbh2owd&public_id=video_ia98im&profile=cld-default&autoplay=true&loop=true&muted=true&controls=false"
                  className="absolute inset-0 w-full h-full"
                  allow="autoplay; fullscreen; encrypted-media"
                  allowFullScreen
                  frameBorder="0"
                  scrolling="no"
                  title="AI Clone Video"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compare Options Section */}
      <section className="py-12 md:py-16 lg:py-20 px-6 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-8 md:mb-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <div className="flex flex-col items-center mb-4 gap-2 md:gap-4">
              <h2 className="text-3xl sm:text-4xl md:text-5xl text-gray-900">
                Compare Your
              </h2>
              <h2 className="text-3xl sm:text-4xl md:text-5xl text-[#C89356] -mt-2">
                Options
              </h2>
            </div>
            <p className="text-base sm:text-lg md:text-xl font-medium text-gray-700">
              See why 500+ agents choose the smart way.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 mx-auto max-w-5xl items-stretch">
            {[
              {
                title: "OLD WAY",
                price: "$500",
                tag: "Expensive",
                icon: XIcon,
                colorText: "text-gray-900",
                list: [
                  "Wait for scheduling",
                  "Travel to location",
                  "Expensive equipment",
                  "Revision fees",
                ],
                footer: (
                  <>
                    50 videos ={" "}
                    <span className="text-[#C89356] font-semibold">
                      $25,000
                    </span>
                  </>
                ),
                highlight: false,
              },
              {
                title: "DIY WAY",
                price: "$3K+",
                tag: "Time Sink",
                icon: AlertTriangle,
                colorText: "text-gray-900",
                list: [
                  "100+ hours learning",
                  "Software subscriptions",
                  "Online courses",
                  "Months to learn",
                  "Still looks amateur",
                ],
                footer: <>Time = Money Lost</>,
                highlight: false,
              },
              {
                title: "SMART WAY",
                price: "$37",
                tag: "Best Value",
                icon: Check,
                colorText: "text-white",
                list: [
                  "No Subscription Fees",
                  "Get your AI Avatar Clone (With Voice, Facial Expression & Body Language Cloning)",
                  "No skills needed",
                  "Get one free video of your AI Avatar with your script/prompt & post it on any Social Media Channel",
                ],
                footer: (
                  <>
                    You save: <span className="font-semibold">$24,963!</span>
                  </>
                ),
                highlight: true,
              },
            ].map((card, idx) => (
              <motion.div
                key={idx}
                className={`
                      relative h-full
                      ${
                        card.highlight
                          ? "rounded-2xl bg-[#00B569] text-white shadow-[0_26px_70px_rgba(0,0,0,0.30)] ring-1 ring-black/5"
                          : "rounded-2xl bg-white text-gray-900 shadow-[0_22px_60px_rgba(0,0,0,0.18)] ring-1 ring-black/5"
                      }
                    `}
                style={{
                  border: "6px solid white",
                  boxShadow:
                    "0 22px 60px rgba(0,0,0,0.18), inset 0 0 0 2px rgba(0,0,0,0.2)",
                }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.07 }}
                viewport={{ once: true }}
              >
                {/* badge - top right */}
                <div
                  className={`absolute -top-3 right-4 z-20 px-3 md:px-4 py-1 rounded-full text-xs font-semibold shadow-md
        ${
          card.highlight ? "bg-[#F4B547] text-black" : "bg-[#C89356] text-white"
        }`}
                >
                  {card.tag}
                </div>

                {/* inner card */}
                <div className="relative flex flex-col h-full px-6 md:px-8 pt-8 md:pt-10 pb-6 md:pb-8 max-w-[360px] mx-auto">
                  {/* golden gradient */}
                  {!card.highlight && (
                    <div
                      aria-hidden
                      className="pointer-events-none absolute top-0 right-0 w-32 h-32 opacity-60"
                      style={{
                        background:
                          "radial-gradient(circle at top right, rgba(245,216,176,0.8), transparent 70%)",
                      }}
                    />
                  )}

                  {/* HEADER */}
                  <div className="relative text-left mb-0">
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center shrink-0
               ${card.highlight ? "bg-white/20" : "bg-gray-100"}`}
                      >
                        <card.icon
                          size={24}
                          className={
                            card.highlight ? "text-white" : "text-gray-700"
                          }
                        />
                      </div>
                      <div className="flex flex-col">
                        <p
                          className={`text-sm md:text-base font-medium tracking-wide
                            ${
                              card.highlight ? "text-white/90" : "text-gray-700"
                            }`}
                        >
                          {card.title}
                        </p>
                        <p
                          className={`text-base md:text-lg font-bold
                 ${card.highlight ? "text-white/80" : "text-gray-600"}`}
                        >
                          {idx === 0
                            ? "Hire Videographer"
                            : idx === 1
                            ? "Learn Video Editing"
                            : "AgentClone AI"}
                        </p>
                      </div>
                    </div>

                    {/* PRICE PILL */}
                    <div
                      className={`w-full rounded-xl py-3 md:py-4 flex items-center justify-center shadow-inner mt-0
                        ${card.highlight ? "bg-[#009654]" : "bg-[#F4F4F6]"}`}
                    >
                      <span
                        className={`text-xl md:text-2xl font-semibold
                          ${card.highlight ? "text-white" : "text-gray-900"}`}
                      >
                        {card.price}
                      </span>
                    </div>
                  </div>

                  {/* FEATURES */}
                  <ul
                    className={`relative mt-4 space-y-2 text-xs leading-relaxed flex-1
           ${card.highlight ? "text-white" : "text-gray-700"}`}
                  >
                    {card.list.map((txt, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2.5 text-sm md:text-base font-medium"
                      >
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-1
                            ${card.highlight ? "bg-white/20" : "bg-[#F2F3F5]"}`}
                        >
                          {card.highlight ? (
                            <Check className="w-3 h-3 text-white" />
                          ) : (
                            <XIcon className="w-3 h-3 text-gray-500" />
                          )}
                        </div>
                        <span>{txt}</span>
                      </li>
                    ))}
                  </ul>

                  {/* FOOTER */}
                  <div
                    className={`pt-3 mt-4 border-t text-center text-xs md:text-sm
           ${
             card.highlight
               ? "border-white/25 text-white/90"
               : "border-gray-200 text-gray-600"
           }`}
                  >
                    {card.footer}

                    {card.highlight && (
                      <button
                        onClick={handleCheckout}
                        disabled={isCheckoutLoading}
                        className="mt-3 w-full py-2.5 rounded-full text-black font-semibold text-xs md:text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          background:
                            "linear-gradient(90deg,#F6C066 0%, #F0A43A 50%, #E38826 100%)",
                          boxShadow:
                            "0 0 15px rgba(255,255,255,0.3), 0 0 30px rgba(255,255,255,0.2), 0 16px 40px rgba(0,0,0,0.24), inset 0 6px 18px rgba(255,255,255,0.08)",
                        }}
                      >
                        <span>
                          {isCheckoutLoading
                            ? "Processing..."
                            : "Get Your AI Clone At $37"}
                        </span>
                        {!isCheckoutLoading && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                          >
                            <path
                              d="M5 12h14M13 5l6 7-6 7"
                              stroke="#111827"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* The Process Section */}
      <ProcessFlowSection />

      {/* Pricing Section */}
      <section className="py-12 md:py-16 lg:py-20 px-6 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-3xl mx-auto">
          <motion.div
            className="text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            {/* Headline - Three lines */}
            <h1
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal mb-3 text-black leading-tight"
              style={{ fontFamily: "var(--font-unbounded)", fontWeight: 400 }}
            >
              <div
                style={{ fontFamily: "var(--font-unbounded)", fontWeight: 400 }}
              >
                Ready to Transform
              </div>
              <div
                style={{ fontFamily: "var(--font-unbounded)", fontWeight: 400 }}
              >
                <span
                  className="text-black"
                  style={{
                    fontFamily: "var(--font-unbounded)",
                    fontWeight: 400,
                  }}
                >
                  Your{" "}
                </span>
                <span
                  className="text-[#C89356]"
                  style={{
                    fontFamily: "var(--font-unbounded)",
                    fontWeight: 400,
                  }}
                >
                  Real Estate
                </span>
              </div>
              <div
                style={{ fontFamily: "var(--font-unbounded)", fontWeight: 400 }}
              >
                <span
                  className="text-[#C89356]"
                  style={{
                    fontFamily: "var(--font-unbounded)",
                    fontWeight: 400,
                  }}
                >
                  Business
                </span>
                <span
                  className="text-black"
                  style={{
                    fontFamily: "var(--font-unbounded)",
                    fontWeight: 400,
                  }}
                >
                  ?
                </span>
              </div>
            </h1>

            {/* Sub-headline */}
            <p className="text-base sm:text-lg md:text-xl font-medium text-gray-800 mb-6">
              Join 500+ agents who are already using AI to dominate their market
            </p>

            {/* Green Bonus Banner */}
            <motion.div
              className="relative bg-emerald-600 text-white rounded-xl px-6 py-6 md:py-8 mb-6 mx-auto max-w-2xl border-2 border-white/40 shadow-md"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <div className="flex flex-col items-center justify-center">
                <h3 className="text-sm sm:text-base md:text-lg font-normal uppercase tracking-wide mb-2">
                  🎁 YOUR BONUS IS LOCKED IN!
                </h3>
                <div className="text-xs md:text-sm opacity-95 font-normal">
                  SSL Encrypted Payment * 30 Day Refund
                </div>
              </div>
            </motion.div>

            {/* White pricing card */}
            <motion.div
              className="relative bg-white rounded-xl p-6 border shadow-md mb-6 mx-auto max-w-2xl"
              style={{ borderColor: "#EBCB9A", borderWidth: 2 }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <div className="text-center" style={{ width: "100%" }}>
                <div
                  className="text-gray-900 text-xs sm:text-sm mb-3 font-normal"
                  style={{ fontFamily: "var(--font-unbounded)", width: "100%" }}
                >
                  Total Value: <span className="line-through">$2,085</span>
                </div>

                <div
                  className="text-3xl sm:text-4xl md:text-5xl font-normal text-gray-900 mb-3 leading-none"
                  style={{ fontFamily: "var(--font-unbounded)", width: "100%" }}
                >
                  $37
                </div>

                <div
                  className="text-emerald-600 font-normal text-xs sm:text-sm mb-3"
                  style={{ fontFamily: "var(--font-unbounded)", width: "100%" }}
                >
                  98% OFF – BLACK FRIDAY ONLY
                </div>

                <div
                  className="text-gray-700 text-xs font-normal"
                  style={{ fontFamily: "var(--font-unbounded)", width: "100%" }}
                >
                  Price Will Jump to $97 tonight
                </div>
              </div>
            </motion.div>

            {/* Gold pill CTA */}
            <motion.button
              onClick={routeToProcessFlow}
              className="mx-auto block mt-2 mb-12 rounded-full font-semibold text-sm sm:text-base md:text-lg"
              style={{
                background:
                  "linear-gradient(90deg,#F6C066 0%, #F0A43A 50%, #E38826 100%)",
                color: "#111827",
                padding: "0.75rem 2rem",
                boxShadow:
                  "0 0 15px rgba(255,255,255,0.3), 0 0 30px rgba(255,255,255,0.2), 0 18px 36px rgba(227,129,38,0.18), inset 0 6px 18px rgba(255,255,255,0.08)",
              }}
              whileHover={{
                scale: 1.03,
                boxShadow:
                  "0 0 20px rgba(255,255,255,0.4), 0 0 40px rgba(255,255,255,0.3), 0 18px 36px rgba(227,129,38,0.18), inset 0 6px 18px rgba(255,255,255,0.08)",
              }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center justify-center gap-2 md:gap-3">
                <span>Get Your AI Clone At $37</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
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

      {/* Additional Services Section */}
      <section className="py-12 md:py-16 lg:py-20 px-6 sm:px-6 lg:px-8 bg-black text-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-8 md:mb-10"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <div className="flex flex-wrap justify-center items-center gap-2 md:gap-4">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-white tracking-wide">
                Select On
              </h2>
              <h2 className="text-[#C89356] text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-wide">
                Top Service
              </h2>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto">
            {/* LEFT CARD — Multiple AI Content Avatar */}
            <motion.div
              className="relative rounded-2xl border-2 border-[#EBCB9A] bg-[#C89356] shadow-[0_4px_12px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.04)] overflow-visible"
              style={{
                boxShadow:
                  "0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04), 0 0 20px rgba(235,203,154,0.3)",
              }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              viewport={{ once: true }}
            >
              {/* MOST POPULAR BADGE */}
              <div className="absolute -top-3 left-1/2 z-30 -translate-x-1/2 bg-white text-gray-900 px-3 md:px-4 py-1.5 rounded-full text-xs font-semibold shadow-lg border-2 border-[#EBCB9A]">
                Most Popular
              </div>

              {/* GRID PATTERN */}
              <div
                aria-hidden
                className="absolute top-0 right-0 w-32 h-32 opacity-20 pointer-events-none"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)
                  `,
                  backgroundSize: "20px 20px",
                }}
              />

              <div className="relative h-full w-full rounded-2xl overflow-hidden p-6 pt-8">
                <div className="text-left mb-4">
                  <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2 leading-tight">
                    Multiple AI Content Avatar
                  </h3>
                  <p className="text-xs md:text-sm text-gray-700 mb-4 leading-relaxed">
                    Ideal deal for: A consistent pipeline of avatar-led
                    short-form content
                  </p>

                  {/* PRICING BOX */}
                  <div className="bg-white/20 rounded-xl py-3 md:py-4 mb-4 w-full shadow-inner">
                    <div className="text-xl md:text-2xl font-bold text-gray-900 text-center">
                      499 USD
                    </div>
                  </div>
                </div>

                <hr className="border-gray-300 mb-4" />

                {/* INCLUDED LIST */}
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900 mb-3 text-xs md:text-sm">
                    What&apos;s Included
                  </h4>
                  <ul className="space-y-2.5 text-xs md:text-sm text-gray-800">
                    {[
                      "Reels Scripting & Creative Direction",
                      "Capture of up to 5 AI Avatar Clones (With Voice, Facial Expression & Body Language Cloning)",
                      "15 Reels included (professionally edited)",
                      "Social media management included",
                    ].map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2.5 font-semibold"
                      >
                        <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-white flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check size={12} className="text-black" />
                        </div>
                        <span className="leading-snug">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* BUTTON */}
                <motion.button
                  onClick={handleCheckout499}
                  disabled={isCheckoutLoading499 || isCheckoutLoading999}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative w-full mt-4 rounded-full py-2.5 font-semibold text-gray-900 text-xs md:text-sm bg-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    boxShadow:
                      "0 2px 8px rgba(0,0,0,0.15), 0 0 15px rgba(255,255,255,0.3)",
                  }}
                >
                  {isCheckoutLoading499 ? "Processing..." : "Purchase Now"}
                </motion.button>
              </div>
            </motion.div>

            {/* RIGHT CARD — Plug & Play System */}
            <motion.div
              className="relative rounded-2xl border-2 border-[#EBCB9A] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.04)] overflow-hidden"
              style={{
                boxShadow:
                  "0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04), 0 0 20px rgba(235,203,154,0.3)",
              }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <div className="relative h-full w-full rounded-2xl overflow-hidden p-6">
                <div className="text-left mb-4">
                  <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2 leading-tight">
                    Plug & Play System
                  </h3>
                  <p className="text-xs md:text-sm text-gray-700 mb-4 leading-relaxed">
                    Ideal for: Fully managed Avatars + Social Media content
                    management across all channels end-to-end.
                  </p>

                  {/* PRICING BOX */}
                  <div className="bg-gray-100 rounded-xl py-3 md:py-4 mb-4 w-full shadow-inner">
                    <div className="text-xl md:text-2xl font-bold text-gray-900 text-center">
                      999 USD
                    </div>
                  </div>
                </div>

                <hr className="border-gray-200 mb-4" />

                {/* INCLUDED LIST */}
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900 mb-3 text-xs md:text-sm">
                    What&apos;s Included
                  </h4>
                  <ul className="space-y-2.5 text-xs md:text-sm text-gray-700">
                    {[
                      "Reels Scriptwriting & Monthly content calendar",
                      "Capture of up to 24 custom AI Avatars/Clones (With Voice, Facial Expression & Body Language Cloning)",
                      "30 Reels included (professionally edited)",
                      "Social Media Management included",
                    ].map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2.5 font-semibold"
                      >
                        <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-[#C89356] flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check
                            size={12}
                            className="text-white font-semibold"
                          />
                        </div>
                        <span className="leading-snug">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* BUTTON */}
                <motion.button
                  onClick={handleCheckout999}
                  disabled={isCheckoutLoading499 || isCheckoutLoading999}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative w-full mt-4 rounded-full py-2.5 font-semibold text-white text-xs md:text-sm bg-gradient-to-r from-[#C89356] to-[#F59E0B] shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    boxShadow:
                      "0 2px 8px rgba(200,147,86,0.4), 0 0 15px rgba(245,158,11,0.3)",
                  }}
                >
                  {isCheckoutLoading999 ? "Processing..." : "Purchase Now"}
                </motion.button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Get Results Section */}
      <section className="py-12 md:py-16 lg:py-20 px-6 sm:px-6 lg:px-8 bg-[#C89356]">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="relative"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            {/* big rounded white card */}
            <div className="relative mx-4 sm:mx-6 md:mx-8 lg:mx-12 rounded-[24px] md:rounded-[36px] bg-white overflow-hidden border-2 border-white/90 shadow-[0_35px_90px_rgba(0,0,0,0.32)]">
              {/* decorative soft golden rays */}
              <div
                aria-hidden
                className="absolute inset-x-0 top-0 pointer-events-none"
                style={{ height: 220 }}
              >
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

              <div className="relative px-6 sm:px-8 md:px-10 lg:px-16 py-16 md:py-20">
                {/* Headline */}
                <h2 className="text-center font-unbounded">
                  <span className="text-2xl  unbounded sm:text-4xl md:text-5xl font-extrabold text-black">
                    Get{" "}
                  </span>
                  <span
                    className="text-2xl unbounded sm:text-4xl md:text-5xl font-extrabold"
                    style={{ color: "#C89356" }}
                  >
                    Results
                  </span>
                  <span className="text-2xl unbounded sm:text-4xl md:text-5xl font-extrabold text-black">
                    {" "}
                    Now.
                  </span>
                  {/* small orange heart accent */}
                  <span className="inline-block align-middle ml-2 md:ml-3">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden
                      className="w-4 h-4 md:w-5 md:h-5"
                    >
                      <path
                        d="M12 21s-6.716-4.686-9.333-7.104C-0.222 10.84 3.333 6 7.5 8.5 9.354 9.73 12 12 12 12s2.646-2.27 4.5-3.5C20.667 6 24.222 10.84 21.333 13.896 18.716 16.314 12 21 12 21z"
                        fill="#F97316"
                      />
                    </svg>
                  </span>
                </h2>

                <p className="mt-6 text-center text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
                  See your profiles grow, and let&apos;s boost your brand&apos;s
                  earnings together.
                </p>

                {/* CTA centered */}
                <div className="mt-8 md:mt-10 flex justify-center">
                  <motion.button
                    onClick={routeToProcessFlow}
                    whileHover={{
                      scale: 1.03,
                      boxShadow:
                        "0 0 20px rgba(255,255,255,0.4), 0 0 40px rgba(255,255,255,0.3), 0 28px 60px rgba(227,129,38,0.18), 0 8px 40px rgba(227,129,38,0.12), inset 0 6px 18px rgba(255,255,255,0.08)",
                    }}
                    whileTap={{ scale: 0.98 }}
                    className="rounded-full px-6 sm:px-8 md:px-10 py-3 md:py-4 font-bold text-base sm:text-lg md:text-xl"
                    style={{
                      background:
                        "linear-gradient(90deg,#F6C066 0%, #F0A43A 50%, #E38826 100%)",
                      boxShadow:
                        "0 0 15px rgba(255,255,255,0.3), 0 0 30px rgba(255,255,255,0.2), 0 28px 60px rgba(227,129,38,0.18), 0 8px 40px rgba(227,129,38,0.12), inset 0 6px 18px rgba(255,255,255,0.08)",
                      color: "#111827",
                    }}
                  >
                    Get Your AI Clone At $37
                  </motion.button>
                </div>

                <p className="mt-4 text-center font-semibold text-sm md:text-base text-gray-700">
                  Offer Expiring Soon
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 md:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <span className="text-gray-900 unbounded">Frequently Asked </span>
            <span className="text-[#C89356] unbounded">Questions</span>
          </motion.h2>
          <motion.p
            className="text-center text-sm sm:text-base md:text-lg text-gray-700 mb-8 md:mb-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            Find answers to common queries about our services, pricing, and
            support to help you make informed decisions with confidence.
          </motion.p>
          <FAQAccordion faqs={faqs} />
        </div>
      </section>

      <Footer />
    </main>
  );
}
