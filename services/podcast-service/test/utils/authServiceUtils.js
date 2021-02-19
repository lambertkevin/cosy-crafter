import path from 'path';
import { spawn } from 'child_process';

export default () =>
  // Promise starting the auth-service locally
  new Promise((resolve) => {
    const child = spawn('npm', ['run', 'test'], {
      cwd: path.join(path.resolve('./'), '..', 'auth-service')
    });

    child.stdout.on('data', (data) => {
      // Service is ready when it logs 'Server running'
      if (data.toString().includes('Server running')) {
        resolve(child);
      }
    });
  });
