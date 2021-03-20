import jwt from "jsonwebtoken";
import { Boom } from "@hapi/boom";
import chaiInterface from "chai-interface";
import CustomError from "@cosy/custom-error";
import chai, { expect, AssertionError } from "chai";
import { axiosErrorBoomifier, makeAxiosInstance } from "../index";

chai.use(chaiInterface);

describe("Axios utils unit tests", () => {
  describe("axiosErrorBoomifier", () => {
    it("should return a Boom error 418", () => {
      const error = new Error("Test 418 error");
      error.isAxiosError = true;
      error.response = {};
      error.response.data = {
        statusCode: 418,
      };
      const testError = axiosErrorBoomifier(error);

      expect(testError).to.be.an("error").and.to.be.an.instanceOf(Boom);
      expect(testError?.output).to.deep.include({
        statusCode: 418,
        payload: {
          statusCode: 418,
          error: "I'm a teapot",
          message: "I'm a teapot",
        },
      });
    });

    it("should return a Boom error 500", () => {
      const error = new Error("Test 418 error");
      error.isAxiosError = false;
      error.response = {};
      error.response.data = {
        statusCode: 418,
      };
      const testError = axiosErrorBoomifier(error);

      expect(testError).to.be.an("error").and.to.be.an.instanceOf(Boom);
      expect(testError?.output).to.deep.include({
        statusCode: 500,
        payload: {
          statusCode: 500,
          error: "Internal Server Error",
          message: "An internal server error occurred",
        },
      });
    });

    it("should return another Boom error 500", () => {
      const error = new Error();
      const testError = axiosErrorBoomifier(error);

      expect(testError).to.be.an("error").and.to.be.an.instanceOf(Boom);
      expect(testError?.output).to.deep.include({
        statusCode: 500,
        payload: {
          statusCode: 500,
          error: "Internal Server Error",
          message: "An internal server error occurred",
        },
      });
    });

    it("should return another Boom error 401", () => {
      const error = new Error();
      error.statusCode = 401;
      const testError = axiosErrorBoomifier(error);

      expect(testError).to.be.an("error").and.to.be.an.instanceOf(Boom);
      expect(testError?.output).to.deep.include({
        statusCode: 401,
        payload: {
          statusCode: 401,
          error: "Unauthorized",
          message: "Unauthorized",
        },
      });
    });

    it("should return a Boom error 400", () => {
      const error = new Error("Test 418 error");
      error.isAxiosError = true;
      const testError = axiosErrorBoomifier(error);

      expect(testError).to.be.an("error").and.to.be.an.instanceOf(Boom);
      expect(testError?.output).to.deep.include({
        statusCode: 400,
        payload: {
          statusCode: 400,
          error: "Bad Request",
          message: "Test 418 error",
        },
      });
    });
  });

  describe("makeAxiosInstance", () => {
    before(() => {
      process.env.SERVICE_JWT_SECRET = "test";
    });

    after(() => {
      process.env.SERVICE_JWT_SECRET = undefined;
    });

    describe("Fails", () => {
      it("should fail if refreshFunc is not a function", () => {
        try {
          makeAxiosInstance(null);
          expect.fail("Function should have thrown");
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }
          expect(e).to.be.an("error").and.to.be.an.instanceOf(CustomError);
          expect(e?.name).to.be.equal("RefreshFuncInvalidError");
          expect(e?.message).to.be.equal(
            "RefreshFunc must be a function returning a Promise"
          );
        }
      });
    });

    describe("Success", () => {
      it("should succeed creating an instance", () => {
        const AxiosInstanceInterface = {
          defaults: Object,
          interceptors: {
            request: Object,
            response: Object,
          },
          getUri: Function,
          request: Function,
          get: Function,
          delete: Function,
          head: Function,
          options: Function,
          post: Function,
          put: Function,
          patch: Function,
        };
        const fakeRefresh = () => {};
        const instance = makeAxiosInstance(fakeRefresh);

        expect(instance).to.have.interface(AxiosInstanceInterface);
      });

      it("should succeed make a request", () => {
        const mockRefresh = () => {};
        const instance = makeAxiosInstance(mockRefresh);
        return instance.get("http://google.com");
      });

      it("should not throw if refreshFunc is not async", async () => {
        let triggered = false;
        const fakeToken = jwt.sign({}, process.env.SERVICE_JWT_SECRET, {
          expiresIn: "-1s",
        });
        const mockRefresh = () => {
          triggered = true;

          return {
            accessToken: "new-token",
          };
        };

        const instance = makeAxiosInstance(mockRefresh);
        await instance.get("http://google.com", {
          headers: {
            authorization: fakeToken,
          },
        });

        expect(triggered).to.be.true;
      });

      it("should try to refresh the tokens if it is expired", async () => {
        let triggered = false;
        const fakeToken = jwt.sign({}, process.env.SERVICE_JWT_SECRET, {
          expiresIn: "-1s",
        });
        const mockRefresh = () =>
          new Promise((resolve) => {
            triggered = true;

            resolve({
              accessToken: "new-token",
            });
          });

        const instance = makeAxiosInstance(mockRefresh);
        await instance.get("http://google.com", {
          headers: {
            authorization: fakeToken,
          },
        });

        expect(triggered).to.be.true;
      });

      it("should not refresh the tokens if it is valid", async () => {
        let triggered = false;
        const fakeToken = jwt.sign({}, process.env.SERVICE_JWT_SECRET, {
          expiresIn: "1s",
        });
        const mockRefresh = () =>
          new Promise((resolve) => {
            triggered = true;

            resolve({
              accessToken: "new-token",
            });
          });

        const instance = makeAxiosInstance(mockRefresh);
        await instance.get("http://google.com", {
          headers: {
            authorization: fakeToken,
          },
        });

        expect(triggered).to.be.false;
      });
    });
  });
});
