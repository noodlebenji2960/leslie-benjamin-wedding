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
  const isHoveredRef = useRef(false);
  const scrollDirRef = useRef<-1 | 0 | 1>(0);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartPosRef = useRef(0);
  const wasDraggingRef = useRef(false);

  const trackRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const posRef = useRef(0);

  // Momentum / inertia state
  const velocityRef = useRef(0); // px/frame momentum after release
  const lastClientXRef = useRef(0); // last pointer X during drag
  const lastDragDeltaRef = useRef(0); // delta of the last move event (for velocity sampling)

  const speed = 0.6;
  const buttonSpeed = 3;
  const friction = 0.92; // multiplied each frame — lower = stops faster
  const minVelocity = 0.05; // below this we kill momentum

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
      singleSetWidth = track.scrollWidth / 2;
    };

    const wrap = (pos: number) => {
      if (singleSetWidth <= 0) return pos;
      let p = pos % singleSetWidth;
      if (p < 0) p += singleSetWidth;
      return p;
    };

    const animate = () => {
      if (singleSetWidth > 0) {
        if (isDraggingRef.current) {
          // While dragging: position is set directly in handleDragMove
          // but we still sample velocity from lastDragDeltaRef
          velocityRef.current = lastDragDeltaRef.current;
          lastDragDeltaRef.current = 0; // reset each frame so stale deltas decay
        } else if (scrollDirRef.current !== 0) {
          // Button held
          velocityRef.current = 0;
          posRef.current += scrollDirRef.current * buttonSpeed;
        } else if (Math.abs(velocityRef.current) > minVelocity) {
          // Momentum (coasting after throw)
          posRef.current += velocityRef.current;
          velocityRef.current *= friction;
        } else if (!isPausedRef.current && !isHoveredRef.current) {
          // Auto-scroll
          velocityRef.current = 0;
          posRef.current += speed;
        }

        posRef.current = wrap(posRef.current);
        track.style.transform = `translateX(-${posRef.current}px)`;
      }
      animFrameRef.current = requestAnimationFrame(animate);
    };

    const ro = new ResizeObserver(measure);
    ro.observe(track);

    const timer = setTimeout(() => {
      measure();
      animFrameRef.current = requestAnimationFrame(animate);
    }, 50);

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
    velocityRef.current = 0;
  };

  const handleButtonUp = () => {
    scrollDirRef.current = 0;
    isPausedRef.current = false;
  };

  const handleDragStart = (clientX: number) => {
    setDragging(true);
    wasDraggingRef.current = false;
    dragStartXRef.current = clientX;
    lastClientXRef.current = clientX;
    dragStartPosRef.current = posRef.current;
    lastDragDeltaRef.current = 0;
    velocityRef.current = 0;
    isPausedRef.current = true;
  };

  const handleDragMove = (clientX: number) => {
    if (!isDraggingRef.current) return;

    const totalDelta = dragStartXRef.current - clientX;
    if (Math.abs(totalDelta) > 5) wasDraggingRef.current = true;

    // Sample per-move delta for velocity
    lastDragDeltaRef.current = clientX - lastClientXRef.current; // negative = dragging left (positive scroll dir)
    lastClientXRef.current = clientX;

    posRef.current = dragStartPosRef.current + totalDelta;
  };

  const handleDragEnd = () => {
    if (!isDraggingRef.current) return;
    setDragging(false);
    isPausedRef.current = false;

    // Convert last drag delta to forward momentum
    // drag left (negative delta) → positive scroll velocity
    velocityRef.current = -lastDragDeltaRef.current;
    lastDragDeltaRef.current = 0;
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
            touchAction: "pan-y",
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
              width: "max-content",
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
                onHoverStart={() => {
                  isHoveredRef.current = true;
                }}
                onHoverEnd={() => {
                  isHoveredRef.current = false;
                }}
                onClick={() => {
                  if (!wasDraggingRef.current) {
                    isPausedRef.current = true;
                    setSelectedPhoto(item.src);
                  }
                }}
              >
                <div className="polaroid__photo">
                  <img
                    src={item.src}
                    alt={`Photo ${(i % photos.length) + 1}`}
                    draggable={false}
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

      <Modal
        isOpen={!!selectedPhoto}
        onClose={() => {
          isPausedRef.current = false;
          setSelectedPhoto(null);
        }}
      >
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
