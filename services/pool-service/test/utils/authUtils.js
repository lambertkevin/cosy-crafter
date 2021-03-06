import path from 'path';
import jwt from 'jsonwebtoken';
import { spawn } from 'child_process';

/**
 * Start the auth-service locally as a child process spawn
 *
 * @return {Promise}
 */
export const startAuthService = () =>
  // Promise starting the auth-service locally
  new Promise((resolve) => {
    const child = spawn('npm', ['run', 'mock'], {
      cwd: path.join(path.resolve('./'), '..', 'auth-service')
    });

    child.stdout.on('data', (data) => {
      // Service is ready when it logs 'Server running'
      if (data.toString().includes('Server running')) {
        resolve(child);
      }
    });
  });

/**
 * Create an access token
 *
 * @param {String|Object|Buffer} payload
 * @param {String} expire
 *
 * @return {Promise<String>}
 */
export const accessTokenFactory = (payload, expire) =>
  jwt.sign(payload, process.env.SERVICE_JWT_SECRET, {
    expiresIn: expire
  });

export const accessToken = accessTokenFactory(
  {
    service: 'integration-service'
  },
  '10m'
);

export const accessTokenExpired = accessTokenFactory(
  {
    service: 'integration-service'
  },
  '-1s'
);

export default {
  startAuthService,
  accessToken
};
