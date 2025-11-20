"use client";

import { useEffect, useRef, useState } from "react";

function drawCar(ctx, x, y, scale, wheelRotation, bodyColor) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Car body
  ctx.fillStyle = bodyColor;
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-120, -40, 240, 80, 16);
  ctx.fill();
  ctx.stroke();

  // Cabin
  ctx.beginPath();
  ctx.moveTo(-40, -40);
  ctx.lineTo(20, -80);
  ctx.lineTo(90, -80);
  ctx.lineTo(120, -40);
  ctx.closePath();
  ctx.fillStyle = bodyColor;
  ctx.fill();
  ctx.stroke();

  // Windows
  ctx.fillStyle = "#9fd3ff";
  ctx.strokeStyle = "#2a2a2a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-30, -40);
  ctx.lineTo(25, -72);
  ctx.lineTo(80, -72);
  ctx.lineTo(105, -40);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Headlight
  ctx.fillStyle = "#ffd65a";
  ctx.beginPath();
  ctx.ellipse(120, -10, 10, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Wheels
  const wheelPositions = [
    { x: -70, y: 40 },
    { x: 70, y: 40 },
  ];
  for (const pos of wheelPositions) {
    ctx.save();
    ctx.translate(pos.x, pos.y);
    // Tire
    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.fill();
    // Rim
    ctx.fillStyle = "#d0d0d0";
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    // Spokes
    ctx.rotate(wheelRotation);
    ctx.strokeStyle = "#9a9a9a";
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      ctx.rotate((Math.PI * 2) / 6);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(14, 0);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore();
}

function drawBackground(ctx, width, height, t) {
  // Sky
  const skyGradient = ctx.createLinearGradient(0, 0, 0, height);
  skyGradient.addColorStop(0, "#76b3ff");
  skyGradient.addColorStop(1, "#bfe0ff");
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, width, height);

  // Distant hills
  ctx.fillStyle = "#89c07a";
  ctx.beginPath();
  ctx.moveTo(0, height * 0.65);
  for (let x = 0; x <= width; x += 20) {
    const y = height * 0.65 + Math.sin((x + t * 0.2) * 0.01) * 10;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();

  // Road
  ctx.fillStyle = "#3b3b3b";
  const roadTop = height * 0.75;
  ctx.fillRect(0, roadTop, width, height - roadTop);

  // Lane stripes (animated parallax)
  ctx.strokeStyle = "#fff9";
  ctx.lineWidth = 6;
  ctx.setLineDash([40, 30]);
  ctx.lineDashOffset = -t * 0.6;
  ctx.beginPath();
  ctx.moveTo(0, roadTop + 40);
  ctx.lineTo(width, roadTop + 40);
  ctx.stroke();
  ctx.setLineDash([]);
}

export default function HomePage() {
  const canvasRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [durationSec, setDurationSec] = useState(5);
  const [carColor, setCarColor] = useState("#e53935");
  const [speed, setSpeed] = useState(300); // pixels per second
  const [resolution, setResolution] = useState("1280x720");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const [w, h] = resolution.split("x").map((v) => parseInt(v, 10));
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    drawBackground(ctx, canvas.width, canvas.height, 0);
    drawCar(ctx, canvas.width * 0.2, canvas.height * 0.72, 1, 0, carColor);
  }, [resolution, carColor]);

  async function generate() {
    if (isGenerating) return;
    setIsGenerating(true);
    setVideoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const fps = 60;
    const stream = canvas.captureStream(fps);
    const mimeCandidates = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
    ];
    const mimeType =
      mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) ||
      "video/webm";
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000 });
    const chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    // Animation state
    const [width, height] = [canvas.width, canvas.height];
    let startTs = 0;
    let carX = -200;
    const roadY = height * 0.72;
    const pixelsPerSec = speed;
    const carScale = Math.min(width / 1280, height / 720) * 1.0;

    function frame(ts) {
      if (!startTs) startTs = ts;
      const t = (ts - startTs) / 1000;
      // Background and road
      drawBackground(ctx, width, height, ts);
      // Car motion
      carX = -200 + t * pixelsPerSec;
      const wheelRotation = t * (pixelsPerSec / 26) * 0.2;
      drawCar(ctx, carX, roadY, carScale, wheelRotation, carColor);
      // Shadow
      ctx.fillStyle = "#0003";
      ctx.beginPath();
      ctx.ellipse(carX, roadY + 45 * carScale, 110 * carScale, 18 * carScale, 0, 0, Math.PI * 2);
      ctx.fill();

      if (t < durationSec) {
        requestAnimationFrame(frame);
      }
    }

    recorder.start(100); // gather data in 100ms chunks
    const rafId = requestAnimationFrame(frame);
    await new Promise((resolve) => setTimeout(resolve, durationSec * 1000));
    recorder.stop();
    cancelAnimationFrame(rafId);

    const blob = await new Promise((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    });

    const url = URL.createObjectURL(blob);
    setVideoUrl(url);
    setIsGenerating(false);
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        background: "#0f172a",
        color: "#e2e8f0",
      }}
    >
      <header
        style={{
          padding: "20px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          justifyContent: "space-between",
          maxWidth: 1200,
          margin: "0 auto",
          width: "100%",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 22 }}>Car Video Generator</h1>
        <a
          href="https://vercel.com"
          target="_blank"
          rel="noreferrer"
          style={{ color: "#a3e635", textDecoration: "none", fontWeight: 600 }}
        >
          Deploys on Vercel
        </a>
      </header>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 20,
          alignItems: "start",
          maxWidth: 1200,
          padding: 20,
          margin: "0 auto",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 16,
            background: "#111827",
            border: "1px solid #1f2937",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "center",
            }}
          >
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span>Duration</span>
              <input
                type="number"
                min={1}
                max={20}
                value={durationSec}
                onChange={(e) => setDurationSec(parseInt(e.target.value || "1", 10))}
                style={{ width: 80, padding: 6, borderRadius: 8, border: "1px solid #374151", background: "#0b1220", color: "#e5e7eb" }}
              />
              <span>s</span>
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span>Car color</span>
              <input
                type="color"
                value={carColor}
                onChange={(e) => setCarColor(e.target.value)}
                style={{ width: 42, height: 32, border: "none", background: "transparent" }}
              />
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span>Speed</span>
              <input
                type="range"
                min={100}
                max={800}
                step={10}
                value={speed}
                onChange={(e) => setSpeed(parseInt(e.target.value, 10))}
              />
              <span>{speed} px/s</span>
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span>Resolution</span>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                style={{ padding: 6, borderRadius: 8, border: "1px solid #374151", background: "#0b1220", color: "#e5e7eb" }}
              >
                <option value="1280x720">1280x720</option>
                <option value="1920x1080">1920x1080</option>
                <option value="854x480">854x480</option>
                <option value="640x360">640x360</option>
              </select>
            </label>
            <button
              onClick={generate}
              disabled={isGenerating}
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                background: isGenerating ? "#334155" : "#22c55e",
                color: "#0b1220",
                fontWeight: 700,
                border: "none",
                cursor: isGenerating ? "not-allowed" : "pointer",
              }}
            >
              {isGenerating ? "Generating?" : "Generate Video"}
            </button>
          </div>
          <div
            style={{
              position: "relative",
              borderRadius: 12,
              overflow: "hidden",
              background: "#0b1220",
              border: "1px solid #1f2937",
              display: "grid",
              placeItems: "center",
            }}
          >
            <canvas ref={canvasRef} style={{ width: "100%", height: "auto", maxHeight: 540, display: "block" }} />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gap: 12,
            background: "#111827",
            border: "1px solid #1f2937",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18 }}>Output</h2>
          {!videoUrl && <p style={{ margin: 0, opacity: 0.8 }}>Generate to preview and download your video.</p>}
          {videoUrl && (
            <div style={{ display: "grid", gap: 10 }}>
              <video
                src={videoUrl}
                controls
                style={{ width: "100%", borderRadius: 12, border: "1px solid #1f2937", background: "black" }}
              />
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <a
                  href={videoUrl}
                  download={`car-video-${Date.now()}.webm`}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: "#38bdf8",
                    color: "#082f49",
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  Download .webm
                </a>
              </div>
            </div>
          )}
        </div>
      </section>

      <footer
        style={{
          padding: 16,
          textAlign: "center",
          opacity: 0.8,
          fontSize: 13,
        }}
      >
        Built with Next.js, Canvas, and MediaRecorder.
      </footer>
    </main>
  );
}
