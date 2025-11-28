import React, { useState, useEffect, useRef } from "react";

const steps = ["Country", "Industry", "Employees", "Facilities", "Products"];

const options = {
  country: [
    "India",
    "USA",
    "UK",
    "Europe (specify country)",
    "Middle East (specify country)",
    "Southeast Asia (specify country)",
    "Other (specify)",
  ],
  industry: [
    "Software / SaaS",
    "IT Services / Consulting",
    "Manufacturing",
    "Retail",
    "Logistics / Transportation",
    "Construction / Real Estate",
    "Food & Beverage",
    "Agriculture",
    "Healthcare",
    "Finance / Banking / Insurance",
    "Energy / Utilities",
    "Other (specify)",
  ],
  employees: ["1–10", "11–50", "51–200", "201–500", "501–1000", "1000+"],
  facilities: [
    "Office only",
    "Office + Warehouse",
    "Office + Factory",
    "Factory only",
    "Warehouse only",
    "Retail outlets",
    "Fully remote (no physical facilities)",
    "Other (specify)",
  ],
  sells: [
    "Only services (no physical products)",
    "Physical products",
    "Both products and services",
    "Digital products (e.g., software, media)",
  ],
};

// Option row component
function OptionRow({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-lg transition
      ${
        active
          ? "bg-green-500 text-black"
          : "bg-white/10 text-gray-200 hover:bg-white/20"
      }`}
    >
      <div
        className={`h-4 w-4 rounded-full border-2 ${
          active ? "bg-black border-black" : "border-gray-400"
        }`}
      ></div>
      <span>{label}</span>
    </button>
  );
}

export default function CollectInfo({ onComplete }) {
  const [step, setStep] = useState(0);
  const [shake, setShake] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  const containerRef = useRef(null);

  const [answers, setAnswers] = useState({
    country: "",
    country_other: "",
    industry: "",
    industry_other: "",
    employees: "",
    facilities: "",
    facilities_other: "",
    sells: "",
  });

  // Auto-scroll to top when step changes
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: "smooth" });
    }
    setShowWarning(false);
  }, [step]);

  const handleSelect = (key, value) => {
    const updated = { ...answers, [key]: value };
    const needs =
      value.toLowerCase().includes("other") ||
      value.toLowerCase().includes("specify");

    if (!needs) updated[key + "_other"] = "";
    setAnswers(updated);
  };

  const handleOtherChange = (key, value) => {
    setAnswers({ ...answers, [key + "_other"]: value });
  };

  // VALIDATION
  const isStepValid = () => {
    switch (step) {
      case 0: {
        const c = answers.country;
        if (!c) return false;
        if (c.toLowerCase().includes("specify") || c.toLowerCase().includes("other"))
          return answers.country_other.trim().length > 0;
        return true;
      }
      case 1: {
        const i = answers.industry;
        if (!i) return false;
        if (i.toLowerCase().includes("other"))
          return answers.industry_other.trim().length > 0;
        return true;
      }
      case 2:
        return answers.employees !== "";
      case 3: {
        const f = answers.facilities;
        if (!f) return false;
        if (f.toLowerCase().includes("other"))
          return answers.facilities_other.trim().length > 0;
        return true;
      }
      case 4:
        return answers.sells !== "";
      default:
        return false;
    }
  };

  const triggerShake = () => {
    setShake(true);
    setShowWarning(true);
    setTimeout(() => setShake(false), 600);
  };

  const next = () => {
    if (!isStepValid()) return triggerShake();
    setStep((s) => s + 1);
  };

  const back = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const finalize = () => {
    if (!isStepValid()) return triggerShake();

    const getVal = (key) => {
      const main = answers[key];
      const extra = answers[key + "_other"];
      const needs =
        main.toLowerCase().includes("other") ||
        main.toLowerCase().includes("specify");
      return needs && extra.trim() ? extra.trim() : main;
    };

    const result = {
      company_profile: {
        country: getVal("country"),
        industry: getVal("industry"),
        employees: answers.employees,
        physical_facilities: getVal("facilities"),
        sells: answers.sells,
      },
    };

    console.log("FINAL →", result);
    if (onComplete) onComplete(result);
    alert("Profile captured! Check console for output.");
  };

  // Slide animation class for step changes
  const transitionClass =
    "transition-all duration-500 ease-out transform";

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className={`${transitionClass}`}>
            <h2 className="text-xl font-semibold mb-4">Country of Operation</h2>

            <div className="grid md:grid-cols-2 gap-3">
              {options.country.map((opt) => (
                <OptionRow
                  key={opt}
                  label={opt}
                  active={answers.country === opt}
                  onClick={() => handleSelect("country", opt)}
                />
              ))}
            </div>

            {(answers.country.includes("specify") ||
              answers.country.toLowerCase().includes("other")) && (
              <input
                className="w-full mt-3 p-3 bg-white/10 rounded outline-none"
                placeholder="Type country…"
                value={answers.country_other}
                onChange={(e) => handleOtherChange("country", e.target.value)}
              />
            )}
          </div>
        );

      case 1:
        return (
          <div className={`${transitionClass}`}>
            <h2 className="text-xl font-semibold mb-4">Industry / Sector</h2>

            <div className="grid md:grid-cols-2 gap-3 max-h-72 overflow-y-auto">
              {options.industry.map((opt) => (
                <OptionRow
                  key={opt}
                  label={opt}
                  active={answers.industry === opt}
                  onClick={() => handleSelect("industry", opt)}
                />
              ))}
            </div>

            {answers.industry.toLowerCase().includes("other") && (
              <input
                className="w-full mt-3 p-3 bg-white/10 rounded outline-none"
                placeholder="Type industry…"
                value={answers.industry_other}
                onChange={(e) => handleOtherChange("industry", e.target.value)}
              />
            )}
          </div>
        );

      case 2:
        return (
          <div className={`${transitionClass}`}>
            <h2 className="text-xl font-semibold mb-4">Number of Employees</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {options.employees.map((opt) => (
                <OptionRow
                  key={opt}
                  label={opt}
                  active={answers.employees === opt}
                  onClick={() => handleSelect("employees", opt)}
                />
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className={`${transitionClass}`}>
            <h2 className="text-xl font-semibold mb-4">Physical Facilities</h2>
            <div className="grid md:grid-cols-2 gap-3">
              {options.facilities.map((opt) => (
                <OptionRow
                  key={opt}
                  label={opt}
                  active={answers.facilities === opt}
                  onClick={() => handleSelect("facilities", opt)}
                />
              ))}
            </div>

            {answers.facilities.toLowerCase().includes("other") && (
              <input
                className="w-full mt-3 p-3 bg-white/10 rounded outline-none"
                placeholder="Specify facilities…"
                value={answers.facilities_other}
                onChange={(e) => handleOtherChange("facilities", e.target.value)}
              />
            )}
          </div>
        );

      case 4:
        return (
          <div className={`${transitionClass}`}>
            <h2 className="text-xl font-semibold mb-4">What do you sell?</h2>
            <div className="grid md:grid-cols-2 gap-3">
              {options.sells.map((opt) => (
                <OptionRow
                  key={opt}
                  label={opt}
                  active={answers.sells === opt}
                  onClick={() => handleSelect("sells", opt)}
                />
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-black text-white flex justify-center p-6"
    >
      <div
        className={`w-full max-w-2xl bg-black/80 border border-white/10 rounded-xl p-8 space-y-10 ${
          shake ? "animate-shake" : ""
        }`}
      >
        {/* HEADER */}
        <div className="flex flex-col items-start">
          <img
            src="/images/logo.webp"
            alt="ecoAgent Logo"
            className="h-16 w-16 object-contain drop-shadow-[0_0_8px_rgba(0,255,180,0.45)]"
          />

          <p className="text-lg text-gray-300 mt-4">
            Let’s understand your business better
          </p>
        </div>

        {/* BUBBLE PROGRESS BAR */}
        <div className="flex flex-col items-center w-full">
          <div className="flex items-center justify-center gap-2 w-full">
            {steps.map((label, i) => (
              <div key={i} className="flex items-center w-full">
                <div
                  className={`h-5 w-5 rounded-full border-2 flex-shrink-0
                    ${
                      i === step
                        ? "bg-green-400 border-green-400"
                        : i < step
                        ? "bg-green-700 border-green-700"
                        : "border-gray-600"
                    }`}
                ></div>

                {i !== steps.length - 1 && (
                  <div className="flex-grow h-[2px] bg-gray-600 opacity-40 mx-2"></div>
                )}
              </div>
            ))}
          </div>

          <p className="mt-2 text-gray-400 text-sm">{steps[step]}</p>
        </div>

        {/* STEP CONTENT */}
        {renderStep()}

        {/* INLINE WARNING */}
        {showWarning && (
          <p className="text-red-400 text-sm mt-2">
            ⚠ Please select an option to continue.
          </p>
        )}

        {/* NAVIGATION */}
        <div className="flex justify-between pt-4">
          <button
            type="button"
            onClick={back}
            disabled={step === 0}
            className={`px-4 py-2 rounded 
            ${
              step === 0
                ? "bg-white/10 text-gray-500 cursor-not-allowed"
                : "bg-white/20 hover:bg-white/30"
            }`}
          >
            Back
          </button>

          {step < steps.length - 1 ? (
            <button
              type="button"
              onClick={next}
              className={`px-4 py-2 rounded font-semibold 
              bg-green-400 text-black hover:bg-green-300`}
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={finalize}
              className={`px-4 py-2 rounded font-semibold 
              bg-green-400 text-black hover:bg-green-300`}
            >
              Finish
            </button>
          )}
        </div>
      </div>

      {/* Shake animation CSS */}
      <style>{`
        @keyframes shake {
          0% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          50% { transform: translateX(6px); }
          75% { transform: translateX(-6px); }
          100% { transform: translateX(0); }
        }
        .animate-shake {
          animation: shake 0.4s ease;
        }
      `}</style>
    </div>
  );
}
