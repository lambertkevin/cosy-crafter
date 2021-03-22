import fs from "fs";
import path from "path";
import resnap from "resnap";
import fsExtra from "fs-extra";
import NodeRsa from "node-rsa";
import { expect, AssertionError } from "chai";
import CustomError from "@cosy/custom-error";

const resetCache = resnap();

describe("@cosy/rsa-utils", () => {
  beforeEach(() => {
    resetCache();
    delete process.env.RSA_KEYS_LOCATION;
    delete process.env.AUTH_RSA_KEYS_NAME;
    delete process.env.POOL_RSA_KEYS_NAME;
  });

  before(() => {
    const keys = new NodeRsa({ b: 512 }).generateKeyPair();
    const priv = keys.exportKey("pkcs1-private-pem");
    const pub = keys.exportKey("pkcs8-public-pem");
    fs.mkdirSync(path.resolve("./.keys"));
    fs.writeFileSync(path.resolve("./.keys/auth"), priv);
    fs.writeFileSync(path.resolve("./.keys/auth.pem"), pub);
  });

  after(() => {
    fsExtra.removeSync(path.resolve("./.keys"));
  });

  describe("makeRsaPrivateDecrypter", () => {
    it("should throw an error if env variables are not set", () => {
      const { makeRsaPrivateDecrypter } = require("../index");

      try {
        makeRsaPrivateDecrypter();
        expect.fail("Function should have throw");
      } catch (e) {
        if (e instanceof AssertionError) {
          throw e;
        }

        expect(e).to.be.an("error").and.to.be.an.instanceOf(CustomError);
        expect(e.message).to.be.equal("Env variables are not set");
      }
    });

    it("should throw an error if key file doesn't exist", () => {
      process.env.RSA_KEYS_LOCATION = path.resolve("./.keys/");
      process.env.AUTH_RSA_KEYS_NAME = "not-existing";
      const { makeRsaPrivateDecrypter } = require("../index");

      try {
        makeRsaPrivateDecrypter();
        expect.fail("Function should have throw");
      } catch (e) {
        if (e instanceof AssertionError) {
          throw e;
        }

        expect(e).to.be.an("error").and.to.be.an.instanceOf(CustomError);
        expect(e.name).to.be.equal("KeyFileNotFound");
        expect(e.message).to.be.equal("Key file not found");
      }
    });

    it("should create the same decrypter with auth keytype, no keytype, and invalid param", () => {
      process.env.RSA_KEYS_LOCATION = path.resolve("./.keys/");
      process.env.AUTH_RSA_KEYS_NAME = "auth";
      const { makeRsaPrivateDecrypter } = require("../index");

      const decrypters = [
        makeRsaPrivateDecrypter(),
        makeRsaPrivateDecrypter("auth"),
        makeRsaPrivateDecrypter("pool"),
        makeRsaPrivateDecrypter(123),
        makeRsaPrivateDecrypter(new Error()),
        makeRsaPrivateDecrypter(null),
        makeRsaPrivateDecrypter(undefined),
      ];

      decrypters.forEach((decrypter, i) => {
        if (decrypters[i - 1]) {
          expect(decrypter).to.deep.include(decrypters[i - 1]);
        }
      });
    });
  });

  describe("makeRsaPrivateEncrypter", () => {
    it("should throw an error if env variables are not set", () => {
      const { makeRsaPrivateEncrypter } = require("../index");

      try {
        makeRsaPrivateEncrypter();
        expect.fail("Function should have throw");
      } catch (e) {
        if (e instanceof AssertionError) {
          throw e;
        }

        expect(e).to.be.an("error").and.to.be.an.instanceOf(CustomError);
        expect(e.message).to.be.equal("Env variables are not set");
      }
    });

    it("should throw an error if key file doesn't exist", () => {
      process.env.RSA_KEYS_LOCATION = path.resolve("./.keys/");
      process.env.AUTH_RSA_KEYS_NAME = "not-existing";
      const { makeRsaPrivateEncrypter } = require("../index");

      try {
        makeRsaPrivateEncrypter();
        expect.fail("Function should have throw");
      } catch (e) {
        if (e instanceof AssertionError) {
          throw e;
        }

        expect(e).to.be.an("error").and.to.be.an.instanceOf(CustomError);
        expect(e.name).to.be.equal("KeyFileNotFound");
        expect(e.message).to.be.equal("Key file not found");
      }
    });

    it("should create the same decrypter with auth keytype, no keytype, and invalid param", () => {
      process.env.RSA_KEYS_LOCATION = path.resolve("./.keys/");
      process.env.AUTH_RSA_KEYS_NAME = "auth";
      const { makeRsaPrivateEncrypter } = require("../index");

      const decrypters = [
        makeRsaPrivateEncrypter(),
        makeRsaPrivateEncrypter("auth"),
        makeRsaPrivateEncrypter("pool"),
        makeRsaPrivateEncrypter(123),
        makeRsaPrivateEncrypter(new Error()),
        makeRsaPrivateEncrypter(null),
        makeRsaPrivateEncrypter(undefined),
      ];

      decrypters.forEach((decrypter, i) => {
        if (decrypters[i - 1]) {
          expect(decrypter).to.deep.include(decrypters[i - 1]);
        }
      });
    });
  });

  describe("makeRsaPublicDecrypter", () => {
    it("should throw an error if env variables are not set", () => {
      const { makeRsaPublicDecrypter } = require("../index");

      try {
        makeRsaPublicDecrypter();
        expect.fail("Function should have throw");
      } catch (e) {
        if (e instanceof AssertionError) {
          throw e;
        }

        expect(e).to.be.an("error").and.to.be.an.instanceOf(CustomError);
        expect(e.message).to.be.equal("Env variables are not set");
      }
    });

    it("should throw an error if key file doesn't exist", () => {
      process.env.RSA_KEYS_LOCATION = path.resolve("./.keys/");
      process.env.AUTH_RSA_KEYS_NAME = "not-existing";
      const { makeRsaPublicDecrypter } = require("../index");

      try {
        makeRsaPublicDecrypter();
        expect.fail("Function should have throw");
      } catch (e) {
        if (e instanceof AssertionError) {
          throw e;
        }

        expect(e).to.be.an("error").and.to.be.an.instanceOf(CustomError);
        expect(e.name).to.be.equal("KeyFileNotFound");
        expect(e.message).to.be.equal("Key file not found");
      }
    });

    it("should create the same decrypter with auth keytype, no keytype, and invalid param", () => {
      process.env.RSA_KEYS_LOCATION = path.resolve("./.keys/");
      process.env.AUTH_RSA_KEYS_NAME = "auth";
      const { makeRsaPublicDecrypter } = require("../index");

      const decrypters = [
        makeRsaPublicDecrypter(),
        makeRsaPublicDecrypter("auth"),
        makeRsaPublicDecrypter("pool"),
        makeRsaPublicDecrypter(123),
        makeRsaPublicDecrypter(new Error()),
        makeRsaPublicDecrypter(null),
        makeRsaPublicDecrypter(undefined),
      ];

      decrypters.forEach((decrypter, i) => {
        if (decrypters[i - 1]) {
          expect(decrypter).to.deep.include(decrypters[i - 1]);
        }
      });
    });
  });

  describe("makeRsaPublicEncrypter", () => {
    it("should throw an error if env variables are not set", () => {
      const { makeRsaPublicEncrypter } = require("../index");

      try {
        makeRsaPublicEncrypter();
        expect.fail("Function should have throw");
      } catch (e) {
        if (e instanceof AssertionError) {
          throw e;
        }

        expect(e).to.be.an("error").and.to.be.an.instanceOf(CustomError);
        expect(e.message).to.be.equal("Env variables are not set");
      }
    });

    it("should throw an error if key file doesn't exist", () => {
      process.env.RSA_KEYS_LOCATION = path.resolve("./.keys/");
      process.env.AUTH_RSA_KEYS_NAME = "not-existing";
      const { makeRsaPublicEncrypter } = require("../index");

      try {
        makeRsaPublicEncrypter();
        expect.fail("Function should have throw");
      } catch (e) {
        if (e instanceof AssertionError) {
          throw e;
        }

        expect(e).to.be.an("error").and.to.be.an.instanceOf(CustomError);
        expect(e.name).to.be.equal("KeyFileNotFound");
        expect(e.message).to.be.equal("Key file not found");
      }
    });

    it("should create the same decrypter with auth keytype, no keytype, and invalid param", () => {
      process.env.RSA_KEYS_LOCATION = path.resolve("./.keys/");
      process.env.AUTH_RSA_KEYS_NAME = "auth";
      const { makeRsaPublicEncrypter } = require("../index");

      const decrypters = [
        makeRsaPublicEncrypter(),
        makeRsaPublicEncrypter("auth"),
        makeRsaPublicEncrypter("pool"),
        makeRsaPublicEncrypter(123),
        makeRsaPublicEncrypter(new Error()),
        makeRsaPublicEncrypter(null),
        makeRsaPublicEncrypter(undefined),
      ];

      decrypters.forEach((decrypter, i) => {
        if (decrypters[i - 1]) {
          expect(decrypter).to.deep.include(decrypters[i - 1]);
        }
      });
    });
  });

  describe("encrypt/decrypt", () => {
    it("should decrypt private and public encrypted", () => {
      process.env.RSA_KEYS_LOCATION = path.resolve("./.keys/");
      process.env.AUTH_RSA_KEYS_NAME = "auth";
      const {
        makeRsaPrivateDecrypter,
        makeRsaPublicEncrypter,
      } = require("../index");

      const decrypter = makeRsaPrivateDecrypter();
      const encrypter = makeRsaPublicEncrypter();

      const test = encrypter("test");
      const result = decrypter(test, "utf8");

      expect(result).to.be.equal("test");
    });

    it("should decrypt public and private encrypted", () => {
      process.env.RSA_KEYS_LOCATION = path.resolve("./.keys/");
      process.env.AUTH_RSA_KEYS_NAME = "auth";
      const {
        makeRsaPublicDecrypter,
        makeRsaPrivateEncrypter,
      } = require("../index");

      const decrypter = makeRsaPublicDecrypter();
      const encrypter = makeRsaPrivateEncrypter();

      const test = encrypter("test");
      const result = decrypter(test, "utf8");

      expect(result).to.be.equal("test");
    });

    it("should not decrypt public and public encrypted", () => {
      process.env.RSA_KEYS_LOCATION = path.resolve("./.keys/");
      process.env.AUTH_RSA_KEYS_NAME = "auth";
      const {
        makeRsaPublicDecrypter,
        makeRsaPublicEncrypter,
      } = require("../index");

      const decrypter = makeRsaPublicDecrypter();
      const encrypter = makeRsaPublicEncrypter();

      try {
        const test = encrypter("test");
        decrypter(test, "utf8");
        expect.fail("Function should have been thrown");
      } catch (e) {
        if (e instanceof AssertionError) {
          throw e;
        }
        expect(e).to.be.an("error");
        expect(e?.message).to.be.equal(
          "Error during decryption (probably incorrect key). Original error: Error: error:0407008A:rsa routines:RSA_padding_check_PKCS1_type_1:invalid padding"
        );
      }
    });

    it("should not decrypt private and private encrypted", () => {
      process.env.RSA_KEYS_LOCATION = path.resolve("./.keys/");
      process.env.AUTH_RSA_KEYS_NAME = "auth";
      const {
        makeRsaPrivateDecrypter,
        makeRsaPrivateEncrypter,
      } = require("../index");

      const decrypter = makeRsaPrivateDecrypter();
      const encrypter = makeRsaPrivateEncrypter();

      try {
        const test = encrypter("test");
        decrypter(test, "utf8");
        expect.fail("Function should have been thrown");
      } catch (e) {
        if (e instanceof AssertionError) {
          throw e;
        }
        expect(e).to.be.an("error");
        expect(e?.message).to.be.equal(
          "Error during decryption (probably incorrect key). Original error: Error: error:04099079:rsa routines:RSA_padding_check_PKCS1_OAEP_mgf1:oaep decoding error"
        );
      }
    });

    it("should encrypt in base64 and decrypt returning utf8", () => {
      process.env.RSA_KEYS_LOCATION = path.resolve("./.keys/");
      process.env.AUTH_RSA_KEYS_NAME = "auth";
      const {
        makeRsaPrivateDecrypter,
        makeRsaPrivateEncrypter,
        makeRsaPublicDecrypter,
        makeRsaPublicEncrypter,
      } = require("../index");

      const publicEncrypter = makeRsaPublicEncrypter();
      const privateDecrypter = makeRsaPrivateDecrypter();
      const publicDecrypter = makeRsaPublicDecrypter();
      const privateEncrypter = makeRsaPrivateEncrypter();

      const test1 = publicEncrypter("test1");
      const test2 = privateEncrypter("test2");
      const response1 = privateDecrypter(test1);
      const response2 = publicDecrypter(test2);

      expect(response1).to.be.equal("test1");
      expect(response2).to.be.equal("test2");
    });
  });
});
