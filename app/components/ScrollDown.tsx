import { motion } from "framer-motion";
import { useState, useEffect } from "react";

const ScrollChevron = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const check = () => {
      const scrollable = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      setVisible(scrollable - window.innerHeight > window.innerHeight * 2.1);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(document.body);
    const main = document.querySelector("main");
    if (main) ro.observe(main);
    window.addEventListener("resize", check);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", check);
    };
  }, []);

  return (
    <motion.div
      className="scroll-container"
      animate={{ opacity: visible ? 1 : 0, height: visible ? "auto" : 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      style={{ overflow: "hidden" }}
    >
      <motion.div
        className="chevron"
        style={{ width: "24px", height: "24px" }}
        animate={{
          y: [0, -10, 0],
          transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="2"
        >
          <path d="m19 10-7 7-7-7" />
          <path d="m19 16-7 7-7-7" />
        </svg>
      </motion.div>
    </motion.div>
  );
};

export default ScrollChevron;
