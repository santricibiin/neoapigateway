"use client";

import { motion } from "framer-motion";

export function FloatingShapes() {
  return (
    <>
      {/* Top-right soft blob */}
      <motion.svg
        animate={{ y: [0, -12, 0], scale: [1, 1.03, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -top-6 -right-6 h-28 w-28 text-accent-sky/20 sm:-top-10 sm:-right-10 sm:h-44 sm:w-44"
        viewBox="0 0 200 200"
        fill="currentColor"
        aria-hidden
      >
        <path d="M45.7,-76.3C58.9,-69.3,69.1,-55.6,76.3,-41.2C83.5,-26.8,87.6,-11.7,85.8,2.5C84,16.7,76.3,30,67.1,41.3C57.9,52.6,47.2,61.9,35.3,68.3C23.4,74.7,10.3,78.2,-2.4,82.3C-15.1,86.4,-27.4,91.1,-39.3,86.6C-51.2,82.1,-62.7,68.4,-70.6,54.1C-78.5,39.8,-82.8,24.9,-81.3,10.5C-79.8,-3.9,-72.5,-17.8,-63.6,-29.7C-54.7,-41.6,-44.2,-51.5,-32.5,-59.3C-20.8,-67.1,-7.9,-72.8,3.8,-79.1C15.5,-85.4,31,-92.3,45.7,-76.3Z" transform="translate(100 100)" />
      </motion.svg>

      {/* Mid-left rotating square */}
      <motion.svg
        animate={{ rotate: [0, 90, 180, 270, 360], y: [0, 8, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="pointer-events-none absolute top-24 -left-8 h-20 w-20 text-accent-sun/20 sm:top-32 sm:-left-12 sm:h-32 sm:w-32"
        viewBox="0 0 200 200"
        fill="currentColor"
        aria-hidden
      >
        <rect x="35" y="35" width="130" height="130" rx="16" transform="rotate(12 100 100)" />
      </motion.svg>

      {/* Right-side triangle */}
      <motion.svg
        animate={{ y: [0, 14, 0], rotate: [0, -8, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute top-[42%] -right-4 h-20 w-20 text-accent-mint/20 sm:right-2 sm:h-32 sm:w-32"
        viewBox="0 0 200 200"
        fill="currentColor"
        aria-hidden
      >
        <polygon points="100,15 185,185 15,185" />
      </motion.svg>

      {/* Bottom-left spinning star */}
      <motion.svg
        animate={{ rotate: -360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="pointer-events-none absolute bottom-12 -left-4 h-16 w-16 text-accent-lavender/20 sm:bottom-16 sm:-left-8 sm:h-24 sm:w-24"
        viewBox="0 0 100 100"
        fill="currentColor"
        aria-hidden
      >
        <polygon points="50,5 61,35 95,35 68,55 79,85 50,68 21,85 32,55 5,35 39,35" />
      </motion.svg>

      {/* Bottom-right small circle */}
      <motion.svg
        animate={{ x: [0, 8, 0], y: [0, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute bottom-6 right-6 h-12 w-12 text-accent-sky/15 sm:bottom-8 sm:right-12 sm:h-16 sm:w-16"
        viewBox="0 0 100 100"
        fill="currentColor"
        aria-hidden
      >
        <circle cx="50" cy="50" r="40" />
      </motion.svg>
    </>
  );
}
