import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { useLenis } from "lenis/react";

export function BackToTopButton({ onClick }: { onClick: () => void }) {
  const [visible, setVisible] = useState(false);
  const lenis = useLenis();

  useEffect(() => {
    if (!lenis) return;

    const onScroll = ({ scroll }: { scroll: number }) => {
      setVisible(scroll > 150);
    };

    lenis.on("scroll", onScroll);

    return () => {
      lenis.off("scroll", onScroll);
    };
  }, [lenis]);

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
