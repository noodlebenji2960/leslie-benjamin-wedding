import { useEffect, useRef, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "@/styles/components/Toast.scss";

interface ToastProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  autoClose?: number; // milliseconds
}

export function Toast({
  isOpen,
  onClose,
  children,
  autoClose = 3000,
}: ToastProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear previous timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (isOpen && autoClose) {
      timerRef.current = setTimeout(() => {
        onClose();
        timerRef.current = null;
      }, autoClose);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isOpen, autoClose, onClose]);

  const toastVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 50, scale: 0.95 },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="toast-wrapper"
          variants={toastVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.4, ease: "easeInOut" }}
        >
          <div className="toast-content">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
