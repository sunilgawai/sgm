"use client"

import { useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Play } from "lucide-react"
import Footer from "./footer"

const CONFIG = {
  aiClone: {
    hero: {
      cta: "Get Your AI Clone At $37",
    },
  },
  home: {
    services: [
      {
        title: "AI Video Cloning",
        description: "Create professional video clones of yourself in minutes",
        icon: "video",
      },
      {
        title: "Content Repurposing",
        description: "Transform one video into 100+ formats for all platforms",
        icon: "layers",
      },
      { title: "Social Media Ads", description: "Generate compelling ads that convert and scale", icon: "trending" },
      { title: "Video Production", description: "Full production suite for professional content", icon: "film" },
    ],
    caseStudies: [
      {
        title: "E-commerce Growth",
        subtitle: "Client increased conversions by 300%",
        image: "https://via.placeholder.com/400x250?text=Case+Study+1",
      },
      {
        title: "SaaS Onboarding",
        subtitle: "Reduced support tickets by 40%",
        image: "https://via.placeholder.com/400x250?text=Case+Study+2",
      },
      {
        title: "B2B Lead Gen",
        subtitle: "Generated 5000+ qualified leads",
        image: "https://via.placeholder.com/400x250?text=Case+Study+3",
      },
    ],
    testimonials: [
      { name: "Sarah Chen", title: "Marketing Director", text: "The AI clone saved us thousands in production costs." },
      { name: "James Rivera", title: "Founder", text: "This is the future of digital marketing. Game-changing." },
      {
        name: "Emma Thompson",
        title: "Content Creator",
        text: "Scaled my content output 10x without any extra effort.",
      },
    ],
  },
}

