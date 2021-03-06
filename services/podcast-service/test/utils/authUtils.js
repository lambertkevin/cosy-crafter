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

export const accessToken = jwt.sign(
  {
    service: 'integration-service'
  },
  process.env.SERVICE_JWT_SECRET,
  {
    expiresIn: '10m'
  }
);

export default {
  startAuthService,
  accessToken
};
