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
  new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', 'mock'], {
      cwd: path.resolve('./', '..', 'auth-service')
    });

    child.on('exit', () => {
      console.log('Auth-Service Stopped');
      reject(
        new Error('You must kill the process running on the auth-service port')
      );
    });

    child.stdout.on('data', (data) => {
      // Service is ready when it logs 'Server running'
      if (data.toString().includes('Server running')) {
        console.log('Auth-Service started: ', data.toString());
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
