import { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Modal } from "./Modal";

interface PolaroidCarouselProps {
  photos: string[];
}

// Deterministic pseudo-random from a string seed
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash) % 1000) / 1000;
}

function PolaroidCarouselInner({ photos }: PolaroidCarouselProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const isPausedRef = useRef(false);
  const scrollDirRef = useRef<-1 | 0 | 1>(0);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartPosRef = useRef(0);
  const wasDraggingRef = useRef(false);

  const trackRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const posRef = useRef(0);

  const speed = 0.6;
  const buttonSpeed = 3;

  const setDragging = (val: boolean) => {
    isDraggingRef.current = val;
    setIsDragging(val);
  };

  const photoMeta = useMemo(
    () =>
      photos.map((src) => ({
        src,
        rotation: (seededRandom(src) - 0.5) * 14,
        captionOffset: seededRandom(src + "caption") * 10 - 5,
      })),
    [photos],
  );

  // Double the slides for the infinite seamless loop
  const slides = [...photoMeta, ...photoMeta];

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let singleSetWidth = 0;

    const measure = () => {
      // Since we doubled the slides, the loop point is exactly half the scrollWidth
      singleSetWidth = track.scrollWidth / 2;
    };

    const animate = () => {
      if (singleSetWidth > 0) {
        if (!isDraggingRef.current) {
          const delta =
            scrollDirRef.current !== 0
              ? scrollDirRef.current * buttonSpeed
              : isPausedRef.current
                ? 0
                : speed;

          posRef.current += delta;
        }

        // SEAMLESS WRAP LOGIC
        // If we go past the end of the first set, jump back by one set width
        if (posRef.current >= singleSetWidth) {
          posRef.current -= singleSetWidth;
          // If dragging, we update the start point to keep delta relative
          if (isDraggingRef.current) dragStartPosRef.current -= singleSetWidth;
        }
        // If we go before the start, jump forward by one set width
        if (posRef.current < 0) {
          posRef.current += singleSetWidth;
          if (isDraggingRef.current) dragStartPosRef.current += singleSetWidth;
        }

        track.style.transform = `translateX(-${posRef.current}px)`;
      }
      animFrameRef.current = requestAnimationFrame(animate);
    };

    const ro = new ResizeObserver(measure);
    ro.observe(track);

    // Initial measure and start
    const timer = setTimeout(() => {
      measure();
      animFrameRef.current = requestAnimationFrame(animate);
    }, 50); // Slight delay to ensure DOM is painted

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(animFrameRef.current);
      ro.disconnect();
    };
  }, []);

  // --- Handlers ---
  const handleButtonDown = (dir: -1 | 1) => {
    scrollDirRef.current = dir;
    isPausedRef.current = true;
  };

  const handleButtonUp = () => {
    scrollDirRef.current = 0;
    isPausedRef.current = false;
  };

  const handleDragStart = (clientX: number) => {
    setDragging(true);
    wasDraggingRef.current = false;
    dragStartXRef.current = clientX;
    dragStartPosRef.current = posRef.current;
    isPausedRef.current = true;
  };

  const handleDragMove = (clientX: number) => {
    if (!isDraggingRef.current) return;
    const delta = dragStartXRef.current - clientX;

    // Threshold to distinguish between a click and a drag
    if (Math.abs(delta) > 5) wasDraggingRef.current = true;

    posRef.current = dragStartPosRef.current + delta;
  };

  const handleDragEnd = () => {
    setDragging(false);
    isPausedRef.current = false;
  };

  return (
    <>
      <div className="polaroid-carousel-wrapper">
        <button
          className="polaroid-carousel__btn polaroid-carousel__btn--left"
          onMouseDown={() => handleButtonDown(-1)}
          onMouseUp={handleButtonUp}
          onMouseLeave={handleButtonUp}
          onTouchStart={() => handleButtonDown(-1)}
          onTouchEnd={handleButtonUp}
          aria-label="Scroll left"
        >
          ‹
        </button>

        <div
          className="polaroid-carousel"
          style={{
            cursor: isDragging ? "grabbing" : "grab",
            userSelect: "none",
            touchAction: "pan-y", // Allows vertical scrolling but captures horizontal
            overflow: "hidden",
          }}
          onMouseDown={(e) => handleDragStart(e.clientX)}
          onMouseMove={(e) => handleDragMove(e.clientX)}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
          onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
          onTouchEnd={handleDragEnd}
        >
          <div
            className="polaroid-carousel__track"
            ref={trackRef}
            style={{
              display: "flex",
              width: "max-content", // Essential for scrollWidth to be accurate
              willChange: "transform",
            }}
          >
            {slides.map((item, i) => (
              <motion.div
                key={`${item.src}-${i}`}
                className="polaroid"
                style={
                  {
                    "--rotation": `${item.rotation}deg`,
                    flexShrink: 0,
                  } as React.CSSProperties
                }
                initial={{ rotate: item.rotation }}
                whileHover={{
                  rotate: 0,
                  scale: 1.08,
                  zIndex: 10,
                  transition: { type: "spring", stiffness: 300, damping: 20 },
                }}
                whileTap={{ scale: 0.97 }}
                onHoverStart={() => (isPausedRef.current = true)}
                onHoverEnd={() => (isPausedRef.current = false)}
                onClick={() => {
                  if (!wasDraggingRef.current) setSelectedPhoto(item.src);
                }}
              >
                <div className="polaroid__photo">
                  <img
                    src={item.src}
                    alt={`Photo ${(i % photos.length) + 1}`}
                    draggable={false} // Prevents ghost-image drag
                    style={{ pointerEvents: "none" }}
                  />
                </div>
                
                <div
                  className="polaroid__caption"
                  style={{ marginLeft: item.captionOffset }}
                >
                  {(i % photos.length) + 1}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <button
          className="polaroid-carousel__btn polaroid-carousel__btn--right"
          onMouseDown={() => handleButtonDown(1)}
          onMouseUp={handleButtonUp}
          onMouseLeave={handleButtonUp}
          onTouchStart={() => handleButtonDown(1)}
          onTouchEnd={handleButtonUp}
          aria-label="Scroll right"
        >
          ›
        </button>
      </div>

      {/* Modal with AnimatePresence for smooth exit */}
      <Modal isOpen={!!selectedPhoto} onClose={() => setSelectedPhoto(null)}>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, rotate: -4 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.9, rotate: 4 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
          >
            <motion.img
              src={selectedPhoto}
              alt="Selected photo"
              layoutId={selectedPhoto}
            />
          </motion.div>
        )}
      </Modal>
    </>
  );
}

export default function Carousel(props: PolaroidCarouselProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <PolaroidCarouselInner {...props} />;
}
