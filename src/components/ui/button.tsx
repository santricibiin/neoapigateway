"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import type { ButtonSize, ButtonVariant } from "@/types";

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-base-ink text-white hover:bg-stone-700",
  sky: "bg-accent-sage text-white hover:bg-accent-sageDeep",
  sun: "bg-accent-sandSoft text-base-ink hover:bg-accent-sand",
  mint: "bg-accent-sageSoft text-accent-sageDeep hover:bg-accent-sage/30",
  lavender: "bg-accent-terraSoft text-accent-terraDeep hover:bg-accent-terra/25",
  outline: "bg-base-surface text-base-ink border-stone-300 hover:border-stone-400",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-5 py-2.5 text-base",
  lg: "px-7 py-3.5 text-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className, children, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileHover={{ y: -1 }}
        whileTap={{ y: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-neo border font-semibold shadow-neo-sm transition-colors",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);

Button.displayName = "Button";
