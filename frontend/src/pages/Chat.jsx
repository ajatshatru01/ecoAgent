import { useEffect, useRef, useState } from "react";
import { PieChart, Pie, Cell, Legend, Tooltip } from "recharts";

export default function ChatPage() {
  const fixedQuestions = [
    "How many kilometers did you travel today?",
    "What was your mode of transportation?",
    "How many units of electricity do you think you used today?",
    "Did you consume any packaged or processed food today?",
    "Did you use AC or Heater today?"
  ];

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [isLLMmode, setIsLLMmode] = useState(false);

  const chatRef = useRef(null);

  const [analytics, setAnalytics] = useState({
    entities: [],
    sector: "Unknown",
    emissions: { value: "0 kg CO₂", breakdown: [] },
    category: "Uncategorized"
  });

  const COLORS = ["#34d399", "#60a5fa", "#fbbf24", "#fb7185", "#a78bfa"];

  const pieData = [
    { name: "Travel", value: 45 },
    { name: "Electricity", value: 25 },
    { name: "Food", value: 15 },
    { name: "Other", value: 15 }
  ];

  const [activeIndex, setActiveIndex] = useState(-1);

  const onPieEnter = (_, index) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(-1);
  };

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) {
      askNextQuestion();
    }
  }, [messages]);

  const parseUserInput = (text) => {
    let newEntities = [...analytics.entities];
    let sector = analytics.sector;
    let emissionsCO2 = 0;
    let breakdown = [];

    const kmMatch = text.match(/(\d+)\s*km/i);
    if (kmMatch) {
      const km = Number(kmMatch[1]);
      newEntities.push(`${km} km`);
      sector = "Transportation";

      const travelEmission = km * 0.21;
      emissionsCO2 += travelEmission;
      breakdown.push({ label: "Travel Emission", amount: travelEmission.toFixed(2) + " kg" });
    }

    if (text.toLowerCase().includes("car")) {
      newEntities.push("car");
      sector = "Transportation";
    } else if (text.toLowerCase().includes("bus")) {
      newEntities.push("bus");
      sector = "Public Transport";
    } else if (text.toLowerCase().includes("bike")) {
      newEntities.push("bike");
      sector = "Low Emission Transport";
    }

    if (text.toLowerCase().includes("ac")) {
      newEntities.push("AC");
      sector = "Electricity";
      emissionsCO2 += 1.5;
      breakdown.push({ label: "AC Usage", amount: "1.5 kg" });
    }

    let category = "Low Impact";
    if (emissionsCO2 > 3) category = "Medium Impact";
    if (emissionsCO2 > 7) category = "High Impact";

    setAnalytics({
      entities: newEntities,
      sector,
      emissions: { value: emissionsCO2.toFixed(2) + " kg CO₂", breakdown },
      category
    });
  };

  const askNextQuestion = () => {
    if (questionIndex < fixedQuestions.length) {
      setMessages((prev) => [...prev, { role: "assistant", text: fixedQuestions[questionIndex] }]);
      setQuestionIndex((i) => i + 1);
      return;
    }

    if (!isLLMmode) setIsLLMmode(true);

    setMessages((prev) => [
      ...prev,
      { role: "assistant", text: "Thanks! Based on your answers, how often do you use public transport?" }
    ]);
  };

  const sendMessage = () => {
    if (!input.trim()) return;
    const msg = input.trim();

    setMessages((prev) => [...prev, { role: "user", text: msg }]);
    setInput("");
    parseUserInput(msg);

    setTimeout(askNextQuestion, 500);
  };

  return (
    <div className="w-full h-screen overflow-hidden bg-black text-white px-14 py-10">

      {/* HEADER */}
      <header className="w-full flex items-center gap-4 mb-2">
        <img src="/images/logo.webp" className="w-10 h-10" />
        <h1 className="text-2xl font-bold tracking-tight text-emerald-400">
          EcoAgent <span className="text-[#f59e0b]">Chat</span>
        </h1>
      </header>

      {/* MAIN SECTION */}
      <div className="flex gap-4 h-[calc(100%-70px)]">

        {/* CHAT PANEL */}
        <div className="flex-1 bg-white/5 border border-emerald-500/20 rounded-xl p-4 shadow-lg flex flex-col">

          {/* CHAT BOX */}
          <div ref={chatRef} className="flex-1 overflow-y-auto pr-2 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}>
                <div
                  className={`max-w-[70%] px-3 py-2 rounded-xl text-sm shadow 
                  ${msg.role === "user" ? "bg-emerald-400 text-black" : "bg-[#3b82f6]/20 text-blue-200 border border-blue-400/40"}`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {/* INPUT */}
          <div className="mt-3 flex bg-black/40 border border-emerald-500/30 p-2 rounded-xl">
            <input
              className="flex-1 bg-transparent outline-none px-2 text-emerald-200 text-sm"
              placeholder="Type your answer..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button
              onClick={sendMessage}
              className="px-4 py-1.5 bg-emerald-500 text-black font-semibold rounded-lg text-sm shadow 
              hover:scale-105 active:scale-95 transition-all"
            >
              Send
            </button>
          </div>
        </div>

        {/* ANALYTICS PANEL */}
        <div className="w-[28%] bg-white/5 border border-emerald-500/20 rounded-xl p-4 shadow-lg space-y-4 text-sm">

          {/* ENTITIES */}
          <div>
            <h2 className="text-lg font-semibold text-emerald-400 mb-1">Entities</h2>
            <ul className="space-y-1">
              {analytics.entities.map((e, i) => (
                <li key={i} className="flex items-center gap-2 text-gray-300">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                  {e}
                </li>
              ))}
            </ul>
          </div>

          {/* SECTOR */}
          <div>
            <h2 className="text-lg font-semibold text-emerald-400 mb-1">Sector</h2>
            <p className="text-blue-300">{analytics.sector}</p>
          </div>

          {/* EMISSIONS */}
          <div>
            <h2 className="text-lg font-semibold text-emerald-400 mb-1">Emissions</h2>
            <p className="text-yellow-300 mb-1">{analytics.emissions.value}</p>
            {analytics.emissions.breakdown.map((item, i) => (
              <div key={i} className="flex justify-between text-gray-300 text-xs">
                <span>{item.label}</span>
                <span className="text-emerald-300">{item.amount}</span>
              </div>
            ))}
          </div>

          {/* CATEGORY */}
          <div>
            <h2 className="text-lg font-semibold text-emerald-400 mb-1">Category</h2>
            <span className={`px-3 py-1 rounded-lg text-black text-xs ${
              analytics.category === "High Impact"
                ? "bg-red-400"
                : analytics.category === "Medium Impact"
                ? "bg-yellow-400"
                : "bg-emerald-400"
            }`}>
              {analytics.category}
            </span>
          </div>

          {/* PIE CHART */}
          <div className="bg-black/40 p-3 rounded-xl border border-white/10">
            <h2 className="text-md font-semibold mb-2 text-emerald-400">Breakdown</h2>

            <PieChart width={220} height={220}>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
                activeIndex={activeIndex}
                activeShape={(props) => (
                  <g>
                    <text
                      x={props.cx}
                      y={props.cy}
                      dy={8}
                      textAnchor="middle"
                      fill="#fff"
                      className="text-sm"
                    >
                      {props.payload.name}
                    </text>
                    <Pie {...props} outerRadius={props.outerRadius + 8} />
                  </g>
                )}
                onMouseEnter={onPieEnter}
                onMouseLeave={onPieLeave}
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={COLORS[index % COLORS.length]}
                    stroke="#0f172a"
                    strokeWidth={2}
                    style={{ filter: "drop-shadow(0 0 4px rgba(255,255,255,0.2))" }}
                  />
                ))}
              </Pie>

              <Tooltip
                contentStyle={{
                  background: "#0f172a",
                  border: "1px solid #34d399",
                  borderRadius: "8px",
                  color: "white",
                  fontSize: "12px"
                }}
              />

              <Legend verticalAlign="bottom" iconType="circle" height={32} />
            </PieChart>
          </div>
        </div>

      </div>
    </div>
  );
}
