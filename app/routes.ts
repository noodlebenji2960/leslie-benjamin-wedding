// app/routes.ts
import {
  type RouteConfig,
  layout,
  route,
  index,
  prefix,
} from "@react-router/dev/routes";
import siteConfig from "./data/feature-config.json";

/**
 * Helper: include route only if feature is enabled
 */
function optionalRoute(
  enabled: boolean,
  makeRoute: () => RouteConfig,
): RouteConfig[] {
  return enabled ? [makeRoute()] : [];
}

// --- English routes ---
export const enRoutes: RouteConfig[] = [
  index("routes/home.tsx", { id: "en/home" }),
  ...optionalRoute(siteConfig.rsvp.enabled, () =>
    route("rsvp", "routes/rsvp.tsx", { id: "en/rsvp" }),
  ),
  ...optionalRoute(siteConfig.schedule.enabled, () =>
    route("schedule", "routes/schedule.tsx", { id: "en/schedule" }),
  ),
  ...optionalRoute(siteConfig.qa.enabled, () =>
    route("qa", "routes/qa.tsx", { id: "en/qa" }),
  ),
];

// --- Spanish routes ---
export const esRoutes: RouteConfig[] = [
  index("routes/home.tsx", { id: "es/home" }),
  ...optionalRoute(siteConfig.rsvp.enabled, () =>
    route("rsvp", "routes/rsvp.tsx", { id: "es/rsvp" }),
  ),
  ...optionalRoute(siteConfig.schedule.enabled, () =>
    route("schedule", "routes/schedule.tsx", { id: "es/schedule" }),
  ),
  ...optionalRoute(siteConfig.qa.enabled, () =>
    route("qa", "routes/qa.tsx", { id: "es/qa" }),
  ),
];

// --- Export final route config ---
export default [
  // Main layout
  layout("routes/_layout.tsx", [
    index("routes/redirect.tsx"),
    ...prefix("es", esRoutes),
    ...prefix("en", enRoutes),
  ]),

  // Legal pages — always present
  ...prefix("es", [
    route("legal/:page", "routes/legal.tsx", { id: "es/legal" }),
  ]),
  ...prefix("en", [
    route("legal/:page", "routes/legal.tsx", { id: "en/legal" }),
  ]),
] satisfies RouteConfig;
