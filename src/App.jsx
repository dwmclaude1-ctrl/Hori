import { useState, useRef, useEffect, useCallback } from "react";

// ─── Storage ──────────────────────────────────────────────────────────────────
const LS = {
  get: (k, fallback) => {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

function defaultDb() { return { 1: [], 2: [], 3: [], 4: [], 5: [] }; }
function defaultStats() {
  return {
    streak: 0, lastStudyDate: null, totalSessions: 0,
    sessionsPerLevel: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    graduatedLevels: [],
  };
}

const LEVELS = [1, 2, 3, 4, 5];
const LEVEL_META = {
  1: { label: "Level 1", sublabel: "Foundation",  accent: "#60a5fa", dim: "#1e3a5f", ring: "#1d4ed8", emoji: "🟦" },
  2: { label: "Level 2", sublabel: "Developing",  accent: "#34d399", dim: "#14452f", ring: "#15803d", emoji: "🟩" },
  3: { label: "Level 3", sublabel: "Competent",   accent: "#fbbf24", dim: "#4a3200", ring: "#b45309", emoji: "🟨" },
  4: { label: "Level 4", sublabel: "Proficient",  accent: "#f472b6", dim: "#4a1535", ring: "#be185d", emoji: "🟥" },
  5: { label: "Level 5", sublabel: "Advanced",    accent: "#a78bfa", dim: "#2e1a5e", ring: "#7c3aed", emoji: "🟪" },
};

const PDFJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

function todayStr() { return new Date().toISOString().slice(0, 10); }
function fmtTime(s) { const m = Math.floor(s / 60), sec = s % 60; return `${m}:${String(sec).padStart(2, "0")}`; }

function loadPDFJS() {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) { resolve(window.pdfjsLib); return; }
    const s = document.createElement("script");
    s.src = PDFJS_URL;
    s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER; resolve(window.pdfjsLib); };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// ─── Global watery styles ─────────────────────────────────────────────────────
const WATER_STYLES = `
  @keyframes waterFloat {
    0%,100% { transform: translateY(0px) rotate(0deg); }
    33%      { transform: translateY(-4px) rotate(0.4deg); }
    66%      { transform: translateY(2px) rotate(-0.3deg); }
  }
  @keyframes ripple {
    0%   { transform: scale(0.85); opacity: 0.7; }
    60%  { transform: scale(1.08); opacity: 0.15; }
    100% { transform: scale(1.18); opacity: 0; }
  }
  @keyframes liquidBorder {
    0%,100% { border-radius: 14px 16px 13px 15px / 15px 13px 16px 14px; }
    25%      { border-radius: 16px 12px 15px 14px / 13px 16px 14px 15px; }
    50%      { border-radius: 13px 15px 16px 12px / 16px 14px 13px 15px; }
    75%      { border-radius: 15px 14px 12px 16px / 14px 15px 16px 13px; }
  }
  @keyframes waveScan {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  @keyframes toastRise {
    0%   { opacity: 0; transform: translateX(-50%) translateY(14px) scale(0.94); filter: blur(3px); }
    60%  { transform: translateX(-50%) translateY(-2px) scale(1.02); filter: blur(0); opacity: 1; }
    100% { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; }
  }
  @keyframes flowIn {
    0%   { opacity: 0; transform: translateY(18px); filter: blur(4px); }
    100% { opacity: 1; transform: translateY(0); filter: blur(0); }
  }
  @keyframes modalSwell {
    0%   { opacity: 0; transform: scale(0.93) translateY(10px); filter: blur(6px); }
    65%  { transform: scale(1.015) translateY(-1px); }
    100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
  }
  @keyframes selPulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(120,100,255,0.5), 0 0 12px 0 rgba(100,80,255,0.15); }
    50%      { box-shadow: 0 0 0 6px rgba(120,100,255,0), 0 0 28px 4px rgba(100,80,255,0.25); }
  }
  @keyframes captureRipple {
    0%   { opacity: 0.5; transform: scale(0.96); filter: blur(0px); }
    100% { opacity: 0; transform: scale(1.04); filter: blur(8px); }
  }
  @keyframes cornerFlow {
    0%   { transform: scale(0) rotate(-20deg); opacity: 0; }
    65%  { transform: scale(1.2) rotate(3deg); opacity: 1; }
    100% { transform: scale(1) rotate(0deg); opacity: 1; }
  }
  @keyframes streakBob {
    0%,100% { transform: scale(1) rotate(-2deg); }
    50%      { transform: scale(1.12) rotate(2deg); }
  }
  @keyframes barFill {
    0%   { width: 0%; opacity: 0.3; }
    100% { opacity: 1; }
  }
  @keyframes softGlow {
    0%,100% { opacity: 0.7; }
    50%      { opacity: 1; }
  }

  .water-btn {
    transition: transform 0.45s cubic-bezier(0.34,1.56,0.64,1),
                background 0.35s cubic-bezier(0.25,0.46,0.45,0.94),
                border-color 0.35s cubic-bezier(0.25,0.46,0.45,0.94),
                box-shadow 0.4s cubic-bezier(0.25,0.46,0.45,0.94),
                color 0.3s ease !important;
  }
  .water-btn:hover {
    transform: translateY(-2px) scale(1.03) !important;
    box-shadow: 0 6px 24px rgba(100,80,200,0.2) !important;
  }
  .water-btn:active {
    transform: translateY(1px) scale(0.97) !important;
    transition-duration: 0.12s !important;
  }
  .water-card {
    transition: transform 0.5s cubic-bezier(0.34,1.56,0.64,1),
                border-color 0.4s ease,
                box-shadow 0.5s ease !important;
  }
  .water-card:hover {
    transform: translateY(-3px) !important;
    box-shadow: 0 12px 40px rgba(80,60,180,0.18) !important;
  }
  .sel-box {
    position: absolute;
    border: 1.5px solid rgba(140,120,255,0.85);
    border-radius: 4px;
    background: rgba(100,80,240,0.07);
    pointer-events: none;
    animation: selPulse 2s ease-in-out infinite;
    backdrop-filter: brightness(1.03) saturate(1.1);
  }
  .sel-corner {
    position: absolute;
    width: 7px; height: 7px;
    background: #b0a0ff;
    border-radius: 2px;
    animation: cornerFlow 0.22s cubic-bezier(.34,1.56,.64,1) both;
  }
  .flow-in { animation: flowIn 0.55s cubic-bezier(0.25,0.46,0.45,0.94) both; }
  .water-float { animation: waterFloat 5s ease-in-out infinite; }
`;

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      position: "fixed", bottom: "32px", left: "50%",
      background: "linear-gradient(135deg, #f0ebe0 0%, #e8e2d8 100%)",
      color: "#111", padding: "10px 22px", borderRadius: "999px",
      fontSize: "13px", fontWeight: "600",
      boxShadow: "0 4px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)",
      zIndex: 9999, pointerEvents: "none", whiteSpace: "nowrap",
      animation: "toastRise 0.5s cubic-bezier(0.34,1.56,0.64,1) both",
    }}>{msg}</div>
  );
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────
function Lightbox({ images, index, onClose, onNav }) {
  useEffect(() => {
    if (index === null) return;
    const h = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onNav(-1);
      if (e.key === "ArrowRight") onNav(1);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [index]);
  if (index === null || !images?.[index]) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div onClick={e => e.stopPropagation()} style={{ position: "relative", maxWidth: "96vw" }}>
        <img src={images[index]} alt="" style={{ maxWidth: "92vw", maxHeight: "84vh", borderRadius: "10px", objectFit: "contain", display: "block" }} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px", gap: "12px" }}>
          <button onClick={() => onNav(-1)} disabled={index === 0} style={{ background: "#1a1a28", border: "none", color: index === 0 ? "#333" : "#ccc", padding: "8px 20px", borderRadius: "8px", cursor: index === 0 ? "default" : "pointer", fontFamily: "inherit", fontSize: "13px" }}>← Prev</button>
          <span style={{ color: "#555", fontSize: "13px", alignSelf: "center" }}>{index + 1} / {images.length}</span>
          <button onClick={() => onNav(1)} disabled={index === images.length - 1} style={{ background: "#1a1a28", border: "none", color: index === images.length - 1 ? "#333" : "#ccc", padding: "8px 20px", borderRadius: "8px", cursor: index === images.length - 1 ? "default" : "pointer", fontFamily: "inherit", fontSize: "13px" }}>Next →</button>
        </div>
        <button onClick={onClose} style={{ position: "absolute", top: "-14px", right: "-14px", background: "#2a2a38", border: "none", color: "#fff", borderRadius: "50%", width: "30px", height: "30px", cursor: "pointer", fontSize: "15px" }}>✕</button>
      </div>
    </div>
  );
}

