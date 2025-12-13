"use client";

import { Mail, Phone, MapPin, Building2 } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-black border-t border-[#C89356] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-evenly items-center md:items-start gap-8 mb-8">
          {/* Contact Info */}
          <div className="space-y-4 flex flex-col items-center text-center">
            <h3 className="text-lg font-semibold text-[#C89356] mb-4">
              Contact Us
            </h3>
            <a
              href="mailto:business@signatureglobalmedia.com"
              className="flex flex-col items-center gap-2 text-gray-300 hover:text-[#C89356] transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-[#1a1a1a] border border-[#C89356]/30 flex items-center justify-center group-hover:border-[#C89356] transition-colors">
                <Mail size={18} className="text-[#C89356]" />
              </div>
              <span className="text-sm">business@signatureglobalmedia.com</span>
            </a>
            <a
              href="tel:+971554585768"
              className="flex flex-col items-center gap-2 text-gray-300 hover:text-[#C89356] transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-[#1a1a1a] border border-[#C89356]/30 flex items-center justify-center group-hover:border-[#C89356] transition-colors">
                <Phone size={18} className="text-[#C89356]" />
              </div>
              <span className="text-sm">+971 55 458 5768</span>
            </a>
          </div>

          {/* Location */}
          <div className="space-y-4 flex flex-col items-center text-center">
            <h3 className="text-lg font-semibold text-[#C89356] mb-4">
              Location
            </h3>
            <a
              href="https://www.google.com/maps/place/Concord+Tower+-+Al+Sufouh+-+Al+Sufouh+2+-+Dubai+-+United+Arab+Emirates/@25.0978143,55.15362,17z/data=!4m15!1m8!3m7!1s0x3e5f6b4164e9f477:0x873c65b1c9eb0f7e!2sConcord+Tower+-+Al+Sufouh+-+Al+Sufouh+2+-+Dubai+-+United+Arab+Emirates!3b1!8m2!3d25.0978143!4d55.1561949!16s%2Fm%2F0421sm7!3m5!1s0x3e5f6b4164e9f477:0x873c65b1c9eb0f7e!8m2!3d25.0978143!4d55.1561949!16s%2Fm%2F0421sm7?entry=ttu&g_ep=EgoyMDI1MTEwNC4xIKXMDSoASAFQAw%3D%3D"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 text-gray-300 hover:text-[#C89356] transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-[#1a1a1a] border border-[#C89356]/30 flex items-center justify-center group-hover:border-[#C89356] transition-colors">
                <MapPin size={18} className="text-[#C89356]" />
              </div>
              <div className="text-sm leading-relaxed">
                <p>Concord Tower</p>
                <p>Al Sufouh - Dubai Media City</p>
                <p>Dubai, UAE</p>
              </div>
            </a>
          </div>

          {/* Company Info */}
          <div className="space-y-4 flex flex-col items-center text-center">
            <h3 className="text-lg font-semibold text-[#C89356] mb-4">
              Company
            </h3>
            <div className="flex flex-col items-center gap-2 text-gray-300">
              <div className="w-10 h-10 rounded-full bg-[#1a1a1a] border border-[#C89356]/30 flex items-center justify-center">
                <Building2 size={18} className="text-[#C89356]" />
              </div>
              <div className="text-sm">
                <p className="text-gray-400">Parent Company</p>
                <p className="text-white font-medium">NEXT MOBI FZ LLC</p>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-[#C89356]/50 to-transparent mb-6" />

        {/* Copyright */}
        <div className="text-center">
          <p className="text-gray-400 text-sm">
            ©️ 2023-25{" "}
            <span className="text-[#C89356]">Signature Global Media</span>
          </p>
          <p className="text-gray-500 text-xs mt-1">All Rights Reserved</p>
        </div>
      </div>
    </footer>
  );
}
