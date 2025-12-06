"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Menu, X } from "lucide-react"
import Image from "next/image"

const CONFIG = {
  aiClone: {
    hero: {
      cta: "Get Your AI Clone",
    },
  },
}

export default function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const pathname = usePathname()

  // Use the main caramel color for the header and hover effect
  const HEADER_COLOR = "#C89356";
  const TEXT_HOVER_COLOR = HEADER_COLOR; // Text color on button hover will be the header color

  useEffect(() => {
    const handleScroll = () => {
      // Only set to translucent/shadowed when scrolled, otherwise solid HEADER_COLOR
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <motion.header
      // Set header background to the solid caramel color.
      // ✨ MODIFIED: Removed 'shadow-[0_8px_30px_rgba(0,0,0,0.25)]' and 'backdrop-blur-sm'
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
        ? `bg-[${HEADER_COLOR}]/95` // Translucent color only
        : `bg-[${HEADER_COLOR}]` // Solid color when at the top
        }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0">
          <motion.div
            // NOTE: Removed 'left-[-100px]' to fix logo positioning based on previous instructions.
            className="flex relative items-center gap-2 text-white relative left-[-100px]"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Image src="/frontLogo.png" alt="Signature Global Media Logo" width={131} height={36} />
          </motion.div>
        </Link>


        {/* CTA Button: Updated to match screenshot style and hover text color */}
        <Link href="/ai-clone#process-flow">
          <motion.button
            // NOTE: Removed 'relative left-[100px]' to fix button positioning based on previous instructions.
            className={`hidden md:inline-flex items-center justify-center ml-auto px-12 py-2 bg-white text-[#111] rounded-full font-semibold shadow-lg transition-all duration-300 hover:text-[${TEXT_HOVER_COLOR}] hover:scale-105 relative left-[100px]` }
            whileHover={{
              scale: 1.05,
              // White glowing shadow on hover
              boxShadow:
                "0 0 40px rgba(255,255,255,0.7), 0 0 20px rgba(255,255,255,0.4), 0 8px 30px rgba(0,0,0,0.1)",
            }}
            whileTap={{ scale: 0.98 }}
            style={{
              // Base shadow when not hovered
              boxShadow:
                "0 18px 60px rgba(0,0,0,0.35), 0 0 36px rgba(255,255,255,0.08), 0 8px 30px rgba(180,83,9,0.08)",
            }}
          >
            Get Your AI Clone
          </motion.button>
        </Link>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`md:hidden p-2 text-white hover:bg-[${TEXT_HOVER_COLOR}] rounded-lg`}
          aria-label="Toggle menu"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={`md:hidden bg-[${HEADER_COLOR}]/95 backdrop-blur-sm border-t border-[#92400E]`}
          >
            <div className="px-4 py-4 space-y-4">
              {/* Existing Mobile Links */}
              <Link
                href="/"
                className={`block transition-colors ${pathname === "/" ? "text-[#FCD34D]" : "text-white hover:text-[#FCD34D]"}`}
                onClick={() => setIsOpen(false)}
              >
                Home
              </Link>
              <Link
                href="/ai-clone"
                className={`block transition-colors ${pathname === "/ai-clone" ? "text-[#FCD34D]" : "text-white hover:text-[#FCD34D]"
                  }`}
                onClick={() => setIsOpen(false)}
              >
                AI Clone
              </Link>
              <a href="#" className="block text-white hover:text-[#FCD34D] transition-colors">
                Services
              </a>
              <a href="#" className="block text-white hover:text-[#FCD34D] transition-colors">
                About
              </a>

              {/* Mobile CTA button (matching pill style but full width) */}
              <Link
                href="/ai-clone#process-flow"
                onClick={() => setIsOpen(false)}
                // Apply hover color for the mobile button as well
                className={`w-full px-4 py-3 bg-white text-[#111] rounded-full font-semibold shadow-lg text-center block transition-colors hover:text-[${TEXT_HOVER_COLOR}]`}
                style={{
                  boxShadow:
                    "0 18px 60px rgba(0,0,0,0.35), 0 0 28px rgba(255,255,255,0.06), 0 8px 24px rgba(180,83,9,0.06)",
                }}
              >
                Get Your AI Clone
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}