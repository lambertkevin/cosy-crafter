import Boom from "@hapi/boom";
import { expect } from "chai";
import jsonApiStandardize, {
  reformat,
  standardizeError,
  standardizeResponse,
} from "../index";

describe("@cosy/json-api-standardize", () => {
  describe("reformat", () => {
    it("should reformat a payload without status code", () => {
      const reformated = reformat();

      expect(reformated).to.be.an("object").and.to.deep.include({
        statusCode: 200,
        data: {},
        meta: {},
      });
    });

    it("should reformat a payload with a valid status code", () => {
      const reformated = reformat(null, 123);

      expect(reformated).to.be.an("object").and.to.deep.include({
        statusCode: 123,
        data: null,
        meta: {},
      });
    });

    it("should reformat a payload with a invalid status code", () => {
      const reformated = reformat(null, "coucou");

      expect(reformated).to.be.an("object").and.to.deep.include({
        statusCode: 200,
        data: null,
        meta: {},
      });
    });

    it("should reformat a payload with status code as string", () => {
      const reformated = reformat(null, "123");

      expect(reformated).to.be.an("object").and.to.deep.include({
        statusCode: 123,
        data: null,
        meta: {},
      });
    });

    it("should not reformat a payload already reformatted", () => {
      const reformated = reformat(null, 202);
      const reformatedAgain = reformat(reformated, 500);

      expect(reformatedAgain).to.be.an("object").and.to.deep.include({
        statusCode: 202,
        data: null,
        meta: {},
      });
    });
  });

  describe("standardizeError", () => {
    it("should return the same Boom error if trying to standardize it", () => {
      const error = Boom.forbidden("test");
      const standardizedError = standardizeError(error);

      expect(standardizedError).to.be.equal(error);
    });

    it("should a bad implementation Boom error", () => {
      const error = new Error("other error");
      const standardizedError = standardizeError(error);

      expect(standardizedError)
        .to.be.an("error")
        .and.to.be.an.instanceOf(Boom.Boom);
      expect(standardizedError).to.deep.include({
        message: "other error",
        output: {
          statusCode: 500,
          payload: {
            statusCode: 500,
            error: "Internal Server Error",
            message: "An internal server error occurred",
          },
          headers: {},
        },
      });
    });
  });

  describe("standardizeResponse", () => {
    it("should return a bad implementation Boom if response is invalid", () => {
      const standardizedResponses = [
        standardizeResponse(),
        standardizeResponse(null),
        standardizeResponse(123),
        standardizeResponse("test"),
        standardizeResponse(new Error()),
        standardizeResponse({}),
        standardizeResponse({ notSource: {} }),
      ];

      standardizedResponses.forEach((standardizedResponse) =>
        expect(standardizedResponse)
          .to.be.an.instanceOf(Boom.Boom)
          .to.deep.include({
            message: "Response is invalid",
            output: {
              statusCode: 500,
              payload: {
                statusCode: 500,
                error: "Internal Server Error",
                message: "An internal server error occurred",
              },
              headers: {},
            },
          })
      );
    });

    it("should return a not found Boom if response source is null or undefined", () => {
      const standardizedResponses = [
        standardizeResponse({ source: null }),
        standardizeResponse({ source: undefined }),
      ];

      standardizedResponses.forEach((standardizedResponse) =>
        expect(standardizedResponse)
          .to.be.an.instanceOf(Boom.Boom)
          .to.deep.include({
            message:
              "The resource with that ID does not exist or has already been deleted.",
            output: {
              statusCode: 404,
              payload: {
                statusCode: 404,
                error: "Not Found",
                message:
                  "The resource with that ID does not exist or has already been deleted.",
              },
              headers: {},
            },
          })
      );
    });

    it("should mutate a response and standardize it without a status code", () => {
      const fakeResponse = { otherKey: 123, source: { id: "azerty" } };
      standardizeResponse(fakeResponse);

      expect(fakeResponse).to.deep.include({
        otherKey: 123,
        source: {
          statusCode: 200,
          data: {
            id: "azerty",
          },
          meta: {},
        },
      });
    });
  });

  describe("default export", () => {
    let onPreResponseHookFunc;
    const h = { continue: Symbol("h.continue") };
    const mockServer = {
      ext: (eventName, func) => (onPreResponseHookFunc = func),
    };

    afterEach(() => {
      onPreResponseHookFunc = undefined;
    });

    it("should ignore request coming from ignoredPlugin", () => {
      jsonApiStandardize.register(mockServer, {
        ignorePlugins: ["test-plugin"],
      });
      const fakeRequest = { route: { realm: { plugin: "test-plugin" } } };

      expect(onPreResponseHookFunc(fakeRequest, h)).to.be.equal(h.continue);
    });

    it("should ignore request if variety is not 'plain'", () => {
      jsonApiStandardize.register(mockServer);
      const fakeRequest = { response: { variety: "stream" } };
      const fakeRequest2 = { response: { variety: "buffer" } };

      expect(onPreResponseHookFunc(fakeRequest, h)).to.be.equal(h.continue);
      expect(onPreResponseHookFunc(fakeRequest2, h)).to.be.equal(h.continue);
    });

    it("should return a bad implmentation Boom error", () => {
      jsonApiStandardize.register(mockServer, {
        ignorePlugins: ["test-plugin"],
      });
      const fakeRequest = { response: new Error() };

      expect(onPreResponseHookFunc(fakeRequest, h))
        .to.be.an.instanceOf(Boom.Boom)
        .and.to.deep.include({
          output: {
            statusCode: 500,
            payload: {
              statusCode: 500,
              error: "Internal Server Error",
              message: "An internal server error occurred",
            },
            headers: {},
          },
        });
    });

    it("should return a tea pot Boom error", () => {
      jsonApiStandardize.register(mockServer);
      const fakeRequest = { response: Boom.teapot() };

      expect(onPreResponseHookFunc(fakeRequest, h))
        .to.be.an.instanceOf(Boom.Boom)
        .and.to.deep.include({
          output: {
            statusCode: 418,
            payload: {
              statusCode: 418,
              error: "I'm a teapot",
              message: "I'm a teapot",
            },
            headers: {},
          },
        });
    });

    it("should return standardized payload without status code", () => {
      jsonApiStandardize.register(mockServer);
      const fakeRequest = {
        response: { variety: "plain", source: { foo: "bar" } },
      };
      const returnedResponse = onPreResponseHookFunc(fakeRequest, h);

      expect(returnedResponse)
        .to.be.an("object")
        .and.to.deep.include({
          source: {
            statusCode: 200,
            data: { foo: "bar" },
            meta: {},
          },
        });
      expect(fakeRequest?.response).to.equal(returnedResponse);
    });
  });
});
