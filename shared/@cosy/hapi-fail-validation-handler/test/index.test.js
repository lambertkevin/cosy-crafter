import fs from "fs";
import path from "path";
import { Boom } from "@hapi/boom";
import proxyquire from "proxyquire";
import chai, { expect, AssertionError } from "chai";

let logguedError;
const { default: failValidationHandler } = proxyquire("../index.js", {
  "@cosy/logger": {
    logger: {
      warn: (message, payload) => {
        logguedError = { message, payload };
      },
    },
  },
});

describe("hapi-fail-validation-handler unit tests", () => {
  it("should continue if the error arg is not an Error", async () => {
    const h = {
      continue: "ok",
    };
    const validation = await failValidationHandler(null, h, null);
    expect(validation).to.be.equal(h.continue);
  });

  it("should throw the same error if the error arg is not a hapi error", async () => {
    const error = new Error();
    try {
      await failValidationHandler(null, null, error);
      expect.fail("Function should have thrown");
    } catch (e) {
      if (e instanceof AssertionError) {
        throw e;
      }

      expect(e).to.equal(error);
    }
  });

  it("should log a safe version of an error if it contains buffer or stream", async () => {
    const error = new Error();
    error._original = {
      buffer: Buffer.alloc(0),
      stream: fs.createReadStream(path.resolve("./package.json")),
      otherKey: "test",
    };

    try {
      await failValidationHandler(null, null, error);
      expect.fail("Promise should have been rejected");
    } catch (e) {
      if (e instanceof AssertionError) {
        throw e;
      }

      expect(logguedError).to.deep.include({
        message: "ValidationError",
        payload: {
          _original: {
            buffer: "Buffer<Filtered>",
            stream: "Readable<Filtered>",
            otherKey: "test",
          },
        },
      });
    } finally {
      logguedError = undefined;
    }
  });

  describe("Production ENV", () => {
    before(() => {
      process.env.NODE_ENV_OLD = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";
    });

    after(() => {
      process.env.NODE_ENV = process.env.NODE_ENV_OLD;
    });

    it("should return a normalized error", async () => {
      const error = new Error();
      error._original = { key: "test" };

      try {
        await failValidationHandler(null, null, error);
        expect.fail("Function should have thrown");
      } catch (e) {
        if (e instanceof AssertionError) {
          throw e;
        }
        expect(e).to.be.an("error").and.to.be.an.instanceOf(Boom);
        expect(e?.output).to.deep.include({
          statusCode: 400,
          payload: {
            statusCode: 400,
            error: "Bad Request",
            message: "Invalid request payload input",
          },
        });
      }
    });
  });

  describe("Other ENV", () => {
    it("should return a normalized error", async () => {
      const error = new Error();
      error._original = { key: "test" };

      try {
        await failValidationHandler(null, null, error);
        expect.fail("Function should have thrown");
      } catch (e) {
        if (e instanceof AssertionError) {
          throw e;
        }
        expect(e).to.be.equal(error);
      }
    });
  });
});
