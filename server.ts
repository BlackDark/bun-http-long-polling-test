if (process.env.FRAMEWORK === 'hono') {
  // Dynamically import Hono variant
  import('./server-hono.ts').then((module) => {
    const { app } = module;
    const server = Bun.serve({
      fetch: app.fetch,
      port: 3000,
      idleTimeout: 0,
    });
    console.log(`Hono server running on http://localhost:${server.port}`);
  });
} else {
  // Plain Bun variant
  const server = Bun.serve({
    port: 3000,
    idleTimeout: 0,
    async fetch(req) {
      const url = new URL(req.url);
      if (url.pathname === '/' || url.pathname === '/health') {
        return new Response(JSON.stringify({ status: 'ok' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
       if (url.pathname === '/poll') {
         const timeout = parseInt(url.searchParams.get('timeout') || '10000', 10);
         const interval = parseInt(url.searchParams.get('interval') || '500', 10);
         const stream = new ReadableStream({
           start(controller) {
             let elapsed = 0;
             const sendMessage = () => {
               if (elapsed >= timeout) {
                 controller.close();
                 return;
               }
               const data = `data: ${JSON.stringify({
                 message: `Message at ${elapsed}ms`,
                 timestamp: Date.now(),
                 elapsed
               })}\n\n`;
               controller.enqueue(new TextEncoder().encode(data));
               elapsed += interval;
               setTimeout(sendMessage, interval);
             };
             sendMessage();
           }
         });
         return new Response(stream, {
           headers: {
             'Content-Type': 'text/event-stream',
             'Cache-Control': 'no-cache',
             'Connection': 'keep-alive'
           }
         });
       }
      return new Response('Not Found', { status: 404 });
    },
  });
  console.log(`Plain Bun server running on http://localhost:${server.port}`);
}