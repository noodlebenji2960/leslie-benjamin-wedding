// app/routes.ts
import {
  type RouteConfig,
  layout,
  route,
  index,
  prefix,
} from "@react-router/dev/routes";

export default [
  layout("routes/_layout.tsx", [
    // Root redirect at the layout level
    index("routes/redirect.tsx"),

    // Spanish routes under /es prefix
    ...prefix("es", [
      index("routes/home.tsx", { id: "es/home" }),
      route("rsvp", "routes/rsvp.tsx", { id: "es/rsvp" }),
      route("schedule", "routes/schedule.tsx", { id: "es/schedule" }),
      route("qa", "routes/qa.tsx", { id: "es/qa" }),
    ]),

    // English routes under /en prefix
    ...prefix("en", [
      index("routes/home.tsx", { id: "en/home" }),
      route("rsvp", "routes/rsvp.tsx", { id: "en/rsvp" }),
      route("schedule", "routes/schedule.tsx", { id: "en/schedule" }),
      route("qa", "routes/qa.tsx", { id: "en/qa" }),
    ]),
  ]),
] satisfies RouteConfig;
