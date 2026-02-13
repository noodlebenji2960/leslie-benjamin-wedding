import React, { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import "../styles/components/DonateButton.scss";
import { Modal } from "./Modal";

interface DonateButtonProps {
  amount?: string;
  className?: string;
}

const DonateButton: React.FC<DonateButtonProps> = ({
  amount,
  className = "",
}) => {
  const { t } = useTranslation(["common"]);
  const [isOpen, setIsOpen] = useState(false);

  // Build PayPal donate URL
  const paypalUrl = new URL("https://www.paypal.com/donate");
  paypalUrl.searchParams.append("business", "MVVJWUBMGV866");
  paypalUrl.searchParams.append("no_recurring", "1");
  paypalUrl.searchParams.append("currency_code", "EUR");
  if (amount) {
    paypalUrl.searchParams.append("amount", amount);
  }

  return (
    <>
      {/* Donate Button */}
      <motion.button
        type="button"
        className={`donate-container ${className}`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        title={t("donate.title")}
        onClick={() => setIsOpen(true)}
      >
        <div className="donate-content">
          <span className="donate-text">{t("click_here")}</span>
        </div>
      </motion.button>

      {/* Modal */}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <div className="donate-modal">
          <h2>{t("donate.modal_title")}</h2>

          <p>{t("donate.message_1")}</p>
          <p>{t("donate.message_2")}</p>
          <p>{t("donate.message_3")}</p>

          <motion.a
            href={paypalUrl.toString()}
            target="_blank"
            rel="noopener noreferrer"
            className="paypal-link"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
          >
            {t("donate.paypal_cta")}
          </motion.a>
        </div>
      </Modal>
    </>
  );
};

export default DonateButton;
