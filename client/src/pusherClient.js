import Pusher from 'pusher-js';

export const pusher = new Pusher(import.meta.env.VITE_PUSHER_KEY, {
  cluster: import.meta.env.VITE_PUSHER_CLUSTER,
});

export function subscribe(channelName) {
  return pusher.subscribe(channelName);
}

export function unsubscribe(channelName) {
  pusher.unsubscribe(channelName);
}
