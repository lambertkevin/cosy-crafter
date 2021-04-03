import path from "path";
import { spawn, exec } from "child_process";

/**
 * Start the auth-service locally as a child process spawn
 *
 * @return {Promise}
 */
export const startAuthService = () =>
  // Promise starting the auth-service locally
  new Promise((resolve, reject) => {
    console.log("\x1b[2m🔑 Auth-Service starting...\x1b[0m");
    const child = spawn("npm", ["run", "mock"], {
      cwd: path.resolve("./", "..", "..", "..", "services", "auth-service"),
      stdio: "pipe",
      env: {
        ...process.env,
        RSA_KEYS_LOCATION: path.resolve("./test/config/keys/"),
        AUTH_RSA_KEYS_NAME: "test",
      },
    });

    child.kill = () => new Promise((resolveKill, rejectKill) => {
      exec(`lsof -i tcp:${process.env.AUTH_SERVICE_PORT} | grep LISTEN | awk '{print $2}' | xargs kill -9`, (error) => {
        if (error) {
          rejectKill(new Error('Killing the auth-service subprocess failed'));
        } else {
          resolveKill();
        }
      });
    });

    child.on("exit", () => {
      console.log(`\x1b[43m🔑 Auth-Service (#${child.pid}) killed\x1b[0m`);
      reject(
        new Error("You must kill the process running on the auth-service port")
      );
    });

    child.stdout.on("data", (data) => {
      // Service is ready when it logs 'Server running'
      if (data.toString().includes("Server running")) {
        // prettier-ignore
        console.log(`\x1b[42m🔑 Auth-Service (#${child.pid}) spwaned:\x1b[0m ${data.toString().trim()}`);
        resolve(child);
      }
    });
  });

export default {
  startAuthService,
};
