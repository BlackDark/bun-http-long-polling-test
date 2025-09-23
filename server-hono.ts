import { Hono } from 'hono';

const app = new Hono();

app.get('/', (c) => c.json({ status: 'ok' }));

app.get('/health', (c) => c.json({ status: 'ok' }));

app.get('/poll', async (c) => {
  const timeout = parseInt(c.req.query('timeout') || '10000', 10);
  await new Promise(resolve => setTimeout(resolve, timeout));
  return c.json({
    message: 'Long poll completed',
    timestamp: Date.now(),
    timeout
  });
});

export { app };