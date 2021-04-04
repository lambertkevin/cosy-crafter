import os from 'os';
import express from 'express';
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import { createProxyMiddleware } from 'http-proxy-middleware';

export default () => {
  const app = express();

  if (process.env.NODE_ENV === 'production') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN_GATEWAY_SERVICE,
      integrations: [
        // enable HTTP calls tracing
        new Sentry.Integrations.Http({ tracing: true }),
        // enable Express.js middleware tracing
        new Tracing.Integrations.Express({ app })
      ],

      // Set tracesSampleRate to 1.0 to capture 100%
      // of transactions for performance monitoring.
      // We recommend adjusting this value in production
      tracesSampleRate: 1.0
    });

    // RequestHandler creates a separate execution context using domains, so that every
    // transaction/span/breadcrumb is attached to its own Hub instance
    app.use(Sentry.Handlers.requestHandler());
    // TracingHandler creates a trace for every incoming request
    app.use(Sentry.Handlers.tracingHandler());

    // The error handler must be before any other error middleware and after all controllers
    app.use(Sentry.Handlers.errorHandler());
  }

  app.use(
    '/podcast',
    createProxyMiddleware({
      target: `http://${process.env.PODCAST_SERVICE_NAME}:${process.env.PODCAST_SERVICE_PORT}`,
      pathRewrite: { '^/podcast': '' },
      logLevel: 'debug'
    })
  );

  app.use(
    '/auth',
    createProxyMiddleware({
      target: `http://${process.env.AUTH_SERVICE_NAME}:${process.env.AUTH_SERVICE_PORT}`,
      pathRewrite: { '^/auth': '' },
      logLevel: 'debug'
    })
  );

  app.use(
    '/storage',
    createProxyMiddleware({
      target: `http://${process.env.STORAGE_SERVICE_NAME}:${process.env.STORAGE_SERVICE_PORT}`,
      pathRewrite: { '^/storage': '' },
      logLevel: 'debug'
    })
  );

  app.use(
    '/pool',
    createProxyMiddleware({
      target: `http://${process.env.POOL_SERVICE_NAME}:${process.env.POOL_SERVICE_PORT}`,
      pathRewrite: { '^/pool': '' },
      logLevel: 'debug'
    })
  );

  const wsProxy = createProxyMiddleware('/socket.io', {
    target: `ws://${process.env.POOL_SERVICE_NAME}:${process.env.POOL_SERVICE_PORT}`,
    changeOrigin: true,
    ws: true
  });

  app.use('/socket.io', wsProxy);

  const server = app.listen(process.env.GATEWAY_SERVICE_PORT, () => {
    console.log(`Server running on http://${os.hostname()}:${process.env.GATEWAY_SERVICE_PORT}`);
  });

  server.on('upgrade', wsProxy.upgrade); // <-- subscribe to http 'upgrade'

  return app;
};
