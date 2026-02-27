import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const Heart = ({size="md"}) => {
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
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 20, delay: 1 }}
      className={`heart-animated--${size}`}
      aria-hidden="true"
      style={{
        fontSize: "4rem",
        marginBottom: "1.5rem",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
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
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          style={{ transformOrigin: "center" }}
        />
      </svg>
    </motion.div>
  );
};

export default Heart;
