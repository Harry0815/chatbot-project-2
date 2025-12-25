import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway } from '@nestjs/websockets';
import { RawData, WebSocket } from 'ws';
import { AppHelperService } from '../helpers/app.helper.service';

type OpenAiEvent = {
  type: string;
  delta?: string;
  error?: { message?: string };
};

type ClientSession = {
  openAiSocket: WebSocket;
  openAiReady: boolean;
};

const OPENAI_REALTIME_URL =
  'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17';

function toBase64(data: Buffer): string {
  return data.toString('base64');
}

@WebSocketGateway({ path: '/ws/translate' })
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly sessions = new Map<WebSocket, ClientSession>();
  private readonly helper: AppHelperService = new AppHelperService();

  constructor() { /* empty */ }

  handleConnection(client: WebSocket) {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      client.send(
        JSON.stringify({
          type: 'error',
          message: 'OPENAI_API_KEY ist nicht gesetzt.',
        }),
      );
      client.close();
      return;
    }

    const openAiSocket = new WebSocket(OPENAI_REALTIME_URL, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'OpenAI-Beta': 'realtime=v1',
      },
    });

    const session: ClientSession = { openAiSocket, openAiReady: false };
    this.sessions.set(client, session);

    const safeSendToOpenAi = (payload: object) => {
      if (!session.openAiReady) {
        return;
      }
      session.openAiSocket.send(JSON.stringify(payload));
    };

    openAiSocket.on('open', () => {
      session.openAiReady = true;
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
        }),
      );
      client.send(JSON.stringify({ type: 'ready' }));
    });

    openAiSocket.on('message', (data) => {
      const message = JSON.parse(data.toString()) as OpenAiEvent;

      if (message.type === 'response.audio.delta' && message.delta) {
        client.send(JSON.stringify({ type: 'audio', delta: message.delta }));
      }

      if (message.type === 'response.text.delta' && message.delta) {
        client.send(JSON.stringify({ type: 'text', delta: message.delta }));
      }

      if (message.type === 'error') {
        client.send(
          JSON.stringify({
            type: 'error',
            message: message.error?.message ?? 'OpenAI Fehler.',
          }),
        );
      }
    });

    openAiSocket.on('close', () => {
      if (client.readyState === client.OPEN) {
        client.close();
      }
    });

    client.on('message', (message: RawData) => {
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

    client.on('close', () => {
      if (openAiSocket.readyState === openAiSocket.OPEN) {
        openAiSocket.close();
      }
    });

    client.send(
      JSON.stringify({
        event: 'connected',
        data: this.helper.getWelcomeMessage(),
      }),
    );
  }

  handleDisconnect(client: WebSocket) {
    const session = this.sessions.get(client);
    if (!session) {
      return;
    }

    if (session.openAiSocket.readyState === session.openAiSocket.OPEN) {
      session.openAiSocket.close();
    }

    this.sessions.delete(client);
  }
}
