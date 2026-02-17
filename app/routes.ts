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
    index("routes/redirect.tsx"),

    ...prefix("es", [
      index("routes/home.tsx", { id: "es/home" }),
      route("rsvp", "routes/rsvp.tsx", { id: "es/rsvp" }),
      route("schedule", "routes/schedule.tsx", { id: "es/schedule" }),
      route("qa", "routes/qa.tsx", { id: "es/qa" }),
    ]),

    ...prefix("en", [
      index("routes/home.tsx", { id: "en/home" }),
      route("rsvp", "routes/rsvp.tsx", { id: "en/rsvp" }),
      route("schedule", "routes/schedule.tsx", { id: "en/schedule" }),
      route("qa", "routes/qa.tsx", { id: "en/qa" }),
    ]),
  ]),

  // Legal pages — language prefixed, outside the layout
  ...prefix("es", [
    route("legal/:page", "routes/legal.tsx", { id: "es/legal" }),
  ]),
  ...prefix("en", [
    route("legal/:page", "routes/legal.tsx", { id: "en/legal" }),
  ]),
] satisfies RouteConfig;