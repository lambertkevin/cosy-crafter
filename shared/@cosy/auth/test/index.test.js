import fs from "fs";
import path from "path";
import resnap from "resnap";
import proxyquire from "proxyquire";
import CustomError from "@cosy/custom-error";
import { expect, AssertionError } from "chai";
import { startAuthService } from "./utils/authUtils";

const reset = resnap();

const credentialsPath = path.resolve("./.credentials");
if (fs.existsSync(credentialsPath)) {
  fs.unlinkSync(credentialsPath);
}

describe("@cosy/auth unit tests", () => {
  describe("Require", () => {
    beforeEach(() => {
      reset();
      delete process.env.AUTH_SERVICE_NAME;
      delete process.env.AUTH_SERVICE_PORT;
    });

    it("should throw if env vars are not set", () => {
      try {
        require("../index");
        expect.fail("Function should have thrown");
      } catch (e) {
        if (e instanceof AssertionError) {
          throw e;
        }

        expect(e).to.be.an("error").and.to.be.an.instanceOf(CustomError);
        expect(e?.name).to.be.equal("EnvVariableNotSet");
      }
    });

    it("should throw if no config file is found", () => {
      try {
        process.env.AUTH_SERVICE_NAME = "test";
        process.env.AUTH_SERVICE_PORT = "123";

        require("../");
        expect.fail("Function should have thrown");
      } catch (e) {
        if (e instanceof AssertionError) {
          throw e;
        }
        expect(e).to.be.an("error").and.to.be.an.instanceOf(CustomError);
        expect(e?.name).to.be.equal("RequireConfigError");
      }
    });
  });

  describe("register", () => {
    let authServiceChild;
    before(async () => {
      process.env.AUTH_SERVICE_NAME = "localhost";
      process.env.AUTH_SERVICE_PORT = "3002";
      authServiceChild = await startAuthService();
    });

    after(() => {
      authServiceChild.kill("SIGINT");
    });

    beforeEach(() => {
      reset();
      process.env.AUTH_SERVICE_NAME = "localhost";
      process.env.AUTH_SERVICE_PORT = "3002";
      process.env.RSA_KEYS_LOCATION = path.resolve("./test/config/keys/");
      process.env.AUTH_RSA_KEYS_NAME = "test";
    });

    it("should exit process if the registering returned an empty string", async () => {
      // noCallThru necessary since the file doesn't exist at all
      const { register } = proxyquire.noCallThru().load("../index", {
        [path.resolve("./src/config")]: {
          identifier: "test-identifier",
        },
        axios: {
          post: () =>
            Promise.resolve({
              data: {
                data: "",
              },
            }),
        },
      });

      try {
        await register();
        expect.fail("Promise should have been rejected");
      } catch (e) {
        if (e instanceof AssertionError) {
          throw e;
        }

        expect(e).to.be.an("error").and.to.be.an.instanceOf(CustomError);
        expect(e?.name).to.be.equal("ProcessExitError");
        expect(e?.details?.message).to.be.equal("Couldn't get a key");
      }
    });

    it("should exit process if the service couldn't register", async () => {
      process.env.AUTH_RSA_KEYS_NAME = "other";
      // noCallThru necessary since the file doesn't exist at all
      const { register } = proxyquire.noCallThru().load("../index", {
        [path.resolve("./src/config")]: {
          identifier: "test-identifier",
        },
      });

      try {
        await register();
        expect.fail("Promise should have been rejected");
      } catch (e) {
        if (e instanceof AssertionError) {
          throw e;
        }

        expect(e).to.be.an("error").and.to.be.an.instanceOf(CustomError);
        expect(e?.name).to.be.equal("ProcessExitError");
        // Auth-service respond 401 Unauthorized cause key is wrong
        expect(e?.details?.message).to.be.equal(
          "Request failed with status code 401"
        );
      }
    });

    it("should register and create credentials file", () => {
      // noCallThru necessary since the file doesn't exist at all
      const { register } = proxyquire.noCallThru().load("../index", {
        [path.resolve("./src/config")]: {
          identifier: "test-identifier",
        },
      });

      return register().then(() => {
        const credentials = JSON.parse(
          fs.readFileSync(credentialsPath, "utf8")
        );
        expect(credentials).to.have.keys("identifier", "key");
        expect(credentials?.identifier).to.be.equal("test-identifier");
      });
    });
  });

  describe("login", () => {
    let authServiceChild;
    before(async () => {
      process.env.AUTH_SERVICE_NAME = "localhost";
      process.env.AUTH_SERVICE_PORT = "3002";
      process.env.RSA_KEYS_LOCATION = path.resolve("./test/config/keys/");
      process.env.AUTH_RSA_KEYS_NAME = "test";

      authServiceChild = await startAuthService();

      // noCallThru necessary since the file doesn't exist at all
      const { register } = proxyquire.noCallThru().load("../index", {
        [path.resolve("./src/config")]: {
          identifier: "test-identifier",
        },
      });

      await register();
    });

    after(() => {
      authServiceChild.kill("SIGINT");
      if (fs.existsSync(credentialsPath)) {
        fs.unlinkSync(credentialsPath);
      }
    });

    beforeEach(async () => {
      reset();
    });

    it("should fail if service has no credentials", async () => {
      fs.renameSync(credentialsPath, `${credentialsPath}.bak`);
      const { login } = proxyquire.noCallThru().load("../index", {
        [path.resolve("./src/config")]: {
          identifier: "test-identifier",
        },
      });

      try {
        await login();
        expect.fail("Promise should have been rejected");
      } catch (e) {
        if (e instanceof AssertionError) {
          throw e;
        }

        expect(e).to.be.an("error").and.to.be.an.instanceOf(CustomError);
        expect(e?.name).to.be.equal("ProcessExitError");
        expect(e?.details?.name).to.be.equal("NoCredentialsError");
      } finally {
        fs.renameSync(`${credentialsPath}.bak`, credentialsPath);
      }
    });

    it("should fail if service has no key in credentials", async () => {
      const { login } = proxyquire.noCallThru().load("../index", {
        [path.resolve("./src/config")]: {
          identifier: "test-identifier",
        },
        fs: {
          existsSync: (path) => {
            if (path === credentialsPath) {
              return true;
            }
            throw new Error("Should never get there");
          },
          readFileSync: () => JSON.stringify({ identifier: "test" }),
        },
      });

      try {
        await login();
        expect.fail("Promise should have been rejected");
      } catch (e) {
        if (e instanceof AssertionError) {
          throw e;
        }

        expect(e).to.be.an("error").and.to.be.an.instanceOf(CustomError);
        expect(e?.name).to.be.equal("ProcessExitError");
        expect(e?.details?.name).to.be.equal("CredentialsMalformedError");
      }
    });

    it("should fail if service has no identifier in credentials", async () => {
      const { login } = proxyquire.noCallThru().load("../index", {
        [path.resolve("./src/config")]: {
          identifier: "test-identifier",
        },
        fs: {
          existsSync: (path) => {
            if (path === credentialsPath) {
              return true;
            }
            throw new Error("Should never get there");
          },
          readFileSync: () => JSON.stringify({ key: "test" }),
        },
      });

      try {
        await login();
        expect.fail("Promise should have been rejected");
      } catch (e) {
        if (e instanceof AssertionError) {
          throw e;
        }

        expect(e).to.be.an("error").and.to.be.an.instanceOf(CustomError);
        expect(e?.name).to.be.equal("ProcessExitError");
        expect(e?.details?.name).to.be.equal("CredentialsMalformedError");
      }
    });

    it("should succeed login", async () => {
      const { login } = proxyquire.noCallThru().load("../index", {
        [path.resolve("./src/config")]: {
          identifier: "test-identifier",
        },
      });

      return login().then((res) => {
        expect(res).to.have.keys("accessToken", "refreshToken");
      });
    });
  });

  describe("auth", () => {
    let authServiceChild;
    beforeEach(async () => {
      process.env.AUTH_SERVICE_NAME = "localhost";
      process.env.AUTH_SERVICE_PORT = "3002";
      process.env.RSA_KEYS_LOCATION = path.resolve("./test/config/keys/");
      process.env.AUTH_RSA_KEYS_NAME = "test";

      authServiceChild = await startAuthService();
    });

    afterEach(() => {
      authServiceChild.kill("SIGINT");
      if (fs.existsSync(credentialsPath)) {
        fs.unlinkSync(credentialsPath);
      }
    });

    it("should call register then login if service has no credentials", () => {
      // noCallThru necessary since the file doesn't exist at all
      const { auth } = proxyquire.noCallThru().load("../index", {
        [path.resolve("./src/config")]: {
          identifier: "test-identifier",
        },
      });

      return auth().then((res) => {
        expect(res).to.have.keys("accessToken", "refreshToken");
      });
    });

    it("should call only register if service has credentials", async () => {
      if (fs.existsSync(credentialsPath)) {
        fs.unlinkSync(credentialsPath);
      }
      // noCallThru necessary since the file doesn't exist at all
      const { register, auth } = proxyquire.noCallThru().load("../index", {
        [path.resolve("./src/config")]: {
          identifier: "test-identifier",
        },
      });

      await register();

      return auth().then((res) => {
        expect(res).to.have.keys("accessToken", "refreshToken");
      });
    });
  });

  describe("refresh", () => {
    let authServiceChild;
    before(async () => {
      process.env.AUTH_SERVICE_NAME = "localhost";
      process.env.AUTH_SERVICE_PORT = "3002";
      process.env.RSA_KEYS_LOCATION = path.resolve("./test/config/keys/");
      process.env.AUTH_RSA_KEYS_NAME = "test";
      authServiceChild = await startAuthService();
    });

    after(() => {
      authServiceChild.kill("SIGINT");
    });

    it("should fail refreshing if the tokens are empty", async () => {
      const { refresh } = proxyquire.noCallThru().load("../index", {
        [path.resolve("./src/config")]: {
          identifier: "test-identifier",
        },
      });

      try {
        await refresh();
        expect.fail("Promise should have been rejected");
      } catch (e) {
        if (e instanceof AssertionError) {
          throw e;
        }

        expect(e).to.be.an("error").and.to.be.an.instanceOf(CustomError);
        expect(e?.name).to.be.equal("RefreshUnauthorizedError");
        expect(e?.code).to.be.equal(401);
        expect(e?.details?.response?.status).to.be.equal(400);
      }
    });

    it("should fail refreshing if the tokens are invalid", async () => {
      const { refresh, tokens } = proxyquire.noCallThru().load("../index", {
        [path.resolve("./src/config")]: {
          identifier: "test-identifier",
        },
      });

      tokens.accessToken = "123";
      tokens.refreshToken = "456";

      try {
        await refresh();
        expect.fail("Promise should have been rejected");
      } catch (e) {
        if (e instanceof AssertionError) {
          throw e;
        }

        expect(e).to.be.an("error").and.to.be.an.instanceOf(CustomError);
        expect(e?.name).to.be.equal("RefreshUnauthorizedError");
        expect(e?.code).to.be.equal(401);
        expect(e?.details?.response?.status).to.be.equal(401);
      }
    });

    it("should fail refreshing if the auth-service returned no tokens", async () => {
      const { refresh } = proxyquire.noCallThru().load("../index", {
        [path.resolve("./src/config")]: {
          identifier: "test-identifier",
        },
        axios: {
          post: () =>
            Promise.resolve({
              data: {
                data: {},
              },
            }),
        },
      });

      try {
        await refresh();
        expect.fail("Promise should have been rejected");
      } catch (e) {
        if (e instanceof AssertionError) {
          throw e;
        }

        expect(e).to.be.an("error").and.to.be.an.instanceOf(CustomError);
        expect(e?.name).to.be.equal("AuthServiceFailedError");
        expect(e?.code).to.be.equal(503);
      }
    });

    it("should succeed refreshing", async () => {
      const { auth, refresh } = proxyquire.noCallThru().load("../index", {
        [path.resolve("./src/config")]: {
          identifier: "test-identifier",
        },
      });

      await auth();
      return refresh().then((res) => {
        expect(res).to.have.keys("accessToken", "refreshToken");
      });
    });
  });
});
