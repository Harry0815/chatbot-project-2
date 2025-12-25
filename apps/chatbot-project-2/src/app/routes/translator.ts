import { FastifyInstance } from 'fastify';

const html = `<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Simultandolmetscher</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #0b1120;
        --card: #111827;
        --card-soft: rgba(30, 41, 59, 0.7);
        --accent: #38bdf8;
        --accent-strong: #0ea5e9;
        --text: #e2e8f0;
        --muted: #94a3b8;
        --border: rgba(148, 163, 184, 0.2);
        --success: #34d399;
        --warning: #fbbf24;
      }
      * {
        box-sizing: border-box;
      }
      body {
        font-family: 'Inter', system-ui, sans-serif;
        background: radial-gradient(circle at top, #1e293b 0%, #0b1120 45%);
        color: var(--text);
        margin: 0;
        padding: 32px;
        min-height: 100vh;
      }
      .shell {
        max-width: 1000px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 24px;
      }
      .hero {
        grid-column: 1 / -1;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .hero h1 {
        font-size: 32px;
        margin: 0;
      }
      .hero p {
        margin: 0;
        color: var(--muted);
      }
      .card {
        background: var(--card);
        border-radius: 20px;
        padding: 24px;
        border: 1px solid var(--border);
        box-shadow: 0 16px 40px rgba(15, 23, 42, 0.45);
      }
      .card.soft {
        background: var(--card-soft);
      }
      .controls {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 16px;
      }
      button {
        background: var(--accent);
        border: none;
        padding: 12px 20px;
        border-radius: 999px;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        color: #0b1120;
        transition: transform 0.2s ease, background 0.2s ease;
      }
      button:hover:enabled {
        background: var(--accent-strong);
        transform: translateY(-1px);
      }
      button.secondary {
        background: #334155;
        color: var(--text);
      }
      button.secondary:hover:enabled {
        background: #475569;
      }
      button:disabled {
        cursor: not-allowed;
        opacity: 0.6;
      }
      .status {
        margin-top: 16px;
        font-size: 14px;
        color: var(--muted);
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .status-dot {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        background: var(--warning);
        box-shadow: 0 0 12px rgba(251, 191, 36, 0.6);
      }
      .status-dot.active {
        background: var(--success);
        box-shadow: 0 0 12px rgba(52, 211, 153, 0.6);
      }
      .log {
        background: #0b1120;
        border-radius: 16px;
        padding: 16px;
        min-height: 180px;
        white-space: pre-wrap;
        border: 1px solid rgba(15, 23, 42, 0.6);
        font-size: 15px;
      }
      .log-placeholder {
        color: var(--muted);
      }
      .pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: 999px;
        background: rgba(56, 189, 248, 0.12);
        color: var(--accent);
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .meta {
        margin-top: 16px;
        display: grid;
        gap: 12px;
        color: var(--muted);
        font-size: 14px;
      }
      .meta strong {
        color: var(--text);
        font-weight: 600;
      }
      .tips {
        display: grid;
        gap: 12px;
      }
      .tip {
        padding: 12px 16px;
        border-radius: 12px;
        border: 1px solid var(--border);
        background: rgba(15, 23, 42, 0.35);
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <section class="hero">
        <span class="pill">Live Translation</span>
        <h1>Simultandolmetscher (EN)</h1>
        <p>Sprich in das Mikrofon, die Übersetzung wird live abgespielt und hier protokolliert.</p>
      </section>

      <section class="card">
        <h2>Steuerung</h2>
        <p class="meta">
          <span><strong>Quelle:</strong> Deutsch (Mikrofon)</span>
          <span><strong>Ziel:</strong> Englisch (Live-Audio)</span>
        </p>
        <div class="controls">
          <button id="startButton">Start</button>
          <button id="stopButton" class="secondary" disabled>Stop</button>
        </div>
        <div class="status">
          <span class="status-dot" id="statusDot"></span>
          <span id="statusText">Status: Bereit</span>
        </div>
      </section>

      <section class="card soft">
        <h2>Live-Transkript</h2>
        <div class="log" id="log">
          <span class="log-placeholder">Noch keine Übersetzung empfangen.</span>
        </div>
      </section>

      <section class="card soft">
        <h2>Tipps für beste Qualität</h2>
        <div class="tips">
          <div class="tip">Sprich klar und gleichmäßig in das Mikrofon.</div>
          <div class="tip">Nutze Kopfhörer, um Rückkopplungen zu vermeiden.</div>
          <div class="tip">Kurze Sätze helfen der Live-Übersetzung.</div>
        </div>
      </section>
    </div>
    <script>
      const startButton = document.getElementById('startButton');
      const stopButton = document.getElementById('stopButton');
      const log = document.getElementById('log');
      const status = document.getElementById('statusText');
      const statusDot = document.getElementById('statusDot');
      let audioContext;
      let processor;
      let inputStream;
      let socket;
      let isStreaming = false;

      function appendLog(text) {
        const placeholder = log.querySelector('.log-placeholder');
        if (placeholder) {
          placeholder.remove();
        }
        log.textContent += text;
      }

      function setStatus(text) {
        status.textContent = 'Status: ' + text;
      }

      function setStatusDot(isActive) {
        if (!statusDot) return;
        statusDot.classList.toggle('active', isActive);
      }

      function floatTo16BitPCM(float32) {
        const buffer = new ArrayBuffer(float32.length * 2);
        const view = new DataView(buffer);
        let offset = 0;
        for (let i = 0; i < float32.length; i++) {
          let s = Math.max(-1, Math.min(1, float32[i]));
          view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
          offset += 2;
        }
        return buffer;
      }

      function playPcm(base64Audio) {
        const binary = atob(base64Audio);
        const buffer = new ArrayBuffer(binary.length);
        const view = new Uint8Array(buffer);
        for (let i = 0; i < binary.length; i++) {
          view[i] = binary.charCodeAt(i);
        }
        const pcm16 = new Int16Array(buffer);
        const audioBuffer = audioContext.createBuffer(1, pcm16.length, 24000);
        const channelData = audioBuffer.getChannelData(0);
        for (let i = 0; i < pcm16.length; i++) {
          channelData[i] = pcm16[i] / 0x8000;
        }
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();
      }

      async function start() {
        if (isStreaming) return;
        isStreaming = true;
        setStatus('Verbinde…');
        setStatusDot(false);
        socket = new WebSocket('ws://' + window.location.host + '/ws/translate');
        socket.binaryType = 'arraybuffer';

        socket.addEventListener('open', () => {
          socket.send(JSON.stringify({ type: 'start' }));
        });

        socket.addEventListener('message', (event) => {
          if (typeof event.data === 'string') {
            const message = JSON.parse(event.data);
            if (message.type === 'ready') {
              setStatus('Bereit (mikrofon aktiv)');
              setStatusDot(true);
            }
            if (message.type === 'text') {
              appendLog(message.delta);
            }
            if (message.type === 'audio') {
              playPcm(message.delta);
            }
            if (message.type === 'error') {
              setStatus('Fehler: ' + message.message);
            }
          }
        });

        socket.addEventListener('close', () => {
          setStatus('Getrennt');
          setStatusDot(false);
        });

        audioContext = new AudioContext({ sampleRate: 24000 });
        inputStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = audioContext.createMediaStreamSource(inputStream);
        processor = audioContext.createScriptProcessor(4096, 1, 1);
        source.connect(processor);
        processor.connect(audioContext.destination);

        processor.onaudioprocess = (event) => {
          if (!socket || socket.readyState !== WebSocket.OPEN) return;
          const input = event.inputBuffer.getChannelData(0);
          socket.send(floatTo16BitPCM(input));
        };

        startButton.disabled = true;
        stopButton.disabled = false;
      }

      function stop() {
        if (!isStreaming) return;
        isStreaming = false;
        if (processor) {
          processor.disconnect();
          processor.onaudioprocess = null;
        }
        if (inputStream) {
          inputStream.getTracks().forEach((track) => track.stop());
        }
        if (socket) {
          socket.send(JSON.stringify({ type: 'stop' }));
          socket.close();
        }
        startButton.disabled = false;
        stopButton.disabled = true;
        setStatus('Gestoppt');
        setStatusDot(false);
      }

      startButton.addEventListener('click', start);
      stopButton.addEventListener('click', stop);
    </script>
  </body>
</html>`;

export default async function translatorRoutes(fastify: FastifyInstance) {
  fastify.get('/translator', async (_request, reply) => {
    reply.type('text/html').send(html);
  });
}
