// app/components/ErrorPage.tsx
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { PageTitle } from "@/components/PageTitle";
import { Button } from "@/components/Button";
import { useBuildLink } from "@/hooks/useBuildLink";

export type ErrorPageStatus = 403 | 404 | 500 | 503 | "default";

interface ErrorPageProps {
  status: ErrorPageStatus;
  /** Show a "Try again" button instead of / alongside "Go back". */
  onRetry?: () => void;
  retrying?: boolean;
  /** Hide the "Go back" button (e.g. when there's nowhere sensible to go back to). */
  hideGoBack?: boolean;
  children?: React.ReactNode;
}

export function ErrorPage({
  status,
  onRetry,
  retrying,
  hideGoBack,
  children,
}: ErrorPageProps) {
  const { t } = useTranslation("errorPage");
  const { buildLink } = useBuildLink();
  const navigate = useNavigate();

  const key = String(status);

  return (
    <div className="error-page__container">
      <PageTitle className="error-page__code">
        {t(`statuses.${key}.title`, { defaultValue: t("statuses.default.title") })}
      </PageTitle>
      <p className="error-page__message">
        {t(`statuses.${key}.message`, { defaultValue: t("statuses.default.message") })}
      </p>
      <p className="error-page__help">
        {t(`statuses.${key}.help`, { defaultValue: t("statuses.default.help") })}
      </p>
      <div className="error-page__actions">
        {onRetry && (
          <Button
            variant="primary"
            state={retrying ? "loading" : "idle"}
            loadingChildren={t("actions.retrying")}
            onClick={onRetry}
          >
            {t("actions.retry")}
          </Button>
        )}
        <Button variant={onRetry ? "secondary" : "primary"} to={buildLink("/")}>
          {t("actions.goHome")}
        </Button>
        {!hideGoBack && (
          <Button variant="secondary" onClick={() => navigate(-1)}>
            {t("actions.goBack")}
          </Button>
        )}
      </div>
      {children && <div className="error-page__extra">{children}</div>}
    </div>
  );
}
