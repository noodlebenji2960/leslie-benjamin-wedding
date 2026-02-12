import { useWeddingData } from "@/hooks/useWeddingData";
import { Countdown } from "./Countdown";
import "../styles/components/PageFooter.scss";

const Footer = () => {
  const weddingData = useWeddingData();

  // Guard while data loads
  if (!weddingData?.wedding) return null;

  const { date } = weddingData.wedding;
  const { time } = weddingData.wedding.ceremony;

  return (
    <footer className="footer">
      <div className="footer-content">
        <Countdown size="sm" date={date} time={time} />
      </div>
    </footer>
  );
};

export default Footer;
