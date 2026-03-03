// app/routes/not-found.tsx
import { Link, useNavigate } from "react-router";
import { useBuildLink } from "@/hooks/useBuildLink";

export default function NotFound() {
  const navigate = useNavigate();

  const handleGoBack = () => {
    // If there’s previous history, go back.
    // If not, this may do nothing; let user fall back to “Go to homepage”.
    navigate(-1);
  };

  return (
      <div className="not-found__container">
        <h1 className="not-found__title">404</h1>
        <p className="not-found__message">Page not found</p>
        <p className="not-found__help">
          The link you followed might be broken or the page may have been moved.
        </p>
        <div className="not-found__actions">
          <Link className="not-found__button not-found__button--primary" to="/">
            Go to homepage
          </Link>
          <button
            type="button"
            className="not-found__button not-found__button--secondary"
            onClick={handleGoBack}
          >
            Go Back
          </button>
        </div>
      </div>
  );
}
