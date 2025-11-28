import React, { useState } from "react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { useNavigate } from "react-router-dom";

// ecoAgent theme colors
const SCOPE_COLORS = ["#34D399", "#60A5FA", "#A78BFA"]; // green, blue, lavender

export default function ResultPage({
  totalEmissions = 153.7,
  confidence = 0.82,
  scopes = {
    scope1: 50,
    scope2: 40,
    scope3: 63.7,
  },
  categories = [
    {
      name: "Stationery Fuel Combustion",
      value: 40,
      entities: [
        { name: "Diesel Generator", value: 22 },
        { name: "Furnace", value: 12 },
        { name: "Boiler", value: 6 },
      ],
    },
    {
      name: "Purchased Electricity",
      value: 32,
      entities: [{ name: "Grid Electricity", value: 32 }],
    },
    {
      name: "Mobile Combustion",
      value: 27,
      entities: [
        { name: "Company Vehicles", value: 18 },
        { name: "Delivery Vans", value: 9 },
      ],
    },
    {
      name: "Waste Disposal",
      value: 20,
      entities: [
        { name: "Office Waste", value: 12 },
        { name: "Packaging Waste", value: 8 },
      ],
    },
  ],
}) {
  const [openCategory, setOpenCategory] = useState(null);
  const navigate = useNavigate();

  const toggle = (index) =>
    setOpenCategory(openCategory === index ? null : index);

  const scopeData = [
    { name: "Scope 1 (Direct)", value: scopes.scope1 },
    { name: "Scope 2 (Energy Indirect)", value: scopes.scope2 },
    { name: "Scope 3 (Value Chain)", value: scopes.scope3 },
  ];

  const totalScope = scopeData.reduce((sum, s) => sum + s.value, 0);

  const topCategories = [...categories]
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

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
            {totalEmissions.toFixed(1)}{" "}
            <span className="text-green-400">tCO₂e</span>
          </p>

          <div className="mt-3 inline-block px-4 py-2 bg-green-700/40 border border-green-500/40 rounded-lg">
            <span className="text-green-300 font-semibold">
              Confidence {Math.round(confidence * 100)}%
            </span>
          </div>
        </div>

        {/* PIE CHART + TOP CATEGORIES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* ---------- FIXED EMISSION SCOPES BLOCK ---------- */}
          <div className="bg-black/70 border border-white/10 p-6 rounded-xl overflow-hidden">

            <p className="text-lg font-semibold mb-6">Emission Scopes</p>

            {/* Layout: chart left, legend right */}
            <div className="flex flex-col md:flex-row items-center md:items-start justify-center gap-10">

              {/* DONUT CHART */}
              <div className="relative flex items-center justify-center">

                {/* Smaller glow that stays inside */}
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
                    animationDuration={1200}
                    label={({ value, cx, cy, midAngle, outerRadius }) => {
                      const RADIAN = Math.PI / 180;
                      const radius = outerRadius - 20; // keep labels inside bounds
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);

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

                  {/* FIXED TOOLTIPS */}
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

              {/* RIGHT LEGEND (contained & spaced) */}
              <div className="flex flex-col gap-5 w-full md:w-auto">

                {scopeData.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">

                    <span
                      className="h-4 w-4 block rounded-md shadow-md"
                      style={{ background: SCOPE_COLORS[idx] }}
                    ></span>

                    <div className="leading-tight">
                      <p className="text-white font-semibold">{item.name}</p>
                      <p className="text-gray-400 text-sm">
                        {item.value.toFixed(1)} tCO₂e (
                        {Math.round((item.value / totalScope) * 100)}%)
                      </p>
                    </div>

                  </div>
                ))}

              </div>

            </div>

            {/* Pulse Animation */}
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
          {/* ---------- END FIXED EMISSION SCOPES BLOCK ---------- */}

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
                  ></div>
                </div>
                <span className="text-sm text-gray-400 mt-1">
                  {cat.value} tCO₂e
                </span>
              </div>
            ))}
          </div>

        </div>

        {/* CATEGORY LIST */}
        <div className="bg-black/70 border border-white/10 p-6 rounded-xl">
          <p className="text-xl font-semibold mb-6">Emission Categories</p>

          <div className="space-y-4">
            {categories.map((cat, index) => (
              <div key={index}>

                <button
                  onClick={() => toggle(index)}
                  className="w-full flex justify-between items-center bg-white/10 hover:bg-white/20 p-4 rounded-xl transition"
                >
                  <span className="text-lg">{cat.name}</span>
                  <span className="text-green-400 font-semibold">
                    {cat.value} tCO₂e
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
                      <p className="text-green-400">{ent.value} tCO₂e</p>
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
