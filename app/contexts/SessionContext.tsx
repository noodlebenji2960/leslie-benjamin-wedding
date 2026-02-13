import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const VISITOR_KEY = "wedding_visitor_id";
const LAST_VISIT_KEY = "wedding_last_visit";
const VISIT_COUNT_KEY = "wedding_visit_count";
const COOKIE_PREF_KEY = "wedding_cookie_pref";
const TIME_INTERVAL = 30000;

// -------------------------
// Dynamic cookie type interface
// -------------------------
export interface CookiePreference {
  [key: string]: boolean; // all cookies dynamic
  necessary: true; // always required
}

interface VisitorInfo {
  visitorId: string;
  isFirstVisit: boolean;
  isReturningVisitor: boolean;
  daysSinceLastVisit: number;
  visitCount: number;
  deviceType: "mobile" | "tablet" | "desktop";
  timeOnSite: number;
  lastVisitTime: number | null;
}

interface SessionContextType {
  visitor: VisitorInfo | null;
  cookiePreference: CookiePreference | null;
  setCookiePreference: (pref: CookiePreference) => void;
}

export const SessionContext = createContext<SessionContextType | null>(null);

export const SessionProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const sessionStartTime = useRef<number>(Date.now());
  const timeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [visitor, setVisitor] = useState<VisitorInfo | null>(null);
  const [cookiePreference, setCookiePreferenceState] =
    useState<CookiePreference | null>(null);

  const setCookiePreference = (prefs: CookiePreference) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(COOKIE_PREF_KEY, JSON.stringify(prefs));
    }
    setCookiePreferenceState(prefs);
    console.debug("[Session] Cookie preference updated:", prefs);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Load stored cookie preference
    const storedPrefStr = localStorage.getItem(COOKIE_PREF_KEY);
    if (storedPrefStr) {
      setCookiePreferenceState(JSON.parse(storedPrefStr));
    }

    // Detect device type
    const ua = navigator.userAgent;
    const deviceType: "mobile" | "tablet" | "desktop" =
      /(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)
        ? "tablet"
        : /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(
              ua,
            )
          ? "mobile"
          : "desktop";

    // Detect visitor
    const visitorId = localStorage.getItem(VISITOR_KEY);
    const lastVisitStr = localStorage.getItem(LAST_VISIT_KEY);
    const visitCount = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || "0");

    if (!visitorId) {
      const newId = `visitor_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      localStorage.setItem(VISITOR_KEY, newId);
      localStorage.setItem(LAST_VISIT_KEY, Date.now().toString());
      localStorage.setItem(VISIT_COUNT_KEY, "1");
      setVisitor({
        visitorId: newId,
        isFirstVisit: true,
        isReturningVisitor: false,
        daysSinceLastVisit: 0,
        visitCount: 1,
        deviceType,
        timeOnSite: 0,
        lastVisitTime: null,
      });
    } else {
      const lastVisitTime = parseInt(lastVisitStr || "0");
      const daysSinceLastVisit = Math.floor(
        (Date.now() - lastVisitTime) / (1000 * 60 * 60 * 24),
      );
      const newVisitCount = visitCount + 1;
      localStorage.setItem(LAST_VISIT_KEY, Date.now().toString());
      localStorage.setItem(VISIT_COUNT_KEY, newVisitCount.toString());

      setVisitor({
        visitorId,
        isFirstVisit: false,
        isReturningVisitor: true,
        daysSinceLastVisit,
        visitCount: newVisitCount,
        deviceType,
        timeOnSite: 0,
        lastVisitTime,
      });
    }

    // Track time on site
    timeIntervalRef.current = setInterval(() => {
      setVisitor((prev) =>
        prev
          ? {
              ...prev,
              timeOnSite: Math.floor(
                (Date.now() - sessionStartTime.current) / 1000,
              ),
            }
          : null,
      );
    }, TIME_INTERVAL);

    return () => {
      if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
    };
  }, []);

  return (
    <SessionContext.Provider
      value={{ visitor, cookiePreference, setCookiePreference }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = (): SessionContextType => {
  const context = useContext(SessionContext);
  if (!context)
    throw new Error("useSession must be used within a SessionProvider");
  return context;
};
