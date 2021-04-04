import os from 'os';
import boom from '@hapi/boom';
import express from 'express';
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { identifier } from './config';
import pkg from '../package.json';

export default () => {
  const app = express();

  Sentry.init({
    dsn: process.env.SENTRY_DSN_GATEWAY_SERVICE,
    integrations: [
      // enable HTTP calls tracing
      new Sentry.Integrations.Http({ tracing: true }),
      // enable Express.js middleware tracing
      new Tracing.Integrations.Express({ app })
    ],
    environment: process.env.NODE_ENV,
    serverName: identifier,
    attachStacktrace: true,
    release: pkg.version,
    normalizeDepth: 11,
    tracesSampleRate: 1.0
  });

  // RequestHandler creates a separate execution context using domains, so that every
  // transaction/span/breadcrumb is attached to its own Hub instance
  app.use(Sentry.Handlers.requestHandler());
  // TracingHandler creates a trace for every incoming request
  app.use(Sentry.Handlers.tracingHandler());
  // The error handler must be before any other error middleware and after all controllers
  app.use(Sentry.Handlers.errorHandler());

  /**
   * Proxy for podcast-service
   *
   * @method HTTP
   */
  app.use(
    '/podcast',
    createProxyMiddleware({
      target: `http://${process.env.PODCAST_SERVICE_NAME}:${process.env.PODCAST_SERVICE_PORT}`,
      pathRewrite: { '^/podcast': '' },
      logLevel: 'debug'
    })
  );

  /**
   * Proxy for auth-service
   *
   * @method HTTP
   */
  app.use(
    '/auth',
    createProxyMiddleware({
      target: `http://${process.env.AUTH_SERVICE_NAME}:${process.env.AUTH_SERVICE_PORT}`,
      pathRewrite: { '^/auth': '' },
      logLevel: 'debug'
    })
  );

  /**
   * Proxy for storage-service
   *
   * @method HTTP
   */
  app.use(
    '/storage',
    createProxyMiddleware({
      target: `http://${process.env.STORAGE_SERVICE_NAME}:${process.env.STORAGE_SERVICE_PORT}`,
      pathRewrite: { '^/storage': '' },
      logLevel: 'debug'
    })
  );

  /**
   * Proxy for pool-service
   *
   * @method HTTP
   */
  app.use(
    '/pool',
    createProxyMiddleware({
      target: `http://${process.env.POOL_SERVICE_NAME}:${process.env.POOL_SERVICE_PORT}`,
      pathRewrite: { '^/pool': '' },
      logLevel: 'debug'
    })
  );

  /**
   * Proxy for pool-service
   *
   * @method WebSocket
   */
  app.use(
    '/socket.io',
    createProxyMiddleware('/socket.io', {
      target: `ws://${process.env.POOL_SERVICE_NAME}:${process.env.POOL_SERVICE_PORT}`,
      changeOrigin: true,
      ws: true
    })
  );

  /**
   * Middleware to respond a Boom 404 error
   * for every path & method not under
   * the scope of the proxies
   *
   * @method GET,POST,PATCH,DELETE
   */
  app.use((req, res, next) => {
    const error = boom.notFound();
    res.status(404).send(error?.output?.payload);
  });

  app.listen(process.env.GATEWAY_SERVICE_PORT, () => {
    console.log(`Server running on http://${os.hostname()}:${process.env.GATEWAY_SERVICE_PORT}`);
  });

  return app;
};
