// istanbul ignore file
import path from 'path';
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
      detached: false,
      cwd: path.resolve('./', '..', '..', '..', 'services', 'auth-service'),
      stdio: 'pipe',
      env: {
        ...process.env,
        RSA_KEYS_LOCATION: path.resolve('./test/config/keys/'),
        AUTH_RSA_KEYS_NAME: 'test',
      }
    });

    child.on('exit', () => {
      reject(new Error('You must kill the process running on the auth-service port'));
    })

    child.stdout.on('data', (data) => {
      // Service is ready when it logs 'Server running'
      if (data.toString().includes('Server running')) {
        resolve(child);
      }
    });
  });

export default {
  startAuthService,
};
