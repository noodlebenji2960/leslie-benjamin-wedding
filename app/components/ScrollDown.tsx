import { motion } from "framer-motion";

const ScrollChevron = () => {
  return (
    <div className="scroll-container">
      <motion.div
        className="chevron"
        style={{ width: "24px", height: "24px" }} // Force it
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
    </div>
  );
};

export default ScrollChevron;
