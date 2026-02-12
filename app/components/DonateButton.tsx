import React from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import "../styles/components/DonateButton.scss";
import { Icon } from "./Icon";

interface DonateButtonProps {
  amount?: string;
  className?: string;
}

const DonateButton: React.FC<DonateButtonProps> = ({
  amount,
  className = "",
}) => {
  const { t } = useTranslation(["common"]);

  // Build PayPal donate URL with parameters
  const paypalUrl = new URL("https://www.paypal.com/donate");
  paypalUrl.searchParams.append("business", "MVVJWUBMGV866");
  paypalUrl.searchParams.append("no_recurring", "1");
  paypalUrl.searchParams.append("currency_code", "EUR");
  if (amount) {
    paypalUrl.searchParams.append("amount", amount);
  }

  return (
    <motion.a
      href={paypalUrl.toString()}
      target="_blank"
      rel="noopener noreferrer"
      className={`donate-container ${className}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      title={t("donate.title")} // 👈 Add title back
    >
      <div className="donate-content">
        <span className="donate-text">
          {t("click_here")}
        </span>
        <img
          alt=""
          width="1"
          height="1"
          src="https://www.paypal.com/en_GB/i/scr/pixel.gif"
          className="pixel-tracker"
        />
      </div>
    </motion.a>
  );
};

export default DonateButton;
