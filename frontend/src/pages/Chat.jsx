import { useEffect, useRef, useState } from "react";
import { PieChart, Pie, Cell, Legend } from "recharts";
import { useLocation } from "react-router-dom";

const API_BASE = import.meta.env.VITE_BACKEND_URL;

/**
 * Chat.jsx - corrected
 *
 * Key fixes:
 * - Do NOT display/push next_category or its next_question until post-category pipeline completes.
 * - Show the initial/current category in the right panel as soon as it's set (initial boot).
 * - Do NOT add pending next_category to detectedCategories until pipeline completes and we switch.
 * - Avoid pushing next_question to chat when it's the pending-next for the upcoming category.
 * - Keep refs + pipeline guard to avoid races / double-run in Strict Mode.
 * - Enhanced loading states for emissions, summary, and confidence backend calls
 */

export default function ChatPage() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const sessionId = params.get("session_id");

  // UI state
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [entities, setEntities] = useState([]);
  const [detectedCategories, setDetectedCategories] = useState([]); // only categories that have become 'current'
  const [pieData, setPieData] = useState([]);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pipelineLoading, setPipelineLoading] = useState(false);

  // granular backend-call loading flags (UI-only indicators)
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [emissionsLoading, setEmissionsLoading] = useState(false);
  const [confidenceLoading, setConfidenceLoading] = useState(false);

  // current category shown in right panel (initial category set on boot; subsequent categories set only after pipeline)
  const [currentCategory, setCurrentCategory] = useState(null);

  // refs
  const chatRef = useRef(null);
  const initDone = useRef(false);
  const messagesRef = useRef(messages);
  const currentCategoryRef = useRef(currentCategory);
  const pendingNextQuestionRef = useRef(null);
  const pendingNextCategoryRef = useRef(null);
  const pipelineRunningRef = useRef(false);

  // keep refs in sync
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  useEffect(() => {
    currentCategoryRef.current = currentCategory;
  }, [currentCategory]);

  // scroll to bottom on updates
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, entities, pieData]);

  // init once (Strict Mode safe)
  useEffect(() => {
    if (!sessionId) return;
    if (initDone.current) return;
    initDone.current = true;
    initSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const COLORS = [
    "#34d399",
    "#60a5fa",
    "#fbbf24",
    "#fb7185",
    "#a78bfa",
    "#f97316",
    "#60a5fa",
  ];

  // --------------------------
  // HTTP helper
  // --------------------------
  const postJSON = async (url, body) => {
    const res = await fetch(`${API_BASE}${url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`HTTP ${res.status}: ${txt}`);
    }
    return res.json();
  };

  // --------------------------
  // Message helpers
  // --------------------------
  const pushAssistant = (text) => {
    setMessages((p) => [...p, { role: "assistant", text }]);
  };
  const pushUser = (text) => {
    setMessages((p) => [...p, { role: "user", text }]);
  };

  // --------------------------
  // Entities / categories helpers
  // --------------------------
  const addEntities = (newIds) => {
    setEntities((prev) => {
      const set = new Set(prev);
      newIds.forEach((id) => set.add(id));
      return Array.from(set);
    });
  };
  // ONLY add to detectedCategories when category becomes current (initial or after pipeline)
  const addDetectedCategory = (cat) => {
    if (!cat) return;
    setDetectedCategories((prev) => {
      if (prev.includes(cat)) return prev;
      return [...prev, cat];
    });
  };

  // --------------------------
  // Init session: get initial next_question & next_category
  // --------------------------
  const initSession = async () => {
    if (!sessionId) return;
    try {
      setLoading(true);
      const resp = await postJSON("/chat/next", { session_id: sessionId });
      await processLLMResponse(resp);
    } catch (err) {
      console.error("initSession error:", err);
    } finally {
      setLoading(false);
    }
  };

  // --------------------------
  // Process /chat/next responses
  // Important: do not surface next_category/next_question for the upcoming category
  // until the post-category pipeline completes.
  // --------------------------
  const processLLMResponse = async (resp) => {
    const body = Array.isArray(resp) ? resp[0] || resp : resp;
    if (!body) return;

    const {
      next_question,
      category_complete,
      next_category,
      analysis_complete,
      extracted_fields,
      category: respCategory,
    } = body;

    // If we don't have a currentCategory yet, set it to next_category or body.category.
    // This is the initial boot behavior: show first category immediately.
    if (!currentCategoryRef.current) {
      const initialCat = next_category || respCategory || null;
      if (initialCat) {
        setCurrentCategory(initialCat);
        addDetectedCategory(initialCat); // show initial/current category immediately
      }
    }

    // Handle extracted fields (live)
    if (Array.isArray(extracted_fields) && extracted_fields.length) {
      const newEntities = [];
      extracted_fields.forEach((f) => {
        const eid = f.entity_id || f.entityId || f.entity || null;
        if (eid) newEntities.push(String(eid));
      });
      if (newEntities.length) addEntities(newEntities);
    }

    // If backend signals category_complete: this means the category we were answering is finished.
    // The backend may also return next_category & next_question (which belong to upcoming category).
    // We MUST NOT push the upcoming next_question to UI or mark next_category as detected yet.
    if (category_complete) {
      const finishedCategory = currentCategoryRef.current;

      // Save pending next category/question for later (do NOT add to detectedCategories)
      if (next_category) pendingNextCategoryRef.current = next_category;
      if (next_question) pendingNextQuestionRef.current = next_question;

      // Trigger pipeline for the finished category (if not already running)
      if (!pipelineRunningRef.current && finishedCategory) {
        runPostCategoryPipeline(finishedCategory, body.updated_missing_fields, body).catch(
          (e) => console.error("runPostCategoryPipeline error:", e)
        );
      }

      // Do not push next_question (it's for upcoming category) — saved as pending.
      return;
    }

    // Normal case: category not complete -> next_question belongs to the same category. Show it.
    if (next_question) {
      pushAssistant(next_question);
    }

    // Analysis complete handling (some responses might set it)
    if (analysis_complete) {
      setAnalysisComplete(true);
      pushAssistant("Analysis complete. No further questions.");
    }
  };

  // --------------------------
  // Get last assistant question
  // --------------------------
  const getLastAssistantQuestion = () => {
    const msgs = messagesRef.current || [];
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === "assistant") return msgs[i].text;
    }
    return "";
  };

  // --------------------------
  // sendMessage (user answer)
  // --------------------------
  const sendMessage = async () => {
    if (!input.trim()) return;
    const txt = input.trim();

    pushUser(txt);
    setInput("");

    try {
      setLoading(true);
      const lastQ = getLastAssistantQuestion();
      const payload = {
        session_id: sessionId,
        category: currentCategoryRef.current ?? "",
        question: lastQ,
        answer: txt,
      };
      const resp = await postJSON("/chat/next", payload);
      await processLLMResponse(resp);
    } catch (err) {
      console.error("sendMessage error:", err);
    } finally {
      setLoading(false);
    }
  };

  // --------------------------
  // Post-category pipeline
  // Steps: summary/update -> emissions/calculate -> confidence/check
  // Handle correction_note, and low-confidence retries (max 2).
  // Only after pipeline completes do we set currentCategory = pendingNextCategory
  // and push the pendingNextQuestion.
  // --------------------------
  const runPostCategoryPipeline = async (finishedCategory, updated_missing_fields, fullRespBody) => {
    if (pipelineRunningRef.current) return;
    pipelineRunningRef.current = true;
    setLoading(true);
    setPipelineLoading(true);

    try {
      // 1) summary/update (best-effort)
      try {
        setSummaryLoading(true);
        await postJSON("/summary/update", {
          session_id: sessionId,
          category: finishedCategory,
        });
      } catch (e) {
        console.warn("summary/update failed (continuing):", e);
      } finally {
        setSummaryLoading(false);
      }

      // helper to run emissions & confidence together
      const runEmissionsAndConfidence = async (correctionNote = null) => {
        let emResp = null;
        try {
          setEmissionsLoading(true);
          const pl = { session_id: sessionId, category: finishedCategory };
          if (correctionNote) pl.correction_note = correctionNote;
          emResp = await postJSON("/emissions/calculate", pl);
        } catch (e) {
          throw new Error("emissions/calculate failed: " + e.message);
        } finally {
          setEmissionsLoading(false);
        }

        // update pie data if present
        const rawEmissions = emResp?.raw_emissions ?? null;
        if (typeof rawEmissions === "number") {
          setPieData((prev) => {
            const found = prev.find((p) => p.name === finishedCategory);
            if (found) {
              return prev.map((p) => (p.name === finishedCategory ? { ...p, value: rawEmissions } : p));
            } else {
              return [...prev, { name: finishedCategory, value: rawEmissions }];
            }
          });
        }

        // confidence/check
        let confResp = null;
        try {
          setConfidenceLoading(true);
          confResp = await postJSON("/confidence/check", {
            session_id: sessionId,
            category: finishedCategory,
          });
        } catch (e) {
          throw new Error("confidence/check failed: " + e.message);
        } finally {
          setConfidenceLoading(false);
        }

        return { emResp, confResp };
      };

      // initial run
      let { emResp, confResp } = await runEmissionsAndConfidence(null);

      // if calculation_valid === false -> rerun with correction_note
      if (confResp && confResp.calculation_valid === false) {
        const correctionNote = confResp.correction_note || "";
        ({ emResp, confResp } = await runEmissionsAndConfidence(correctionNote));
      }

      // if confidence_final < 0.8, try rerunning prompt1 via /chat/next with missing_fields
      let rerunCount = 0;
      const MAX_RERUNS = 2;
      while (
        confResp &&
        typeof confResp.confidence_final === "number" &&
        confResp.confidence_final < 0.8 &&
        rerunCount < MAX_RERUNS
      ) {
        rerunCount += 1;
        const missing = confResp.missing_fields || [];

        try {
          const rerunPayload = {
            session_id: sessionId,
            category: finishedCategory,
            question: "", // force prompt1 rerun for the category with missing_fields
            answer: "",
            missing_fields: missing,
          };
          const rerunResp = await postJSON("/chat/next", rerunPayload);
          // This may push new assistant questions for the same (finished) category; process them.
          await processLLMResponse(rerunResp);
        } catch (e) {
          console.warn("Rerun prompt1 via /chat/next failed (continuing):", e);
        }

        // After rerun (and possibly user answers), re-run emissions+confidence
        const results = await runEmissionsAndConfidence(null);
        emResp = results.emResp;
        confResp = results.confResp;
      }

      // Pipeline finished for finishedCategory.
      // NOW we should switch to pendingNextCategory (if any) and push its question.
      const nextCat =
        pendingNextCategoryRef.current || (fullRespBody && fullRespBody.next_category) || null;

      if (nextCat) {
        // update currentCategory and mark as detected (now we show it on right panel)
        setCurrentCategory(nextCat);
        addDetectedCategory(nextCat);

        const pendingQ = pendingNextQuestionRef.current;
        if (pendingQ) {
          pushAssistant(pendingQ);
          pendingNextQuestionRef.current = null;
        } else {
          // Fetch next question explicitly if none pending
          try {
            const nextQResp = await postJSON("/chat/next", {
              session_id: sessionId,
              category: nextCat,
              question: "",
              answer: "",
            });
            await processLLMResponse(nextQResp);
          } catch (e) {
            console.warn("Failed to fetch next question for new category:", e);
          }
        }

        pendingNextCategoryRef.current = null;
      } else {
        // No next category; if there's a pending next question (rare), push it now
        if (pendingNextQuestionRef.current) {
          pushAssistant(pendingNextQuestionRef.current);
          pendingNextQuestionRef.current = null;
        }
      }
    } catch (err) {
      console.error("runPostCategoryPipeline error:", err);
    } finally {
      pipelineRunningRef.current = false;
      setLoading(false);
      setPipelineLoading(false);
      // ensure per-call loaders are off in case of unexpected early exit
      setSummaryLoading(false);
      setEmissionsLoading(false);
      setConfidenceLoading(false);
    }
  };

  // --------------------------
  // UI helpers
  // --------------------------
  const onKeyDown = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  const [activeIndex, setActiveIndex] = useState(-1);
  const onPieEnter = (_, index) => setActiveIndex(index);
  const onPieLeave = () => setActiveIndex(-1);

  // aggregate loader for UI display when any of the backend steps are running
  const anyPipelineCallLoading = summaryLoading || emissionsLoading || confidenceLoading || pipelineLoading;
  const activeCallNames = [
    summaryLoading ? "Summary" : null,
    emissionsLoading ? "Emissions" : null,
    confidenceLoading ? "Confidence" : null,
  ].filter(Boolean);

  // --------------------------
  // Render
  // --------------------------
  return (
    <div className="w-full min-h-screen bg-black text-white px-6 lg:px-14 py-10 overflow-x-hidden overflow-y-auto">
      {/* HEADER */}
      <header className="w-full flex items-center gap-4 mb-4">
        <img src="/images/logo.webp" className="w-10 h-10" alt="logo" />
        <h1 className="text-2xl font-bold tracking-tight text-emerald-400">
          EcoAgent <span className="text-[#f59e0b]">Chat</span>
        </h1>
      </header>

      {/* MAIN */}
      <div className="flex flex-col lg:flex-row gap-4 flex-grow lg:h-[calc(100%-70px)] overflow-visible">
        {/* CHAT PANEL */}
        <div className="flex-1 bg-white/5 border border-emerald-500/20 rounded-xl p-4 shadow-lg flex flex-col">
          <div ref={chatRef} className="flex-1 overflow-y-auto pr-2 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[75%] px-3 py-2 rounded-xl text-sm shadow
                  ${
                    msg.role === "user"
                      ? "bg-emerald-400 text-black"
                      : "bg-[#3b82f6]/20 text-blue-200 border border-blue-400/40"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {/* show processing indicator in chat when any pipeline calls are active */}
            {anyPipelineCallLoading && (
              <div className="flex items-center gap-2 text-xs text-gray-400 italic">
                <svg className="animate-spin h-4 w-4 text-emerald-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {pipelineLoading ? (
                  <span>Processing...</span>
                ) : (
                  <span>Processing: {activeCallNames.join(" • ")}</span>
                )}
              </div>
            )}

            {loading && !anyPipelineCallLoading && (
              <div className="text-xs text-gray-400 italic">Processing...</div>
            )}
          </div>

          {/* INPUT */}
          <div className="mt-3 flex bg-black/40 border border-emerald-500/30 p-2 rounded-xl">
            <input
              className="flex-1 bg-transparent outline-none px-2 text-emerald-200 text-sm"
              placeholder={analysisComplete ? "Analysis complete" : "Type your answer..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={analysisComplete || loading}
            />
            <button
              onClick={sendMessage}
              disabled={analysisComplete || loading}
              className="px-4 py-1.5 bg-emerald-500 text-black font-semibold rounded-lg text-sm shadow
                hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>

        {/* ANALYTICS PANEL */}
        <div className="w-full lg:w-[28%] bg-white/5 border border-emerald-500/20 rounded-xl p-4 shadow-lg space-y-4 text-sm max-h-none lg:max-h-full overflow-visible lg:overflow-y-auto relative">

          {/* PIPELINE LOADING OVERLAY: show when any of the pipeline steps are active */}
          {anyPipelineCallLoading && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center z-10">
              <svg className="animate-spin h-12 w-12 text-emerald-400 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <div className="text-emerald-400 font-semibold text-sm">{pipelineLoading ? "Calculating Emissions" : `Running ${activeCallNames.join(" & ")}`}</div>
              <div className="text-gray-400 text-xs mt-1">Running summary & confidence checks...</div>
            </div>
          )}

          {/* ENTITIES */}
          <div>
            <h2 className="text-lg font-semibold text-emerald-400 mb-1">Entities Detected</h2>
            <ul className="space-y-1">
              {entities.length === 0 && <li className="text-gray-400">No entities yet</li>}
              {entities.map((e, i) => (
                <li key={i} className="flex items-center gap-2 text-gray-300">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                  {e}
                </li>
              ))}
            </ul>
          </div>

          {/* CATEGORIES */}
          <div>
            <h2 className="text-lg font-semibold text-emerald-400 mb-1">Categories</h2>
            <div className="flex flex-wrap gap-2">
              {detectedCategories.length === 0 && <span className="text-gray-400">No categories yet</span>}
              {detectedCategories.map((c, i) => (
                <span
                  key={i}
                  className={`px-2 py-1 rounded text-xs ${
                    c === currentCategory ? "bg-emerald-400 text-black" : "bg-white/5 text-blue-200 border border-blue-400/20"
                  }`}
                >
                  {c}
                </span>
              ))}
            </div>
            {/* show active current category label if available (explicit) */}
            {currentCategory && (
              <div className="mt-2 text-xs text-gray-300">
                <strong>Active:</strong> {currentCategory}
              </div>
            )}
          </div>

          {/* PIE CHART */}
          <div className="bg-black/40 p-3 rounded-xl border border-white/10 overflow-visible">
            <h2 className="text-md font-semibold mb-2 text-emerald-400">Breakdown</h2>
            <div className="relative flex justify-center overflow-visible">
              <PieChart width={240} height={260} className="overflow-visible">
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="55%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  activeIndex={activeIndex}
                  onMouseEnter={onPieEnter}
                  onMouseLeave={onPieLeave}
                  activeShape={(props) => {
                    const { cx, cy, midAngle, outerRadius, fill, payload, value } = props;
                    const RAD = Math.PI / 180;
                    const sin = Math.sin(-midAngle * RAD);
                    const cos = Math.cos(-midAngle * RAD);
                    const POPUP_W = 90;
                    const POPUP_H = 40;
                    const BOX_W = 240;
                    const BOX_H = 260;
                    const offset = outerRadius + 20;
                    let popupX = cx + offset * cos;
                    let popupY = cy + offset * sin;
                    if (sin < -0.5) {
                      popupX = cx - POPUP_W / 2;
                      popupY = cy - outerRadius - 55;
                    } else if (sin > 0.5) {
                      popupX = cx - POPUP_W / 2;
                      popupY = cy + outerRadius + 10;
                    } else if (cos < 0) {
                      popupX = cx - outerRadius - POPUP_W - 10;
                      popupY = cy - POPUP_H / 2;
                    } else {
                      popupX = cx + outerRadius + 10;
                      popupY = cy - POPUP_H / 2;
                    }
                    popupX = Math.max(5, Math.min(popupX, BOX_W - POPUP_W - 5));
                    popupY = Math.max(5, Math.min(popupY, BOX_H - POPUP_H - 5));
                    return (
                      <g>
                        <circle cx={cx} cy={cy} r={outerRadius + 10} fill="none" stroke={fill} strokeWidth="6" opacity="0.45" />
                        <Pie {...props} outerRadius={outerRadius + 6} fill={fill} />
                        <foreignObject x={popupX} y={popupY} width={POPUP_W} height={POPUP_H} className="overflow-visible">
                          <div
                            className="bg-[#0f172a] text-white px-3 py-1 rounded-lg border border-emerald-400/40 shadow-xl text-xs"
                            style={{ textAlign: "center", whiteSpace: "nowrap" }}
                          >
                            <strong>{payload.name}</strong>
                            <div>{value}</div>
                          </div>
                        </foreignObject>
                      </g>
                    );
                  }}
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={COLORS[index % COLORS.length]}
                      stroke="#0f172a"
                      strokeWidth={2}
                      style={{ filter: "drop-shadow(0 0 4px rgba(255,255,255,0.28))" }}
                    />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" iconType="circle" height={32} />
              </PieChart>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}