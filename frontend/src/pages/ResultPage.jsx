import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { useNavigate, useSearchParams } from "react-router-dom";

const SCOPE_COLORS = ["#34D399", "#60A5FA", "#A78BFA"]; // green, blue, lavender

export default function ResultPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const session_id = searchParams.get("session_id");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [totalEmissions, setTotalEmissions] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [scopeData, setScopeData] = useState([]);
  const [topCategories, setTopCategories] = useState([]);
  const [categoriesDetailed, setCategoriesDetailed] = useState([]);

  const [openCategory, setOpenCategory] = useState(null);
  const toggle = (index) => setOpenCategory(openCategory === index ? null : index);

  useEffect(() => {
    async function fetchResults() {
      if (!session_id) {
        setError("Session ID missing.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/results/${session_id}`
        );

        if (!res.ok) throw new Error("Failed to fetch results");

        const data = await res.json();

        setTotalEmissions(data.total_yearly_emissions);
        setConfidence(data.confidence_weighted_score);

        setScopeData([
          { name: "Scope 1 (Direct)", value: data.scope1_total },
          { name: "Scope 2 (Energy Indirect)", value: data.scope2_total },
          { name: "Scope 3 (Value Chain)", value: data.scope3_total },
        ]);

        setTopCategories(
          data.top_categories.map((cat) => ({
            name: cat.category,
            value: cat.raw_emissions,
          }))
        );

        setCategoriesDetailed(
          data.categories_detailed.map((cat) => ({
            name: cat.category,
            value: cat.raw_emissions,
            entities: cat.entities.map((e) => ({
              name: e.entity_id,
              value: e.emission_tonnes,
            })),
          }))
        );

        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Unable to load results.");
        setLoading(false);
      }
    }

    fetchResults();
  }, [session_id]);

  const totalScope = scopeData.reduce((sum, s) => sum + s.value, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center text-xl">
        Loading results...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center text-xl text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 flex justify-center">
      <div className="w-full max-w-4xl space-y-10">

        {/* BACK BUTTON */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-300 hover:text-white transition mb-4"
        >
          <span className="text-3xl">←</span>
          <span>Back</span>
        </button>

        {/* LOGO */}
        <div className="flex items-center gap-3">
          <img
            src="/images/logo.webp"
            alt="ecoAgent Logo"
            className="h-16 w-16 object-contain drop-shadow-[0_0_8px_rgba(0,255,180,0.4)]"
          />
          <span className="text-2xl font-bold text-white">ecoAgent</span>
        </div>

        {/* TOTAL EMISSIONS */}
        <div className="bg-black/70 border border-white/10 p-6 rounded-xl">
          <p className="text-gray-400 text-lg">Total Yearly Emissions</p>
          <p className="text-4xl font-bold mt-1">
            {totalEmissions.toFixed(2)}{" "}
            <span className="text-green-400">tCO₂e</span>
          </p>

          <div className="mt-3 inline-block px-4 py-2 bg-green-700/40 border border-green-500/40 rounded-lg">
            <span className="text-green-300 font-semibold">
              Confidence {Math.round(confidence * 100)}%
            </span>
          </div>
        </div>

        {/* PIE + TOP CATEGORIES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* EMISSION SCOPES DONUT */}
          <div className="bg-black/70 border border-white/10 p-6 rounded-xl overflow-hidden">

            <p className="text-lg font-semibold mb-6">Emission Scopes</p>

            <div className="flex flex-col md:flex-row items-center justify-center gap-10">

              <div className="relative flex items-center justify-center">
                <div
                  className="absolute h-[220px] w-[220px] rounded-full animate-pulse-slow opacity-30"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(52,211,153,0.20), transparent 70%)",
                  }}
                ></div>

                <PieChart width={240} height={240} className="overflow-visible">
                  <Pie
                    data={scopeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ value, cx, cy, midAngle, outerRadius }) => {
                      const RADIAN = Math.PI / 180;
                      const x =
                        cx +
                        (outerRadius - 20) * Math.cos(-midAngle * RADIAN);
                      const y =
                        cy +
                        (outerRadius - 20) * Math.sin(-midAngle * RADIAN);
                      return (
                        <text
                          x={x}
                          y={y}
                          fill="#ffffff"
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize={12}
                          fontWeight="bold"
                        >
                          {Math.round((value / totalScope) * 100)}%
                        </text>
                      );
                    }}
                  >
                    {scopeData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={SCOPE_COLORS[index]}
                        stroke="#0f172a"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>

                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid rgba(52,211,153,0.4)",
                      borderRadius: "10px",
                      color: "white",
                      padding: "10px",
                    }}
                    itemStyle={{ color: "white" }}
                    labelStyle={{ color: "#34D399", fontWeight: "bold" }}
                  />
                </PieChart>
              </div>

              <div className="flex flex-col gap-5">
                {scopeData.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <span
                      className="h-4 w-4 block rounded-md shadow-md"
                      style={{ background: SCOPE_COLORS[idx] }}
                    ></span>

                    <div className="leading-tight">
                      <p className="text-white font-semibold">{item.name}</p>
                      <p className="text-gray-400 text-sm">
                        {item.value.toFixed(2)} tCO₂e (
                        {Math.round((item.value / totalScope) * 100)}%)
                      </p>
                    </div>
                  </div>
                ))}
              </div>

            </div>

            <style>
              {`
                @keyframes pulse-slow {
                  0% { transform: scale(0.95); opacity: 0.45; }
                  50% { transform: scale(1); opacity: 0.75; }
                  100% { transform: scale(0.95); opacity: 0.45; }
                }
                .animate-pulse-slow {
                  animation: pulse-slow 4s infinite ease-in-out;
                }
              `}
            </style>

          </div>

          {/* TOP CATEGORIES */}
          <div className="bg-black/70 border border-white/10 p-6 rounded-xl">
            <p className="text-lg font-semibold mb-4">Top Emission Categories</p>

            {topCategories.map((cat, i) => (
              <div key={i} className="flex flex-col mb-3">
                <p className="text-lg text-green-400 font-medium">{cat.name}</p>
                <div className="h-3 bg-white/10 rounded mt-1 overflow-hidden">
                  <div
                    className="h-full bg-green-400 transition-all duration-700"
                    style={{ width: `${(cat.value / totalEmissions) * 100}%` }}
                  />
                </div>
                <span className="text-sm text-gray-400 mt-1">
                  {cat.value.toFixed(2)} tCO₂e
                </span>
              </div>
            ))}
          </div>

        </div>

        {/* CATEGORY LIST */}
        <div className="bg-black/70 border border-white/10 p-6 rounded-xl">
          <p className="text-xl font-semibold mb-6">Emission Categories</p>

          <div className="space-y-4">
            {categoriesDetailed.map((cat, index) => (
              <div key={index}>
                <button
                  onClick={() => toggle(index)}
                  className="w-full flex justify-between items-center bg-white/10 hover:bg-white/20 p-4 rounded-xl transition"
                >
                  <span className="text-lg">{cat.name}</span>
                  <span className="text-green-400 font-semibold">
                    {cat.value.toFixed(2)} tCO₂e
                  </span>
                </button>

                <div
                  className={`ml-4 border-l border-gray-700 pl-4 overflow-hidden transition-all duration-500 ${
                    openCategory === index
                      ? "max-h-96 opacity-100 mt-3"
                      : "max-h-0 opacity-0"
                  }`}
                >
                  {cat.entities.map((ent, i) => (
                    <div key={i} className="flex justify-between pr-2 py-1">
                      <p className="text-gray-300">• {ent.name}</p>
                      <p className="text-green-400">
                        {ent.value.toFixed(3)} tCO₂e
                      </p>
                    </div>
                  ))}
                </div>

              </div>
            ))}
          </div>

        </div>

      </div>
    </div>
  );
}
