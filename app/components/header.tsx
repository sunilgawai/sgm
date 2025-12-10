"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import Image from "next/image"

const CONFIG = {
  aiClone: {
    hero: {
      cta: "Get Your AI Clone",
    },
  },
}

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false)

  // Use the main caramel color for the header and hover effect
  const HEADER_COLOR = "#C89356";
  const TEXT_HOVER_COLOR = HEADER_COLOR; // Text color on button hover will be the header color

  useEffect(() => {
    const handleScroll = () => {
      // Set to solid color when scrolled
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <motion.header
      // Set header background to the solid caramel color, always solid
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 overflow-visible"
      style={{
        backgroundColor: HEADER_COLOR,
      }}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between overflow-visible">
        {/* Logo */}
        <Link href="https://signatureglobalmedia.com" className="flex-shrink-0">
          <motion.div
            className="flex relative items-center gap-2 text-white"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Image src="/frontLogo.png" alt="Signature Global Media Logo" width={131} height={36} />
          </motion.div>
        </Link>


        {/* CTA Button: Updated to match screenshot style and hover text color */}
        <Link href="/ai-clone#process-flow" className="ml-auto">
          <motion.button
            className={`inline-flex items-center justify-center px-6 md:px-12 py-2 bg-white text-[#111] rounded-full font-semibold shadow-lg transition-all duration-300 hover:text-[${TEXT_HOVER_COLOR}] hover:scale-105 text-sm md:text-base` }
            whileHover={{
              scale: 1.05,
              // Enhanced white glowing shadow on hover
              boxShadow:
                "0 0 50px rgba(255,255,255,1), 0 0 100px rgba(255,255,255,0.6), 0 0 30px rgba(255,255,255,0.4), 0 8px 30px rgba(0,0,0,0.1)",
            }}
            whileTap={{ scale: 0.98 }}
            style={{
              // Enhanced base white glowing shadow when not hovered
              boxShadow:
                "0 0 30px rgba(255,255,255,0.8), 0 0 60px rgba(255,255,255,0.4), 0 18px 60px rgba(0,0,0,0.35), 0 8px 30px rgba(180,83,9,0.08)",
            }}
          >
            Get Your AI Clone
          </motion.button>
        </Link>
      </nav>

    </motion.header>
  )
}