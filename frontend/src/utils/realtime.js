
import { useEffect, useRef } from 'react';
import Pusher from 'pusher-js';
import { getUnlockToken } from './adminUnlock';
 
const KEY = import.meta.env.VITE_PUSHER_KEY;
const CLUSTER = import.meta.env.VITE_PUSHER_CLUSTER;
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
 
let client = null;
const getClient = () => {
  if (!KEY || !CLUSTER) return null;
  if (!client) {
    client = new Pusher(KEY, {
      cluster: CLUSTER,
      channelAuthorization: {
        endpoint: `${API_URL}/deals/pusher/auth`,
        transport: 'ajax',
        headersProvider: () => {
          const h = {};
          const t = localStorage.getItem('token');
          if (t) h.Authorization = `Bearer ${t}`;
          const u = getUnlockToken();
          if (u) h['X-Admin-Unlock'] = u;
          return h;
        },
      },
    });
  }
  return client;
};
 
// channel + event sunta hai, unmount par apne aap band
export const useRealtime = (channel, event, onEvent) => {
  const ref = useRef(onEvent);
  useEffect(() => { ref.current = onEvent; });
  useEffect(() => {
    const c = channel && getClient();
    if (!c) return undefined;
    const ch = c.subscribe(channel);
    const handler = (d) => ref.current && ref.current(d);
    ch.bind(event, handler);
    return () => { ch.unbind(event, handler); c.unsubscribe(channel); };
  }, [channel, event]);
};
 