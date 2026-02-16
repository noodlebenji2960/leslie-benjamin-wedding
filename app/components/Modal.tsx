import { useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLenis } from "lenis/react";
import { Icon } from "./Icon";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  closeOnBackdropClick?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  children,
  closeOnBackdropClick = true,
}: ModalProps) {
  const lenis = useLenis(() => {});

  // Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Stop scrolling when modal is open
  useEffect(() => {
    if (lenis) {
      isOpen ? lenis.stop() : lenis.start();
    }
  }, [isOpen, lenis]);

  const modalVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="modal-backdrop"
            onClick={() => closeOnBackdropClick && onClose()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />

          <motion.div
            className="modal-wrapper"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            <div className="modal-content">
              <button className="modal-close" onClick={onClose}>
                <Icon.Close />
              </button>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
