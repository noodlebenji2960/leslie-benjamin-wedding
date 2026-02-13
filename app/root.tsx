// src/root/Layout.tsx
import "./i18n";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
} from "react-router";
import type { Route } from "./+types/root";
import "@/styles/global.scss";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AnalyticsProvider } from "./contexts/AnalyticsContext";
import { SessionProvider, SessionContext } from "@/contexts/SessionContext";

const GA_ID = import.meta.env.VITE_GA_ID;
const isProd = import.meta.env.MODE === "production";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const locale = location.pathname.startsWith("/en") ? "en" : "es";

  return (
    <html lang={locale}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />

        {/* Google Analytics – only loads gtag script in production */}
        {isProd && GA_ID && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${GA_ID}');
                `,
              }}
            />
          </>
        )}
      </head>

      <body className="body">
        <SessionProvider>
          <SessionContext.Consumer>
            {({ cookiePreference }) => (
              <AnalyticsProvider cookiePreference={cookiePreference}>
                <ThemeProvider>
                  <LanguageProvider>{children}</LanguageProvider>
                </ThemeProvider>
              </AnalyticsProvider>
            )}
          </SessionContext.Consumer>
        </SessionProvider>

        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