export default function HomePage() {
  const prefersReducedMotion =
    typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false

  const HEADER_COLOR = "#C89356"; 
  // Custom color matching the dark brown text shadow/color visible in the screenshot
  const HERO_TEXT_COLOR = "text-[#794D23]"; 

  return (
    <main className="bg-black">
      
      {/* 🚀 Hero Section - Final Screenshot Match */}
      <section 
        className={`min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-start bg-[${HEADER_COLOR}] rounded-b-[80px] sm:rounded-b-[120px] shadow-2xl`}
      >
        <div className="max-w-4xl mx-auto text-center mt-20">
          
          {/* Main Copy (No camera, No editing, No tech skills.) */}
          <motion.p
            // ✨ FINAL SIZE: text-lg (matches first line size)
            // ✨ FINAL COLOR: Dark brown #794D23
            className={`text-3xl md:text-4xl font-semibold text-white  mb-2`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: prefersReducedMotion ? 0 : 0.2 }}
          >
            No camera. No editing. No tech skills.
          </motion.p>

          {/* Headline (Create Your AI Clone In Just 30 mins) */}
          <motion.h1
           
            className={`text-4xl md:text-5xl text-white mb-8 leading-tight`}
            // style={{ textShadow: '0 2px 4px rgba(0,0,0,0.4)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: prefersReducedMotion ? 0 : 0.4 }}
          >
            Create Your AI Clone 
            <br />
            <span  className={`text-4xl md:text-5xl font-extrabold text-black mb-8 leading-2`}>
            In Just 30 mins
            </span>
          </motion.h1>

          {/* Video Placeholder Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: prefersReducedMotion ? 0 : 0.6 }}
            className="relative w-full max-w-xl aspect-video mx-auto overflow-hidden rounded-[2.5rem]  mt-10"
          >
            <div className="absolute inset-0 bg-gray-700/80 flex items-center justify-center">
              <img
                src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&h=600&fit=crop"
                alt="AI clone video meeting"
                className="w-full h-full object-cover opacity-70"
                loading="lazy"
              />
               <div className="absolute inset-0 bg-black/30"></div> 

              {/* Play Button */}
              <motion.button
                className="absolute p-4 bg-white rounded-full shadow-xl hover:bg-gray-100 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Play video"
              >
                {/* Play button icon color matches the dark hero text color */}
                <Play size={30} className={`text-[#794D23] fill-[#794D23] ml-1`} />
              </motion.button>
            </div>
          </motion.div>

          {/* Bottom Callout Text (Real Estate Agents...) */}
          <motion.p
            // ✨ FINAL SIZE: text-lg/xl (condensed and bold)
            // ✨ FINAL COLOR: Dark brown #794D23
            className={`text-3xl md:text-3xl font-bold text-white mt-10 mb-20`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: prefersReducedMotion ? 0 : 0.8 }}
          >
            Real Estate Agents Are Using AI To Get
            <br />
            <span   className={`text-2xl pt-9 relative bottom-0.5 md:text-2xl font-bold text-black mt-12 mb-6`}>

            3x More Luxury Listings
            </span>
          </motion.p>

          {/* Final CTA Button */}
          <Link href="/ai-clone#process-flow">
            <motion.button
              className={`px-6 py-3 bg-white text-[#111] rounded-full font-bold shadow-lg transition-all duration-300 hover:text-[${HEADER_COLOR}] hover:scale-105`}
              whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(255,255,255,0.7), 0 0 20px rgba(255,255,255,0.4), 0 8px 30px rgba(0,0,0,0.1)" }}
              whileTap={{ scale: 0.98 }}
              style={{
                boxShadow:
                  "0 18px 60px rgba(0,0,0,0.35), 0 0 36px rgba(255,255,255,0.08), 0 8px 30px rgba(180,83,9,0.08)",
              }}
            >
              {CONFIG.aiClone.hero.cta}
            </motion.button>
          </Link>
        </div>
      </section>

      {/* --- Rest of the existing content follows below --- */}
      
      {/* Services Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-black">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: "-100px" }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Services</h2>
            <p className="text-xl text-gray-700">Everything you need to create professional video content</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {CONFIG.home.services.map((service, idx) => (
              <motion.div
                key={idx}
                className="p-6 rounded-xl bg-[#F5E6D3] border-2 border-[#B45309]/30 hover:border-[#B45309] transition-colors"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                viewport={{ once: true, margin: "-100px" }}
                whileHover={{ y: -5 }}
              >
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{service.title}</h3>
                <p className="text-gray-700">{service.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* --- */}

      {/* Case Studies */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#F5E6D3]">
        <div className="max-w-7xl mx-auto">
          <motion.h2
            className="text-4xl font-bold text-gray-900 mb-16 text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            Recent Case Studies
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {CONFIG.home.caseStudies.map((study, idx) => (
              <motion.div
                key={idx}
                className="group rounded-xl overflow-hidden border-2 border-[#B45309]/30 hover:border-[#B45309] transition-colors cursor-pointer bg-white"
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                viewport={{ once: true, margin: "-100px" }}
                whileHover={{ y: -8 }}
              >
                <div className="relative h-48 overflow-hidden bg-gray-200">
                  <img
                    src={study.image || "/placeholder.svg"}
                    alt={study.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                    <button className="w-full py-2 bg-[#B45309] text-white rounded-lg font-semibold hover:bg-[#92400E] transition-colors">
                      See Case Study
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{study.title}</h3>
                  <p className="text-gray-700">{study.subtitle}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* --- */}

      {/* CTA to AI Clone */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#B45309]">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h2
            className="text-4xl font-bold text-white mb-6"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            Ready to Create Your AI Clone?
          </motion.h2>
          <p className="text-xl text-white/90 mb-8">
            Join thousands of creators who are using AI to scale their content production.
          </p>
          <Link href="/ai-clone#process-flow">
            <motion.button
              className="px-8 py-4 bg-white text-[#B45309] rounded-lg font-semibold hover:bg-gray-100 transition-colors text-lg shadow-[0_30px_60px_rgba(225,225,225,2225.4)] "
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Get Your AI Clone At $37
            </motion.button>
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  )
}