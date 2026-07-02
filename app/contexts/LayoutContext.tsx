// contexts/LayoutContext.tsx
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

interface LayoutState {
  fixedOffsetY: number;
  fixedSlot: ReactNode;
}

interface LayoutActions {
  setFixedOffset: (offset: number) => void;
  shiftFixedUp: (amount?: number) => void;
  shiftFixedDown: (amount?: number) => void;
  resetFixedOffset: () => void;
  setFixedSlot: (node: ReactNode) => void;
}

interface LayoutContextType {
  state: LayoutState;
  actions: LayoutActions;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [fixedOffsetY, setFixedOffsetY] = useState(0);
  const [fixedSlot, setFixedSlot] = useState<ReactNode>(null);

  const setFixedOffset = useCallback((offset: number) => {
    setFixedOffsetY(offset);
  }, []);

  const shiftFixedUp = useCallback((amount = 200) => {
    setFixedOffsetY((prev) => prev - amount);
  }, []);

  const shiftFixedDown = useCallback((amount = 200) => {
    setFixedOffsetY((prev) => prev + amount);
  }, []);

  const resetFixedOffset = useCallback(() => {
    setFixedOffsetY(0);
  }, []);

  return (
    <LayoutContext.Provider
      value={{
        state: { fixedOffsetY, fixedSlot },
        actions: {
          setFixedOffset,
          shiftFixedUp,
          shiftFixedDown,
          resetFixedOffset,
          setFixedSlot,
        },
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
}

/** Mount a node into the fixed-container group while the calling component is alive. */
export function useFixedSlot(node: ReactNode) {
  const { actions } = useLayout();
  useEffect(() => {
    actions.setFixedSlot(node);
    return () => actions.setFixedSlot(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node]);
}

export function useLayout() {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error("useLayout must be used within LayoutProvider");
  }
  return context;
}
