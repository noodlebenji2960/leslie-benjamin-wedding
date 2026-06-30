// app/routes/not-found.tsx
import { ErrorPage } from "@/components/ErrorPage";
import type { Route } from "./+types/not-found";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Page Not Found - Leslie & Benjamin" }];
}

export default function NotFound(_props: Route.ComponentProps) {
  return <ErrorPage status={404} />;
}
