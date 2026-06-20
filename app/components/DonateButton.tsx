import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Modal } from "./Modal";
import { Icon } from "./Icon";
import { useWeddingData } from "@/hooks/useWeddingData";

type DetailMethod = "iban" | "bizum";

interface DonateButtonProps {
  amount?: string;
  className?: string;
}

const slideVariants = {
  enter: { x: 40, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -40, opacity: 0 },
};

const DonateButton: React.FC<DonateButtonProps> = ({
  amount,
  className = "",
}) => {
  const { t } = useTranslation(["common"]);
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<DetailMethod | null>(null);
  const [ibanCopied, setIbanCopied] = useState(false);
  const weddingData = useWeddingData();
  const { IBAN, IBANHolder, bizum, revolut } = weddingData.giftRegistry;

  const paypalUrl = new URL("https://www.paypal.com/donate");
  paypalUrl.searchParams.append("business", "MVVJWUBMGV866");
  paypalUrl.searchParams.append("no_recurring", "1");
  paypalUrl.searchParams.append("currency_code", "EUR");
  if (amount) {
    paypalUrl.searchParams.append("amount", amount);
  }

  const handleClose = () => {
    setIsOpen(false);
    setSelected(null);
    setIbanCopied(false);
  };

  const handleCopyIBAN = async () => {
    await navigator.clipboard.writeText(IBAN);
    setIbanCopied(true);
    setTimeout(() => setIbanCopied(false), 2000);
  };

  return (
    <>
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

      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        modalTitle={t("donate.modal_title")}
      >
        <div className="donate-modal">
          <AnimatePresence mode="wait">
            {!selected ? (
              <motion.div
                key="picker"
                className="donate-modal__step"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: "easeInOut" }}
              >
                <p className="donate-modal__intro">{t("donate.message")}</p>
                <div className="payment-picker">
                  <motion.button
                    type="button"
                    className="payment-option"
                    onClick={() => setSelected("iban")}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Icon.Bank className="payment-option__icon" />
                    <span className="payment-option__label">
                      {t("donate.iban_label")}
                    </span>
                  </motion.button>

                  <motion.button
                    type="button"
                    className="payment-option"
                    onClick={() => setSelected("bizum")}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Icon.Phone className="payment-option__icon" />
                    <span className="payment-option__label">
                      {t("donate.bizum_label")}
                    </span>
                  </motion.button>

                  <motion.a
                    href={paypalUrl.toString()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="payment-option"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Icon.Paypal className="payment-option__icon" />
                    <span className="payment-option__label">
                      {t("donate.paypal_label")}
                    </span>
                  </motion.a>

                  <motion.a
                    href={revolut}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="payment-option"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Icon.Revolut className="payment-option__icon" />
                    <span className="payment-option__label">
                      {t("donate.revolut_label")}
                    </span>
                  </motion.a>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={selected}
                className="donate-modal__step"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: "easeInOut" }}
              >
                {selected === "iban" && (
                  <div className="payment-detail">
                    <p className="donate-modal__intro">{t("donate.iban_desc")}</p>
                    <div className="iban-holder">
                      <span className="iban-holder__key">
                        {t("donate.iban_holder")}
                      </span>
                      <span className="iban-holder__value">{IBANHolder}</span>
                    </div>
                    <div className="iban-row">
                      <span className="iban-number">{IBAN}</span>
                      <motion.button
                        type="button"
                        className={`iban-copy-btn${ibanCopied ? " iban-copy-btn--copied" : ""}`}
                        onClick={handleCopyIBAN}
                        whileTap={{ scale: 0.95 }}
                        title={
                          ibanCopied
                            ? t("donate.iban_copied")
                            : t("donate.iban_copy")
                        }
                      >
                        {ibanCopied ? <Icon.Tick /> : <Icon.Copy />}
                      </motion.button>
                    </div>
                  </div>
                )}

                {selected === "bizum" && (
                  <div className="payment-detail">
                    <p className="donate-modal__intro">{t("donate.bizum_desc")}</p>
                    {bizum.map((person) => (
                      <div key={person.phone} className="bizum-row">
                        <span className="bizum-name">{person.name}</span>
                        <a
                          href={`tel:${person.phone.replace(/\s/g, "")}`}
                          className="bizum-phone"
                        >
                          {person.phone}
                        </a>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  className="donate-modal__back"
                  onClick={() => setSelected(null)}
                >
                  <Icon.Back />
                  {t("errors.goBack")}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Modal>
    </>
  );
};

export default DonateButton;
