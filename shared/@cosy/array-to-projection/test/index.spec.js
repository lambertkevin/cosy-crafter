import { expect } from "chai";
import arrayToProjection from "../index";

describe("@cosy/array-to-prjection test units", () => {
  describe("Fails", () => {
    it("should fail if fields is not an array and returns an empty object", () => {
      const projections = [
        arrayToProjection(),
        arrayToProjection(null),
        arrayToProjection(true),
        arrayToProjection(123),
        arrayToProjection("test"),
        arrayToProjection({ test: true }),
        arrayToProjection(new Error()),
      ];

      projections.forEach(
        (projection) => expect(projection).to.be.an("object").and.to.be.empty
      );
    });

    it("should fail if fields is an array of anything but strings and returns an empty object", () => {
      const fields = [null, undefined, 123, { test: true }, true, new Error()];
      const hiddenFields = arrayToProjection(fields);
      expect(hiddenFields).to.be.an("object").and.to.be.empty;
    });
  });

  describe("Success", () => {
    it("should succeed creating an object representing projection from an array of strings", () => {
      const fields = ["a", "b", "c", "e"];
      const hiddenFields = arrayToProjection(fields);

      expect(hiddenFields).to.be.an("object").and.to.deep.include({
        a: false,
        b: false,
        c: false,
        e: false,
      });
    });
  });
});
