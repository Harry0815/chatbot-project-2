import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import fastifyWebsocket from '@fastify/websocket';
import WebSocket from 'ws';

type OpenAiEvent = {
  type: string;
  delta?: string;
  error?: { message?: string };
};

const OPENAI_REALTIME_URL =
  'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17';

function toBase64(data: Buffer): string {
  return data.toString('base64');
}

export default fp(async function realtimeTranslate(fastify: FastifyInstance) {
  fastify.register(fastifyWebsocket);

  fastify.get(
    '/ws/translate',
    { websocket: true },
    (connection, request) => {
      const apiKey = process.env.OPENAI_API_KEY;

      if (!apiKey) {
        connection.socket.send(
          JSON.stringify({
            type: 'error',
            message: 'OPENAI_API_KEY ist nicht gesetzt.',
          })
        );
        connection.socket.close();
        return;
      }

      const openAiSocket = new WebSocket(OPENAI_REALTIME_URL, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'OpenAI-Beta': 'realtime=v1',
        },
      });

      let openAiReady = false;

      const safeSendToOpenAi = (payload: object) => {
        if (!openAiReady) {
          return;
        }
        openAiSocket.send(JSON.stringify(payload));
      };

      openAiSocket.on('open', () => {
        openAiReady = true;
        openAiSocket.send(
          JSON.stringify({
            type: 'session.update',
            session: {
              instructions:
                'Du bist ein Simultandolmetscher. Übersetze jede eingehende Sprache ins Englische und antworte mit Audio.',
              modalities: ['audio', 'text'],
              voice: 'alloy',
              input_audio_transcription: {
                model: 'whisper-1',
              },
            },
          })
        );
        connection.socket.send(JSON.stringify({ type: 'ready' }));
      });

      openAiSocket.on('message', (data) => {
        const message = JSON.parse(data.toString()) as OpenAiEvent;

        if (message.type === 'response.audio.delta' && message.delta) {
          connection.socket.send(
            JSON.stringify({ type: 'audio', delta: message.delta })
          );
        }

        if (message.type === 'response.text.delta' && message.delta) {
          connection.socket.send(
            JSON.stringify({ type: 'text', delta: message.delta })
          );
        }

        if (message.type === 'error') {
          connection.socket.send(
            JSON.stringify({
              type: 'error',
              message: message.error?.message ?? 'OpenAI Fehler.',
            })
          );
        }
      });

      openAiSocket.on('close', () => {
        if (connection.socket.readyState === connection.socket.OPEN) {
          connection.socket.close();
        }
      });

      connection.socket.on('message', (message: WebSocket.RawData) => {
        if (typeof message === 'string') {
          const payload = JSON.parse(message) as { type: string };
          if (payload.type === 'stop') {
            safeSendToOpenAi({ type: 'input_audio_buffer.commit' });
            safeSendToOpenAi({
              type: 'response.create',
              response: {
                modalities: ['audio', 'text'],
              },
            });
          }
          if (payload.type === 'start') {
            safeSendToOpenAi({ type: 'input_audio_buffer.clear' });
          }
          return;
        }

        const buffer = Buffer.isBuffer(message)
          ? message
          : Buffer.from(message as ArrayBuffer);

        safeSendToOpenAi({
          type: 'input_audio_buffer.append',
          audio: toBase64(buffer),
        });
      });

      connection.socket.on('close', () => {
        if (openAiSocket.readyState === openAiSocket.OPEN) {
          openAiSocket.close();
        }
      });

      connection.socket.on('error', (err) => {
        request.log.error(err);
      });
    }
  );
});
