// app/routes/service-unavailable.tsx
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ErrorPage } from "@/components/ErrorPage";
import { ServerStatus } from "@/components/gallery/ServerStatus";
import { useServer } from "@/contexts/ServerContext";
import { useBuildLink } from "@/hooks/useBuildLink";
import type { Route } from "./+types/service-unavailable";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Service Unavailable - Leslie & Benjamin" }];
}

export default function ServiceUnavailable() {
  const { isAvailable: serverAvailable, checkHealth } = useServer();
  const { buildLink } = useBuildLink();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [retrying, setRetrying] = useState(false);

  const returnTo = searchParams.get("from");

  // If the server comes back — via the retry button below or the
  // background poll in ServerContext — bounce back automatically.
  useEffect(() => {
    if (serverAvailable) {
      navigate(returnTo ? buildLink(returnTo) : buildLink("/"), {
        replace: true,
      });
    }
  }, [serverAvailable, returnTo, buildLink, navigate]);

  const handleRetry = async () => {
    setRetrying(true);
    await checkHealth();
    setRetrying(false);
  };

  return (
    <ErrorPage status={503} onRetry={() => void handleRetry()} retrying={retrying} hideGoBack>
      <ServerStatus />
    </ErrorPage>
  );
}
