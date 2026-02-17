import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

interface SuccessScreenProps {
  onReset: () => void;
  submittedRef: React.RefObject<HTMLDivElement | null>;
  guestEmail: string;
}

const SuccessScreen = ({ submittedRef, guestEmail }: SuccessScreenProps) => {
  const { t } = useTranslation(["home", "common", "rsvp"]);
  const [isOn, setIsOn] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsOn(true), 50);

    const interval = setInterval(() => {
      setIsOn(false);
      setTimeout(() => setIsOn(true), 55);
    }, 10000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  return (
    <motion.div
      className="rsvp-page container"
      ref={submittedRef}
      initial={{ opacity: 0, scale: 0.9, y: 30 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: 0,
        transition: {
          type: "spring",
          stiffness: 300,
          damping: 25,
          duration: 0.6,
        },
      }}
    >
      {/* ---------- Heart Animation ---------- */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 20, delay: 1 }}
        className="heart-animated"
        style={{
          fontSize: "4rem",
          marginBottom: "1.5rem",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <svg viewBox="0 0 24 24">
          <defs>
            <path
              id="heart"
              d="M12 4.435c-1.989-5.399-12-4.597-12 3.568 0 4.068 3.06 9.481 12 14.997 8.94-5.516 12-10.929 12-14.997 0-8.118-10-8.999-12-3.568z"
            />
          </defs>

          <motion.use
            key={isOn ? "on" : "off"}
            xlinkHref="#heart"
            initial={{ opacity: 0, scale: 0.33 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 15,
            }}
            style={{ transformOrigin: "center" }}
          />
        </svg>
      </motion.div>

      {/* ---------- Text ---------- */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        style={{ textAlign: "center", marginBottom: "1rem" }}
      >
        {t("rsvp:thankYou")}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        style={{
          textAlign: "center",
          maxWidth: "500px",
          margin: "0 auto 2rem",
          lineHeight: 1.6,
        }}
      >
        {t("rsvp:confirmation", { guestEmail })}
      </motion.p>
    </motion.div>
  );
};

export default SuccessScreen;