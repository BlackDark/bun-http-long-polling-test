if (process.env.FRAMEWORK === 'hono') {
  // Dynamically import Hono variant
  import('./server-hono.ts').then((module) => {
    const { app } = module;
    const server = Bun.serve({
      fetch: app.fetch,
      port: 3000,
    });
    console.log(`Hono server running on http://localhost:${server.port}`);
  });
} else {
  // Plain Bun variant
  const server = Bun.serve({
    port: 3000,
    async fetch(req) {
      const url = new URL(req.url);
      if (url.pathname === '/' || url.pathname === '/health') {
        return new Response(JSON.stringify({ status: 'ok' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (url.pathname === '/poll') {
        const timeout = parseInt(url.searchParams.get('timeout') || '10000', 10);
        // Simulate long polling: wait for timeout
        await new Promise(resolve => setTimeout(resolve, timeout));
        return new Response(JSON.stringify({
          message: 'Long poll completed',
          timestamp: Date.now(),
          timeout: timeout
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response('Not Found', { status: 404 });
    },
  });
  console.log(`Plain Bun server running on http://localhost:${server.port}`);
}