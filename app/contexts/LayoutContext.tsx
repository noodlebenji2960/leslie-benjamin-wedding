// contexts/LayoutContext.tsx
import {
  createContext,
  useContext,
  useState,
  
  useCallback,
  type ReactNode,
} from "react";

interface LayoutState {
  fixedOffsetY: number;
}

interface LayoutActions {
  setFixedOffset: (offset: number) => void;
  shiftFixedUp: (amount?: number) => void;
  shiftFixedDown: (amount?: number) => void;
  resetFixedOffset: () => void;
}

interface LayoutContextType {
  state: LayoutState;
  actions: LayoutActions;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [fixedOffsetY, setFixedOffsetY] = useState(0);

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
        state: { fixedOffsetY },
        actions: {
          setFixedOffset,
          shiftFixedUp,
          shiftFixedDown,
          resetFixedOffset,
        },
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error("useLayout must be used within LayoutProvider");
  }
  return context;
}
