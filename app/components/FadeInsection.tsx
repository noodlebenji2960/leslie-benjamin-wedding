// @/components/FadeInSection.tsx
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { useLenis } from "lenis/react";

interface FadeInSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function FadeInSection({
  children,
  className,
  delay = 0,
}: FadeInSectionProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { margin: "-200px" });

  useLenis();

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0 }}
      transition={{ duration: 0.6, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}
