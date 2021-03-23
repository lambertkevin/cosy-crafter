import joi from "joi";
import CustomError from "@cosy/custom-error";
import { expect, AssertionError } from "chai";
import { standardizeSchema, schemaKeys } from "../index";

describe("schema-utils unit tests", () => {
  describe("standardizeSchema", () => {
    describe("Fails", () => {
      it("should fail if schema is undefined", () => {
        try {
          standardizeSchema();
          expect.fail("Function should have thrown");
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }

          expect(e).to.be.an("error").and.to.be.an.instanceOf(CustomError);
          expect(e?.name).to.be.equal("SchemaInvalidError");
        }
      });

      it("should fail if schema is null", () => {
        try {
          standardizeSchema(null);
          expect.fail("Function should have thrown");
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }

          expect(e).to.be.an("error").and.to.be.an.instanceOf(CustomError);
          expect(e?.name).to.be.equal("SchemaInvalidError");
        }
      });

      it("should fail if schema is not an object", () => {
        try {
          standardizeSchema("test");
          expect.fail("Function should have thrown");
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }

          expect(e).to.be.an("error").and.to.be.an.instanceOf(CustomError);
          expect(e?.name).to.be.equal("SchemaInvalidError");
        }
      });

      it("should fail if schema is not a valid object", () => {
        try {
          standardizeSchema({ test: "azerty" });
          expect.fail("Function should have thrown");
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }

          expect(e).to.be.an("error").and.to.be.an.instanceOf(CustomError);
          expect(e?.name).to.be.equal("SchemaInvalidError");
        }
      });
    });

    describe("Success", () => {
      it("should create a standardize simple schema", () => {
        const schema = joi.string();
        const standardizedSchema = standardizeSchema(schema, false);
        const test = {
          statusCode: 200,
          data: "test",
          meta: {},
        };

        return standardizedSchema.validateAsync(test);
      });

      it("should create a standardize array of schema", () => {
        const schema = joi.string();
        const standardizedSchema = standardizeSchema(schema, true, 123);
        const test = {
          statusCode: 456,
          data: ["test"],
          meta: {},
        };

        return standardizedSchema.validateAsync(test);
      });
    });
  });

  describe("schemaKeys", () => {
    describe("Fails", () => {
      it("should return the keys of a non object schema", () => {
        try {
          const schema = "test";
          schemaKeys(schema);
          expect.fail("Func should have thrown");
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }

          expect(e).to.be.an("error").and.to.be.an.instanceOf(CustomError);
          expect(e?.name).to.be.equal("SchemaInvalidError");
        }
      });
    });

    describe("Success", () => {
      it("should return the keys of an object schema", () => {
        const schema = joi.object({ attr1: joi.any(), attr2: joi.any() });
        const keys = schemaKeys(schema);

        expect(keys).to.have.members(["attr1", "attr2"]);
      });

      it("should return the keys of a non object schema", () => {
        const schema = joi.string();
        const keys = schemaKeys(schema);

        expect(keys).to.be.an("array").and.to.be.empty;
      });
    });
  });
});
