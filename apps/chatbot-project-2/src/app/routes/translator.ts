import { FastifyInstance } from 'fastify';

const html = `<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Simultandolmetscher</title>
    <style>
      body {
        font-family: 'Inter', system-ui, sans-serif;
        background: #0f172a;
        color: #e2e8f0;
        margin: 0;
        padding: 24px;
      }
      .container {
        max-width: 720px;
        margin: 0 auto;
        background: #1e293b;
        padding: 24px;
        border-radius: 16px;
        box-shadow: 0 12px 30px rgba(15, 23, 42, 0.4);
      }
      h1 {
        margin-top: 0;
      }
      button {
        background: #38bdf8;
        border: none;
        padding: 12px 20px;
        border-radius: 999px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
      }
      button.secondary {
        background: #475569;
      }
      .controls {
        display: flex;
        gap: 12px;
        margin: 16px 0;
      }
      .log {
        background: #0f172a;
        border-radius: 12px;
        padding: 16px;
        min-height: 120px;
        white-space: pre-wrap;
      }
      .status {
        margin-top: 12px;
        font-size: 14px;
        color: #94a3b8;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Simultandolmetscher (EN)</h1>
      <p>Sprich in das Mikrofon, die Übersetzung wird live abgespielt.</p>
      <div class="controls">
        <button id="startButton">Start</button>
        <button id="stopButton" class="secondary" disabled>Stop</button>
      </div>
      <div class="log" id="log"></div>
      <div class="status" id="status">Status: Bereit</div>
    </div>
    <script>
      const startButton = document.getElementById('startButton');
      const stopButton = document.getElementById('stopButton');
      const log = document.getElementById('log');
      const status = document.getElementById('status');
      let audioContext;
      let processor;
      let inputStream;
      let socket;
      let isStreaming = false;

      function appendLog(text) {
        log.textContent += text;
      }

      function setStatus(text) {
        status.textContent = 'Status: ' + text;
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
        appendLog('');
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
