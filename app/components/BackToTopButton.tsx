import { use, useEffect, useState } from "react";
import "@/styles/components/BackToTopButton.scss";
import { useLenis } from "lenis/react";
import { Icon } from "./Icon";

interface BackToTopButtonProps {
  onClick: () => void;
}

export function BackToTopButton({ onClick }: BackToTopButtonProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 150);
    };

    onScroll();

    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      className={`back-to-top ${visible ? "visible" : ""}`}
      onClick={onClick}
      aria-label="Back to top"
    >
      <Icon.Up />
    </button>
  );
}
