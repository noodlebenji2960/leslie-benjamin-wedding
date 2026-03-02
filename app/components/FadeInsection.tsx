// @/components/FadeInSection.tsx
import { motion, useInView } from "framer-motion";
import { useRef, useEffect } from "react";
import { useLenis } from "lenis/react";

interface FadeInSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  onInView?: () => void;
  onOutView?: () => void; 
}

export function FadeInSection({
  children,
  className,
  delay = 0,
  onInView,
  onOutView,
}: FadeInSectionProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { margin: "-200px" });

  // Handle both in/out view callbacks
  useEffect(() => {
    if (isInView && onInView) {
      onInView();
    } else if (!isInView && onOutView) {
      onOutView();
    }
  }, [isInView, onInView, onOutView]);

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
