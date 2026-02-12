// app/routes/qa.tsx

import { useTranslation } from "react-i18next";
import { useState } from "react";
import "@/styles/qa.scss";


const QA = () => {
  const { t, ready } = useTranslation("qa");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!ready) {
    return <div className="loading">Loading...</div>;
  }

  // Get the items array from translations
  const items = t("items", { returnObjects: true }) as {
    question: string;
    answer: string;
  }[];

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="qa-page container">
      <h1 className="qa-title">{t("title")}</h1>

      <div className="qa-list">
        {items &&
          items.length>0 && items.map((item, index) => (
            <div key={index} className="qa-item">
              <button
                className={`qa-question ${openIndex === index ? "open" : ""}`}
                onClick={() => toggleItem(index)}
              >
                {item.question}
              </button>

              {openIndex === index && (
                <div className="qa-answer">
                  {item.answer.split("\n").map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
};

export default QA;
