import Echo from 'laravel-echo';
import Pusher, { type ChannelAuthorizationCallback } from 'pusher-js';
import { api, BACKEND_ORIGIN } from './api/client';

declare global {
  interface Window {
    Pusher: typeof Pusher;
  }
}

// pusher-js is the wire protocol Reverb speaks.
window.Pusher = Pusher;

export const echo = new Echo<'reverb'>({
  broadcaster: 'reverb',
  key: import.meta.env.VITE_REVERB_APP_KEY,
  wsHost: import.meta.env.VITE_REVERB_HOST ?? 'localhost',
  wsPort: Number(import.meta.env.VITE_REVERB_PORT ?? 8080),
  wssPort: Number(import.meta.env.VITE_REVERB_PORT ?? 8080),
  forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'http') === 'https',
  enabledTransports: ['ws', 'wss'],
  // Authenticate private channels through the Sanctum session (cookie + XSRF).
  authorizer: (channel: { name: string }) => ({
    authorize: (socketId: string, callback: ChannelAuthorizationCallback) => {
      api
        .post(`${BACKEND_ORIGIN}/broadcasting/auth`, {
          socket_id: socketId,
          channel_name: channel.name,
        })
        .then((res) => callback(null, res.data))
        .catch((error: Error) => callback(error, null));
    },
  }),
});