// ─── Timer ────────────────────────────────────────────────────────────────────
function Timer({ running, onStop }) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSecs(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "#12121e", border: "1px solid #2a2a3a", borderRadius: "10px", padding: "8px 16px" }}>
      <span style={{ fontSize: "11px", color: "#5050a0", letterSpacing: "1px", textTransform: "uppercase" }}>Timer</span>
      <span style={{ fontFamily: "monospace", fontSize: "18px", color: "#a0a0e0", fontWeight: "700", letterSpacing: "2px" }}>{fmtTime(secs)}</span>
      <button onClick={() => onStop(secs)} style={{ background: "#1e1e30", border: "1px solid #3a3a58", color: "#7070b0", padding: "3px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontFamily: "inherit" }}>Done</button>
    </div>
  );
}

// ─── PDF Page renderer with 2D box crop selection ────────────────────────────
function PDFPageCropper({ pageDataURL, pageNum, totalPages, onCrop, onPrev, onNext, pdfName }) {
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const [selecting, setSelecting] = useState(false);
  const [pdfZoom, setPdfZoom] = useState(0.6);
  const [start, setStart] = useState(null);   // { x, y } in 0–1 fractions
  const [current, setCurrent] = useState(null); // { x, y }
  const [imgDims, setImgDims] = useState(null);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (!pageDataURL || !canvasRef.current) return;
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      setImgDims({ width: img.width, height: img.height });
    };
    img.src = pageDataURL;
  }, [pageDataURL]);

  const getPos = (e, el) => {
    const rect = el.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    };
  };

  const onMouseDown = (e) => {
    e.preventDefault();
    const pos = getPos(e, overlayRef.current);
    setStart(pos);
    setCurrent(pos);
    setSelecting(true);
  };

  const onMouseMove = useCallback((e) => {
    if (!selecting) return;
    e.preventDefault();
    setCurrent(getPos(e, overlayRef.current));
  }, [selecting]);

  const onMouseUp = useCallback(async (e) => {
    if (!selecting || !start) return;
    e.preventDefault();
    setSelecting(false);

    const x1 = Math.min(start.x, current.x);
    const x2 = Math.max(start.x, current.x);
    const y1 = Math.min(start.y, current.y);
    const y2 = Math.max(start.y, current.y);

    // Too small — cancel
    if (x2 - x1 < 0.02 || y2 - y1 < 0.01) {
      setStart(null); setCurrent(null); return;
    }

    // Flash animation on capture
    setFlash(true);
    setTimeout(() => setFlash(false), 350);

    const canvas = canvasRef.current;
    if (!canvas || !imgDims) return;

    const cropX = Math.floor(x1 * imgDims.width);
    const cropY = Math.floor(y1 * imgDims.height);
    const cropW = Math.ceil((x2 - x1) * imgDims.width);
    const cropH = Math.ceil((y2 - y1) * imgDims.height);

    const out = document.createElement("canvas");
    out.width = Math.max(cropW, 1);
    out.height = Math.max(cropH, 1);
    const ctx = out.getContext("2d");
    ctx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    const dataURL = out.toDataURL("image/jpeg", 0.93);

    setStart(null); setCurrent(null);
    onCrop(dataURL);
  }, [selecting, start, current, imgDims, onCrop]);

  // Compute selection box in % for positioning
  const selBox = start && current ? {
    left:   `${Math.min(start.x, current.x) * 100}%`,
    top:    `${Math.min(start.y, current.y) * 100}%`,
    width:  `${Math.abs(current.x - start.x) * 100}%`,
    height: `${Math.abs(current.y - start.y) * 100}%`,
  } : null;

  const selActive = selBox && parseFloat(selBox.width) > 0.5 && parseFloat(selBox.height) > 0.5;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <style>{`
        @keyframes captureFlash {
          0%   { opacity: 0; transform: scale(0.98); }
          30%  { opacity: 0.32; transform: scale(1.0); }
          100% { opacity: 0; transform: scale(1.03); filter: blur(4px); }
        }
      `}</style>

      {/* Top nav bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", background: "#0f0f18", borderBottom: "1px solid #1e1e2e", flexShrink: 0 }}>
        <div style={{ fontSize: "13px", color: "#6060a0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "200px" }}>
          📄 {pdfName}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button onClick={onPrev} disabled={pageNum <= 1} style={{ background: pageNum <= 1 ? "#0c0c14" : "#1a1a2a", border: "1px solid #2a2a3a", color: pageNum <= 1 ? "#2a2a3a" : "#8080c0", padding: "5px 12px", borderRadius: "6px", cursor: pageNum <= 1 ? "default" : "pointer", fontSize: "13px", fontFamily: "inherit", transition: "all 0.15s" }}>← Prev</button>
          <span style={{ fontSize: "13px", color: "#5050a0", minWidth: "70px", textAlign: "center" }}>Page {pageNum} / {totalPages}</span>
          <button onClick={onNext} disabled={pageNum >= totalPages} style={{ background: pageNum >= totalPages ? "#0c0c14" : "#1a1a2a", border: "1px solid #2a2a3a", color: pageNum >= totalPages ? "#2a2a3a" : "#8080c0", padding: "5px 12px", borderRadius: "6px", cursor: pageNum >= totalPages ? "default" : "pointer", fontSize: "13px", fontFamily: "inherit", transition: "all 0.15s" }}>Next →</button>
        </div>
      </div>

      {/* Instruction */}
      <div style={{ padding: "8px 16px", background: "#0a0a12", borderBottom: "1px solid #1a1a28", flexShrink: 0 }}>
        <p style={{ margin: 0, fontSize: "12px", color: "#4a4a7a", textAlign: "center" }}>
          ✂ <strong style={{ color: "#6060a0" }}>Click and drag</strong> to draw a box around a question — it will be cropped automatically
        </p>
      </div>

      {/* Page canvas area */}
      <div style={{ flex: 1, overflow: "auto", position: "relative", background: "#060608" }}>
        <div style={{ position: "relative", display: "inline-block", width: "100%", userSelect: "none" }}>
          <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "auto" }} />

          {/* Capture ripple overlay */}
          {flash && (
            <div style={{
              position: "absolute", inset: 0,
              background: "radial-gradient(ellipse at center, rgba(140,120,255,0.3) 0%, rgba(80,60,200,0.08) 70%, transparent 100%)",
              pointerEvents: "none",
              animation: "captureFlash 0.5s cubic-bezier(0.25,0.46,0.45,0.94) forwards",
            }} />
          )}

          {/* Drag overlay */}
          <div
            ref={overlayRef}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onTouchStart={onMouseDown}
            onTouchMove={onMouseMove}
            onTouchEnd={onMouseUp}
            style={{ position: "absolute", inset: 0, cursor: "crosshair" }}
          >
            {/* Selection box with animated corners */}
            {selActive && (
              <div className="sel-box" style={selBox}>
                {/* corners */}
                <span className="sel-corner" style={{ top: -3, left: -3 }} />
                <span className="sel-corner" style={{ top: -3, right: -3 }} />
                <span className="sel-corner" style={{ bottom: -3, left: -3 }} />
                <span className="sel-corner" style={{ bottom: -3, right: -3 }} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Crop Confirm Modal ───────────────────────────────────────────────────────
function CropModal({ cropDataURL, onSave, onDiscard, pendingLabel, setPendingLabel, pendingMarks, setPendingMarks }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", backdropFilter: "blur(4px)", animation: "flowIn 0.3s ease both" }}>
      <div style={{ background: "#0f0f1a", border: "1px solid #2a2a3e", borderRadius: "16px", width: "100%", maxWidth: "520px", overflow: "hidden", animation: "modalSwell 0.45s cubic-bezier(0.34,1.56,0.64,1) both" }}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid #1e1e2e" }}>
          <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "700", color: "#f0ebe0" }}>Save this crop?</h3>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#4a4a6a" }}>Choose a stack level — it'll be saved there instantly.</p>
        </div>

        {/* Preview */}
        <div style={{ background: "#fff", maxHeight: "260px", overflow: "auto" }}>
          <img src={cropDataURL} alt="crop" style={{ width: "100%", display: "block" }} />
        </div>

        {/* Label + marks */}
        <div style={{ padding: "16px 22px", display: "grid", gridTemplateColumns: "1fr 90px", gap: "10px" }}>
          <div>
            <label style={{ fontSize: "11px", color: "#4a4a6a", letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: "5px" }}>Label (optional)</label>
            <input
              value={pendingLabel}
              onChange={e => setPendingLabel(e.target.value)}
              placeholder="e.g. Q15(ii) – Integration"
              style={{ background: "#12121a", border: "1px solid #2e2e3e", borderRadius: "8px", color: "#e8e4dc", padding: "8px 12px", fontFamily: "inherit", fontSize: "13px", outline: "none", width: "100%", boxSizing: "border-box" }}
            />
          </div>
          <div>
            <label style={{ fontSize: "11px", color: "#4a4a6a", letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: "5px" }}>Marks</label>
            <input
              type="number"
              value={pendingMarks}
              onChange={e => setPendingMarks(e.target.value)}
              placeholder="3"
              style={{ background: "#12121a", border: "1px solid #2e2e3e", borderRadius: "8px", color: "#e8e4dc", padding: "8px 12px", fontFamily: "inherit", fontSize: "13px", outline: "none", width: "100%", boxSizing: "border-box" }}
            />
          </div>
        </div>

        {/* Level buttons */}
        <div style={{ padding: "0 22px 16px" }}>
          <p style={{ margin: "0 0 10px", fontSize: "12px", color: "#4a4a6a", letterSpacing: "0.5px", textTransform: "uppercase" }}>Save to stack:</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px" }}>
            {LEVELS.map(l => {
              const m = LEVEL_META[l];
              return (
                <button key={l} onClick={() => onSave(l)}
                  className="water-btn"
                  style={{
                  background: m.dim, border: `1.5px solid ${m.accent}`, color: m.accent,
                  padding: "12px 6px", borderRadius: "10px", cursor: "pointer",
                  fontFamily: "inherit", fontWeight: "700", fontSize: "14px",
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = m.accent; e.currentTarget.style.color = "#000"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = m.dim; e.currentTarget.style.color = m.accent; }}
                >
                  L{l}
                  <div style={{ fontSize: "9px", fontWeight: "400", marginTop: "2px", opacity: 0.7 }}>{m.sublabel}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Discard */}
        <div style={{ padding: "0 22px 18px" }}>
          <button onClick={onDiscard} className="water-btn" style={{ width: "100%", background: "none", border: "1px solid #2a2a3a", color: "#5a5a7a", padding: "9px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontFamily: "inherit" }}>
            ✕ Discard and keep cropping
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [db, setDb] = useState(() => LS.get("hstack_db", defaultDb()));
  const [stats, setStats] = useState(() => LS.get("hstack_stats", defaultStats()));
  const [page, setPage] = useState("home");
  const [toast, setToast] = useState("");
  const [lbImgs, setLbImgs] = useState([]);
  const [lbIdx, setLbIdx] = useState(null);

  // PDF screenshotter state
  const [pdfPages, setPdfPages] = useState([]);   // array of dataURLs per page
  const [pdfName, setPdfName] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pendingCrop, setPendingCrop] = useState(null); // dataURL awaiting level selection
  const [pendingLabel, setPendingLabel] = useState("");
  const [pendingMarks, setPendingMarks] = useState("");

  // Practice state
  const [practiceSet, setPracticeSet] = useState(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [sessionNote, setSessionNote] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);

  const [showStats, setShowStats] = useState(false);
  const pdfInputRef = useRef();
  const importRef = useRef();

  const persistDb = (d) => { setDb(d); LS.set("hstack_db", d); };
  const persistStats = (s) => { setStats(s); LS.set("hstack_stats", s); };

  const showToast = useCallback((msg) => { setToast(msg); setTimeout(() => setToast(""), 2600); }, []);
  const openLb = (imgs, idx) => { setLbImgs(imgs); setLbIdx(idx); };
  const navLb = (dir) => setLbIdx(i => Math.max(0, Math.min(lbImgs.length - 1, i + dir)));

  // ── Streak ──────────────────────────────────────────────────────────────────
  const recordStudySession = useCallback((level) => {
    const today = todayStr();
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    setStats(prev => {
      const s = { ...prev };
      s.sessionsPerLevel = { ...s.sessionsPerLevel, [level]: (s.sessionsPerLevel[level] || 0) + 1 };
      s.totalSessions = (s.totalSessions || 0) + 1;
      if (s.lastStudyDate === today) {
        // already counted
      } else if (s.lastStudyDate === yesterday) {
        s.streak = (s.streak || 0) + 1;
      } else {
        s.streak = 1;
      }
      s.lastStudyDate = today;
      const updated = { ...defaultStats(), ...s };
      LS.set("hstack_stats", updated);
      return updated;
    });
  }, []);

  const toggleGraduate = (level) => {
    const s = { ...stats };
    const gl = s.graduatedLevels || [];
    s.graduatedLevels = gl.includes(level) ? gl.filter(l => l !== level) : [...gl, level];
    persistStats(s);
    showToast(s.graduatedLevels.includes(level) ? `🎓 Graduated Level ${level}!` : `Unmarked Level ${level}`);
  };

  // ── PDF Load ─────────────────────────────────────────────────────────────────
  const loadPDF = async (file) => {
    if (!file || file.type !== "application/pdf") { showToast("Please select a PDF."); return; }
    setPdfLoading(true);
    setPdfPages([]);
    setPdfName(file.name.replace(/\.pdf$/i, ""));
    try {
      const pdfjsLib = await loadPDFJS();
      const buf = await file.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: buf }).promise;
      const pages = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const pg = await doc.getPage(i);
        const viewport = pg.getViewport({ scale: 2.0 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await pg.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
        pages.push(canvas.toDataURL("image/jpeg", 0.92));
      }
      setPdfPages(pages);
      setCurrentPage(1);
      setPage("pdfCrop");
    } catch (e) {
      showToast("Failed to load PDF: " + (e.message || "unknown error"));
    }
    setPdfLoading(false);
  };

  // ── Crop handling ────────────────────────────────────────────────────────────
  const handleCrop = (dataURL) => {
    setPendingCrop(dataURL);
    setPendingLabel("");
    setPendingMarks("");
  };

  const saveCropToLevel = (level) => {
    if (!pendingCrop) return;
    const entry = {
      id: Date.now(),
      label: pendingLabel.trim() || `${pdfName} — Page ${currentPage}`,
      images: [pendingCrop],
      notes: "",
      marks: pendingMarks ? parseInt(pendingMarks, 10) : null,
      created: new Date().toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }),
      level,
      sessionLogs: [],
    };
    const newDb = { ...db, [level]: [...(db[level] || []), entry] };
    persistDb(newDb);
    setPendingCrop(null);
    showToast(`✓ Saved to Level ${level}`);
  };

  const deleteSet = (level, id) => {
    persistDb({ ...db, [level]: db[level].filter(e => e.id !== id) });
  };

  // ── Practice ─────────────────────────────────────────────────────────────────
  const pickRandom = (level) => {
    const sets = db[level] || [];
    if (!sets.length) { showToast(`No sets in Level ${level} yet.`); return; }
    const pick = sets[Math.floor(Math.random() * sets.length)];
    setPracticeSet(pick);
    setSessionNote("");
    setShowNoteInput(false);
    setTimerRunning(true);
    recordStudySession(level);
    setPage("practiceView");
  };

  const logSession = (secs) => {
    setTimerRunning(false);
    const log = { date: new Date().toLocaleDateString("en-AU", { day: "numeric", month: "short" }), time: fmtTime(secs), note: sessionNote };
    const newDb = {
      ...db,
      [practiceSet.level]: db[practiceSet.level].map(e =>
        e.id === practiceSet.id ? { ...e, sessionLogs: [...(e.sessionLogs || []), log] } : e
      ),
    };
    persistDb(newDb);
    setShowNoteInput(false);
    showToast("Session logged ✓");
  };

  // ── Export / Import ──────────────────────────────────────────────────────────
  const exportBackup = () => {
    const blob = new Blob([JSON.stringify({ db, stats, exportedAt: new Date().toISOString() })], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `hstack-backup-${todayStr()}.json`; a.click();
    showToast("Backup downloaded ✓");
  };

  const importBackup = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed.db) throw new Error();
      persistDb(parsed.db);
      if (parsed.stats) persistStats(parsed.stats);
      showToast("Backup restored ✓");
    } catch { showToast("Invalid backup file."); }
    e.target.value = "";
  };

  // ─────────────────────────────────────────────────────────────────────────────
  const totalSets = LEVELS.reduce((s, l) => s + (db[l]?.length || 0), 0);
  const isGraduated = (l) => (stats.graduatedLevels || []).includes(l);

  const P    = { minHeight: "100svh", background: "#0a0a0f", fontFamily: "'Georgia','Times New Roman',serif", color: "#e8e4dc" };
  const HDR  = { borderBottom: "1px solid #1e1e28", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0a0a0f", position: "sticky", top: 0, zIndex: 10 };
  const WRAP = { maxWidth: "820px", margin: "0 auto", padding: "36px 20px 100px" };
  const BACK = { background: "none", border: "1px solid #2e2e3e", color: "#7070a0", padding: "7px 16px", borderRadius: "7px", cursor: "pointer", fontSize: "13px", fontFamily: "inherit" };
  const SEC  = { fontSize: "11px", color: "#5a5a7a", marginBottom: "6px", letterSpacing: "0.5px", textTransform: "uppercase", display: "block" };

  // ── PDF CROP PAGE ─────────────────────────────────────────────────────────────
  if (page === "pdfCrop") {
    return (
      <div style={{ ...P, display: "flex", flexDirection: "column", height: "100svh" }}>
        <style>{WATER_STYLES}</style>
        <Toast msg={toast} />
        {pendingCrop && (
          <CropModal
            cropDataURL={pendingCrop}
            onSave={saveCropToLevel}
            onDiscard={() => setPendingCrop(null)}
            pendingLabel={pendingLabel}
            setPendingLabel={setPendingLabel}
            pendingMarks={pendingMarks}
            setPendingMarks={setPendingMarks}
          />
        )}
        {/* Top action bar */}
        <div style={{ borderBottom: "1px solid #1e1e28", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0a0a0f", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              onClick={() => pdfInputRef.current.click()}
              className="water-btn"
              style={{ background: "#1a1a2a", border: "1px solid #3a3a5a", color: "#8080c0", padding: "6px 14px", borderRadius: "7px", cursor: "pointer", fontSize: "12px", fontFamily: "inherit" }}
            >
              📄 New PDF
            </button>
            <input ref={pdfInputRef} type="file" accept="application/pdf" style={{ display: "none" }} onChange={e => { const f = e.target.files[0]; if (f) loadPDF(f); e.target.value = ""; }} />
            <span style={{ fontSize: "11px", color: "#3a3a5a" }}>|</span>
            <span style={{ fontSize: "12px", color: "#4a4a7a" }}>
              {LEVELS.map(l => `L${l}: ${db[l]?.length || 0}`).join("  ·  ")}
            </span>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => setPage("browse")} style={{ background: "none", border: "1px solid #2a2a3a", color: "#5050a0", padding: "6px 14px", borderRadius: "7px", cursor: "pointer", fontSize: "12px", fontFamily: "inherit" }}>
              Browse stacks
            </button>
            <button onClick={() => setPage("home")} style={{ background: "none", border: "1px solid #2e2e3e", color: "#5050a0", padding: "6px 14px", borderRadius: "7px", cursor: "pointer", fontSize: "12px", fontFamily: "inherit" }}>
              ← Home
            </button>
          </div>
        </div>

        {/* PDF viewer */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          {pdfPages.length > 0 ? (
            <PDFPageCropper
              pageDataURL={pdfPages[currentPage - 1]}
              zoom={pdfZoom}
              pageNum={currentPage}
              totalPages={pdfPages.length}
              onCrop={handleCrop}
              onPrev={() => setCurrentPage(p => Math.max(1, p - 1))}
              onNext={() => setCurrentPage(p => Math.min(pdfPages.length, p + 1))}
              pdfName={pdfName}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "16px" }}>
              {pdfLoading ? (
                <>
                  <div style={{ width: "40px", height: "40px", border: "3px solid #1e1e2e", borderTop: "3px solid #6060c0", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  <p style={{ color: "#5050a0", fontSize: "14px", margin: 0 }}>Rendering PDF…</p>
                </>
              ) : (
                <>
                  <p style={{ color: "#5050a0", fontSize: "16px", margin: 0 }}>No PDF loaded</p>
                  <button onClick={() => pdfInputRef.current.click()} style={{ background: "#1a1a2e", border: "1.5px solid #4040a0", color: "#8080d0", padding: "10px 24px", borderRadius: "10px", cursor: "pointer", fontSize: "14px", fontFamily: "inherit" }}>
                    📄 Upload a past paper PDF
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── BROWSE STACKS (replaces old submit page's saved sets section) ─────────────
  if (page === "browse") {
    return (
      <div style={P}>
        <style>{WATER_STYLES}</style>
        <Toast msg={toast} />
        <Lightbox images={lbImgs} index={lbIdx} onClose={() => setLbIdx(null)} onNav={navLb} />
        <div style={HDR}>
          <span style={{ fontSize: "16px", fontWeight: "700", color: "#f0ebe0" }}>⬡ All Stacks</span>
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="water-btn" style={BACK} onClick={() => setPage("pdfCrop")}>✂ Crop PDF</button>
            <button className="water-btn" style={BACK} onClick={() => setPage("home")}>← Home</button>
          </div>
        </div>
        <div style={WRAP}>
          <h2 style={{ fontSize: "28px", fontWeight: "700", margin: "0 0 24px", color: "#f0ebe0", letterSpacing: "-1px" }}>Saved stacks</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {LEVELS.map((l, li) => {
              const m = LEVEL_META[l]; const sets = db[l] || [];
              return (
                <div key={l} className="flow-in" style={{ background: "#0c0c14", border: "1px solid #1a1a28", borderRadius: "12px", overflow: "hidden", animationDelay: `${li * 0.07}s` }}>
                  <div style={{ padding: "12px 18px", borderBottom: "1px solid #1a1a28", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "11px", fontWeight: "700", background: m.dim, color: m.accent, borderRadius: "4px", padding: "2px 9px" }}>LEVEL {l}</span>
                      <span style={{ fontSize: "12px", color: "#4a4a6a" }}>{m.sublabel}</span>
                      {isGraduated(l) && <span style={{ fontSize: "12px" }}>🎓</span>}
                    </div>
                    <span style={{ fontSize: "12px", color: "#3a3a5a" }}>{sets.length} saved</span>
                  </div>
                  {sets.length === 0 && <p style={{ padding: "13px 18px", color: "#2e2e4a", fontSize: "13px", margin: 0 }}>No sets yet.</p>}
                  {sets.map((entry, i) => (
                    <div key={entry.id} style={{ padding: "12px 18px", borderBottom: i < sets.length - 1 ? "1px solid #141420" : "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                          {entry.images.slice(0, 3).map((src, j) => (
                            <img key={j} src={src} alt="" onClick={() => openLb(entry.images, j)}
                              className="water-btn"
                              style={{ width: "48px", height: "38px", objectFit: "cover", borderRadius: "4px", border: "1px solid #2a2a3a", cursor: "pointer", background: "#fff" }} />
                          ))}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "14px", fontWeight: "600", color: "#d0ccc0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{entry.label}</div>
                          <div style={{ fontSize: "11px", color: "#3a3a5a", marginTop: "2px" }}>
                            {entry.created}{entry.marks ? ` · ${entry.marks}m` : ""}{entry.sessionLogs?.length ? ` · ${entry.sessionLogs.length} session${entry.sessionLogs.length !== 1 ? "s" : ""}` : ""}
                          </div>
                        </div>
                        <button onClick={() => { if (window.confirm(`Delete "${entry.label}"?`)) deleteSet(l, entry.id); }}
                          className="water-btn"
                          style={{ background: "#1a0e0e", border: "1px solid #4a1818", color: "#f87171", padding: "4px 11px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontFamily: "inherit", flexShrink: 0 }}>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── PRACTICE — level select ───────────────────────────────────────────────────
  if (page === "practice") return (
    <div style={P}>
      <style>{WATER_STYLES}</style>
      <Toast msg={toast} />
      <div style={HDR}>
        <span style={{ fontSize: "16px", fontWeight: "700", color: "#f0ebe0" }}>⬡ Do Stacks</span>
        <button className="water-btn" style={BACK} onClick={() => setPage("home")}>← Home</button>
      </div>
      <div style={WRAP}>
        <h2 style={{ fontSize: "28px", fontWeight: "700", margin: "0 0 6px", color: "#f0ebe0", letterSpacing: "-1px" }}>Choose a level</h2>
        <p style={{ color: "#4a4a6a", fontSize: "14px", margin: "0 0 30px" }}>A random set from that level will be picked.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {LEVELS.map((l, li) => {
            const m = LEVEL_META[l]; const count = db[l]?.length || 0; const empty = count === 0; const grad = isGraduated(l);
            return (
              <button key={l} onClick={() => pickRandom(l)} disabled={empty}
                className={empty ? "" : "water-card water-btn"}
                style={{
                background: empty ? "#0c0c14" : "#10101c", border: `1.5px solid ${empty ? "#1a1a28" : m.dim}`,
                borderRadius: "14px", padding: "20px 22px", cursor: empty ? "default" : "pointer",
                display: "flex", alignItems: "center", gap: "16px", fontFamily: "inherit",
                textAlign: "left", opacity: empty ? 0.4 : 1,
                animation: `flowIn 0.5s cubic-bezier(0.25,0.46,0.45,0.94) ${li * 0.07}s both`,
              }}
                onMouseEnter={e => { if (!empty) { e.currentTarget.style.borderColor = m.accent; e.currentTarget.style.background = m.dim; }}}
                onMouseLeave={e => { if (!empty) { e.currentTarget.style.borderColor = m.dim; e.currentTarget.style.background = "#10101c"; }}}
              >
                <div style={{ width: "48px", height: "48px", borderRadius: "11px", background: empty ? "#14141e" : m.dim, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "transform 0.4s cubic-bezier(0.34,1.56,0.64,1)" }}>
                  <span style={{ fontSize: "20px", fontWeight: "800", color: empty ? "#2a2a3a" : m.accent }}>L{l}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "16px", fontWeight: "700", color: empty ? "#2a2a3a" : "#e0dcd4", display: "flex", alignItems: "center", gap: "7px" }}>
                    {m.label} · {m.sublabel} {grad && <span style={{ fontSize: "14px" }}>🎓</span>}
                  </div>
                  <div style={{ fontSize: "12px", color: empty ? "#1e1e30" : "#4a4a6a", marginTop: "2px" }}>
                    {empty ? "No sets yet" : `${count} set${count !== 1 ? "s" : ""} — tap for a random one`}
                  </div>
                </div>
                {!empty && <span style={{ fontSize: "20px", color: m.accent, transition: "transform 0.4s cubic-bezier(0.34,1.56,0.64,1)" }}>→</span>}
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: "28px", background: "#0c0c14", border: "1px solid #1a1a28", borderRadius: "12px", padding: "18px" }}>
          <div style={{ fontSize: "12px", color: "#4a4a6a", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: "14px" }}>Graduate a level</div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {LEVELS.map(l => {
              const m = LEVEL_META[l]; const grad = isGraduated(l);
              return (
                <button key={l} onClick={() => toggleGraduate(l)} className="water-btn" style={{
                  background: grad ? m.dim : "#12121c", border: `1px solid ${grad ? m.accent : "#2a2a3a"}`,
                  color: grad ? m.accent : "#4a4a6a", padding: "7px 14px", borderRadius: "8px",
                  cursor: "pointer", fontSize: "12px", fontFamily: "inherit",
                }}>
                  {grad ? "🎓" : "○"} L{l}
                </button>
              );
            })}
          </div>
          <p style={{ fontSize: "12px", color: "#3a3a5a", marginTop: "12px", lineHeight: 1.5 }}>
            Mark a level as graduated when you can instantly identify the first step of every question at that level.
          </p>
        </div>
        <div style={{ marginTop: "20px", padding: "14px 18px", background: "#0c0c15", border: "1px solid #1a1a28", borderRadius: "10px", fontSize: "13px", color: "#3a3a5a", lineHeight: 1.8 }}>
          💡 Always do a Level 1 set first each session before your current working level.
        </div>
      </div>
    </div>
  );

  // ── PRACTICE VIEW ─────────────────────────────────────────────────────────────
  if (page === "practiceView" && practiceSet) {
    const m = LEVEL_META[practiceSet.level];
    return (
      <div style={P}>
        <style>{WATER_STYLES}</style>
        <Toast msg={toast} />
        <Lightbox images={lbImgs} index={lbIdx} onClose={() => setLbIdx(null)} onNav={navLb} />
        <div style={HDR}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "10px", background: m.dim, color: m.accent, padding: "3px 9px", borderRadius: "4px", letterSpacing: "1px", textTransform: "uppercase", fontWeight: "700" }}>Level {practiceSet.level}</span>
            <span style={{ fontSize: "14px", fontWeight: "600", color: "#b0aba0", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{practiceSet.label}</span>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="water-btn" style={{ ...BACK, borderColor: m.dim, color: m.accent, fontSize: "12px" }} onClick={() => pickRandom(practiceSet.level)}>🎲 New</button>
            <button className="water-btn" style={{ ...BACK, fontSize: "12px" }} onClick={() => setPage("practice")}>← Levels</button>
          </div>
        </div>
        <div style={WRAP}>
          <div style={{ marginBottom: "20px" }}>
            <Timer running={timerRunning} onStop={logSession} />
          </div>
          <h2 style={{ fontSize: "24px", fontWeight: "700", margin: "0 0 4px", color: "#f0ebe0", letterSpacing: "-0.5px" }}>{practiceSet.label}</h2>
          <div style={{ fontSize: "12px", color: "#4a4a6a", marginBottom: "20px" }}>
            Added {practiceSet.created}{practiceSet.marks ? ` · ${practiceSet.marks} marks` : ""}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px" }}>
            {practiceSet.images.map((src, i) => (
              <div key={i} onClick={() => openLb(practiceSet.images, i)} style={{ cursor: "pointer", borderRadius: "10px", overflow: "hidden", border: "1px solid #2a2a3a", background: "#fff" }}>
                <img src={src} alt={`Page ${i + 1}`} style={{ width: "100%", display: "block", objectFit: "contain" }} />
                <div style={{ padding: "6px 10px", fontSize: "11px", color: "#888", background: "#0c0c14" }}>Tap to enlarge</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "24px" }}>
            {!showNoteInput ? (
              <button onClick={() => setShowNoteInput(true)} style={{ background: "#12121c", border: "1px solid #2a2a3a", color: "#5050a0", padding: "9px 18px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontFamily: "inherit" }}>
                + Add session note
              </button>
            ) : (
              <div>
                <label style={SEC}>Session note</label>
                <textarea value={sessionNote} onChange={e => setSessionNote(e.target.value)}
                  placeholder="What did you struggle with? What went well?" rows={3}
                  style={{ background: "#12121a", border: "1px solid #2e2e3e", borderRadius: "8px", color: "#e8e4dc", padding: "9px 13px", fontFamily: "inherit", fontSize: "14px", outline: "none", width: "100%", boxSizing: "border-box", resize: "vertical", lineHeight: 1.5 }} />
              </div>
            )}
          </div>
          {practiceSet.sessionLogs?.length > 0 && (
            <div style={{ marginTop: "24px", background: "#0c0c14", border: "1px solid #1a1a28", borderRadius: "10px", overflow: "hidden" }}>
              <div style={{ padding: "10px 16px", borderBottom: "1px solid #1a1a28", fontSize: "11px", color: "#4a4a6a", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                Past sessions on this set
              </div>
              {practiceSet.sessionLogs.slice(-5).reverse().map((log, i) => (
                <div key={i} style={{ padding: "10px 16px", borderBottom: i < Math.min(practiceSet.sessionLogs.length, 5) - 1 ? "1px solid #111118" : "none", display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "12px", color: "#3a3a5a", flexShrink: 0 }}>{log.date}</span>
                  <span style={{ fontSize: "12px", color: "#5050a0", flexShrink: 0, fontFamily: "monospace" }}>{log.time}</span>
                  {log.note && <span style={{ fontSize: "12px", color: "#5a5a7a", fontStyle: "italic" }}>{log.note}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── HOME ─────────────────────────────────────────────────────────────────────
  return (
    <div style={P}>
      <style>{WATER_STYLES}</style>
      <Toast msg={toast} />
      <Lightbox images={lbImgs} index={lbIdx} onClose={() => setLbIdx(null)} onNav={navLb} />
      <div style={{ padding: "48px 24px 0", maxWidth: "820px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "36px" }}>
          <div>
            <div style={{ fontSize: "10px", letterSpacing: "3px", textTransform: "uppercase", color: "#3a3a5a", marginBottom: "10px" }}>HSC Study Method</div>
            <h1 style={{ fontSize: "72px", fontWeight: "800", margin: 0, color: "#f0ebe0", letterSpacing: "-4px", lineHeight: 0.95 }}>
              Hori
            </h1>
          </div>
          <div style={{ textAlign: "center", background: "#12121c", border: "1px solid #2a2a3a", borderRadius: "14px", padding: "14px 18px", flexShrink: 0, animation: "liquidBorder 8s ease-in-out infinite, waterFloat 6s ease-in-out infinite" }}>
            <div style={{ fontSize: "28px", display: "inline-block", animation: "streakBob 2.4s ease-in-out infinite" }}>🔥</div>
            <div style={{ fontSize: "22px", fontWeight: "700", color: "#fbbf24", lineHeight: 1 }}>{stats.streak || 0}</div>
            <div style={{ fontSize: "10px", color: "#4a4a6a", marginTop: "3px", letterSpacing: "0.5px" }}>day streak</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "28px" }}>
          {[
            { icon: "✂", title: "Crop a Paper", sub: "Upload a PDF and screenshot questions into stacks.", pg: "pdfCrop", b: "#3a3a58", hov: "#6060a0", bg: "#1a1a2a" },
            { icon: "🎲", title: "Do Stacks",    sub: "Pick a level, get a random set.", pg: "practice", b: "#4a3a6a", hov: "#9060d0", bg: "#1a1228" },
          ].map(btn => (
            <button key={btn.pg} onClick={() => setPage(btn.pg)}
              className="water-card water-btn"
              style={{
                background: btn.bg, border: `1px solid ${btn.b}`, borderRadius: "16px",
                padding: "26px 22px", textAlign: "left", cursor: "pointer", color: "#e8e4dc",
                fontFamily: "inherit",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = btn.hov; e.currentTarget.style.background = btn.bg.replace("1a", "22"); }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = btn.b; e.currentTarget.style.background = btn.bg; }}
            >
              <div style={{ fontSize: "26px", marginBottom: "10px", display: "inline-block" }} className="water-float">{btn.icon}</div>
              <div style={{ fontSize: "18px", fontWeight: "700", marginBottom: "5px", color: "#f0ebe0" }}>{btn.title}</div>
              <div style={{ fontSize: "12px", color: "#5a5a7a", lineHeight: 1.5 }}>{btn.sub}</div>
            </button>
          ))}
        </div>

        <div style={{ background: "#0f0f18", border: "1px solid #1e1e30", borderRadius: "14px", padding: "20px 22px", marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase", color: "#3a3a5a" }}>
              {totalSets} set{totalSets !== 1 ? "s" : ""} saved
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setPage("browse")} style={{ background: "none", border: "1px solid #2a2a3a", color: "#5050a0", padding: "4px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontFamily: "inherit" }}>
                Browse
              </button>
              <button onClick={() => setShowStats(true)} style={{ background: "none", border: "1px solid #2a2a3a", color: "#5050a0", padding: "4px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontFamily: "inherit" }}>
                📊 Stats
              </button>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px" }}>
            {LEVELS.map(l => {
              const m = LEVEL_META[l]; const count = db[l]?.length || 0; const grad = isGraduated(l);
              return (
                <div key={l} style={{ textAlign: "center", padding: "12px 6px", background: "#12121c", borderRadius: "10px", border: `1px solid ${grad ? m.accent : count > 0 ? m.dim : "#1a1a28"}`, position: "relative" }}>
                  {grad && <div style={{ position: "absolute", top: "-8px", left: "50%", transform: "translateX(-50%)", fontSize: "14px" }}>🎓</div>}
                  <div style={{ fontSize: "20px", fontWeight: "700", color: count > 0 ? m.accent : "#2a2a3a" }}>{count}</div>
                  <div style={{ fontSize: "10px", color: count > 0 ? m.accent : "#2a2a3a", letterSpacing: "0.5px", marginTop: "3px" }}>LVL {l}</div>
                  <div style={{ fontSize: "9px", color: "#3a3a5a", marginTop: "2px" }}>{m.sublabel}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          <button onClick={exportBackup} className="water-btn" style={{ flex: 1, background: "#0f0f18", border: "1px solid #2a2a3a", color: "#5a5a7a", padding: "10px", borderRadius: "10px", cursor: "pointer", fontSize: "13px", fontFamily: "inherit" }}>
            ⬇ Export backup
          </button>
          <button onClick={() => importRef.current.click()} className="water-btn" style={{ flex: 1, background: "#0f0f18", border: "1px solid #2a2a3a", color: "#5a5a7a", padding: "10px", borderRadius: "10px", cursor: "pointer", fontSize: "13px", fontFamily: "inherit" }}>
            ⬆ Import backup
          </button>
          <input ref={importRef} type="file" accept=".json" style={{ display: "none" }} onChange={importBackup} />
        </div>

        <div style={{ padding: "16px 20px", background: "#0c0c15", border: "1px solid #1a1a28", borderRadius: "10px", fontSize: "13px", color: "#4a4a6a", lineHeight: 1.8, marginBottom: "40px" }}>
          <strong style={{ color: "#6060a0" }}>How it works:</strong> Upload a past paper PDF, drag to crop each question, and assign it to a stack level. Each session, always review Level 1 first, then practise your current level randomly.
        </div>
      </div>

      {showStats && (
        <div onClick={() => setShowStats(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", backdropFilter: "blur(4px)", animation: "flowIn 0.3s ease both" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#0f0f18", border: "1px solid #2a2a3a", borderRadius: "16px", padding: "28px", maxWidth: "400px", width: "100%", animation: "modalSwell 0.45s cubic-bezier(0.34,1.56,0.64,1) both" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "22px" }}>
              <h3 style={{ fontSize: "20px", fontWeight: "700", color: "#f0ebe0", margin: 0 }}>Your Stats</h3>
              <button onClick={() => setShowStats(false)} style={{ background: "none", border: "none", color: "#5a5a7a", cursor: "pointer", fontSize: "18px" }}>✕</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "22px" }}>
              {[["🔥", stats.streak || 0, "day streak"], ["📚", stats.totalSessions || 0, "total sessions"]].map(([icon, val, label]) => (
                <div key={label} style={{ background: "#12121c", borderRadius: "10px", padding: "16px", textAlign: "center" }}>
                  <div style={{ fontSize: "22px" }}>{icon}</div>
                  <div style={{ fontSize: "28px", fontWeight: "700", color: "#a0a0e0" }}>{val}</div>
                  <div style={{ fontSize: "11px", color: "#4a4a6a" }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: "12px", color: "#4a4a6a", marginBottom: "12px", letterSpacing: "0.5px", textTransform: "uppercase" }}>Sessions per level</div>
            {LEVELS.map(l => {
              const m = LEVEL_META[l]; const count = stats.sessionsPerLevel?.[l] || 0;
              const max = Math.max(1, ...LEVELS.map(x => stats.sessionsPerLevel?.[x] || 0));
              return (
                <div key={l} style={{ marginBottom: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#6060a0", marginBottom: "4px" }}>
                    <span>{m.emoji} {m.label}</span><span>{count}</span>
                  </div>
                  <div style={{ height: "5px", background: "#1a1a28", borderRadius: "3px" }}>
                    <div style={{ height: "100%", width: `${(count / max) * 100}%`, background: m.accent, borderRadius: "3px", animation: "barFill 0.8s cubic-bezier(0.25,0.46,0.45,0.94) both", animationDelay: `${l * 0.1}s` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
