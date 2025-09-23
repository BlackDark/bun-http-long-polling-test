import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';

const app = new Hono();

app.get('/', (c) => c.json({ status: 'ok' }));

app.get('/health', (c) => c.json({ status: 'ok' }));

app.get('/poll', async (c) => {
  const timeout = parseInt(c.req.query('timeout') || '10000', 10);
  const interval = parseInt(c.req.query('interval') || '500', 10);
  return streamSSE(c, async (stream) => {
    let elapsed = 0;
    while (elapsed < timeout) {
      await stream.writeln(`event: message\ndata: ${JSON.stringify({
        message: `Message at ${elapsed}ms`,
        timestamp: Date.now(),
        elapsed
      })}\n\n`);
      await new Promise(resolve => setTimeout(resolve, interval));
      elapsed += interval;
    }
  });
});

export { app };