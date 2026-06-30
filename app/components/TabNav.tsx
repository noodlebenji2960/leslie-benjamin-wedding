// app/components/TabNav.tsx
import { useRef, useState, useEffect, useLayoutEffect } from "react";
import type { ReactNode } from "react";
import { Link, type LinkProps } from "react-router";
import { Button } from "./Button";

interface TabNavItemBase {
  id: string;
  content: ReactNode;
  active?: boolean;
}

type TabNavItemAsButton = TabNavItemBase & {
  to?: undefined;
  onClick?: () => void;
};

type TabNavItemAsLink = TabNavItemBase & {
  to: LinkProps["to"];
  onClick?: undefined;
};

export type TabNavItem = TabNavItemAsButton | TabNavItemAsLink;

interface TabNavProps {
  items: TabNavItem[];
  className?: string;
  itemClassName?: string;
  indicatorClassName?: string;
}

/** Row of tabs (links or buttons) with a sliding underline indicator that
 * follows hover, falling back to the active item when not hovering. Shared
 * between the header nav and the Q&A category tabs. */
export function TabNav({
  items,
  className = "",
  itemClassName = "tab-nav__item",
  indicatorClassName = "tab-nav__indicator",
}: TabNavProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const updateIndicator = (el: HTMLElement) => {
    if (!containerRef.current || !el) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    setIndicatorStyle({
      left: elRect.left - containerRect.left,
      width: elRect.width,
    });
  };

  const handleMouseEnter = (el: HTMLElement) => {
    setIsHovering(true);
    updateIndicator(el);
  };
  const handleMouseLeave = () => setIsHovering(false);

  const syncToActive = () => {
    if (!containerRef.current) return;
    const itemEls = Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(
        `.${itemClassName}`,
      ),
    );
    const activeIndex = items.findIndex((item) => item.active);
    if (activeIndex === -1 || !itemEls[activeIndex]) return;
    updateIndicator(itemEls[activeIndex]);
  };

  useEffect(() => {
    if (isHovering) return;
    syncToActive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, isHovering]);

  useLayoutEffect(() => {
    const handleResize = () => {
      if (isHovering) return;
      syncToActive();
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  return (
    <div className={`tab-nav ${className}`} ref={containerRef}>
      {items.map((item) =>
        item.to !== undefined ? (
          <Link
            key={item.id}
            to={item.to}
            className={`${itemClassName}${item.active ? " active" : ""}`}
            onMouseEnter={(e) => handleMouseEnter(e.currentTarget)}
            onMouseLeave={handleMouseLeave}
          >
            {item.content}
          </Link>
        ) : (
          <Button
            key={item.id}
            type="button"
            className={`${itemClassName}${item.active ? " active" : ""}`}
            variant="ghost"
            onClick={item.onClick}
            onMouseEnter={(e) => handleMouseEnter(e.currentTarget)}
            onMouseLeave={handleMouseLeave}
          >
            {item.content}
          </Button>
        ),
      )}

      <div
        className={indicatorClassName}
        style={{
          transform: `translate(${indicatorStyle.left+((indicatorStyle.width*0.25)/2)}px)`,
          width: indicatorStyle.width*0.75,
        }}
      />
    </div>
  );
}
