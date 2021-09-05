import path from "path";
import { expect } from "chai";
import resetCache from "resnap";
import proxyquire from "proxyquire";
import { transports } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import SentryTransport from "winston-transport-sentry-node";

describe("@cosy/logger unit tests", () => {
  beforeEach(resetCache());

  describe("raw format", () => {
    it("should mutate a log to add stringified error to it", () => {
      const { raw } = require("../index");
      const log = { level: "info", message: "test", test: 123 };
      const { transform } = raw();

      expect(transform(log)).to.deep.include({
        level: "info",
        message: "test",
        test: 123,
        raw: '{\n  "level": "info",\n  "message": "test",\n  "test": 123\n}',
      });
    });
  });

  describe("NODE_ENV production", () => {
    before(() => {
      process.env.NODE_ENV = "production";
    });

    it("should import a logger with 3 transports including a Sentry one", () => {
      const { logger } = require("../index");
      const transportPipes = logger?._readableState?.pipes ?? [];

      expect(transportPipes).to.have.lengthOf(3);
      expect(transportPipes?.[0]).to.be.an.instanceOf(DailyRotateFile);
      expect(transportPipes?.[1]).to.be.an.instanceOf(DailyRotateFile);
      expect(transportPipes?.[2]).to.be.an.instanceOf(SentryTransport);
    });
  });

  describe("NODE_ENV development", () => {
    before(() => {
      process.env.NODE_ENV = "development";
    });

    it("should import a logger with 3 transports including a Console one", () => {
      const { logger } = require("../index");
      const transportPipes = logger?._readableState?.pipes ?? [];

      expect(transportPipes).to.have.lengthOf(3);
      expect(transportPipes?.[0]).to.be.an.instanceOf(DailyRotateFile);
      expect(transportPipes?.[1]).to.be.an.instanceOf(DailyRotateFile);
      expect(transportPipes?.[2]).to.be.an.instanceOf(transports.Console);
    });

    it("should log respecting formats and colors without SPLAT", () => {
      const logs = [];
      // replace normal stdout to push into logs
      process.stdout._orig_write = process.stdout.write;
      process.stdout.write = (data) => {
        logs.push(data);
      };

      const { logger } = proxyquire("../index", {
        "winston-daily-rotate-file": transports.Console,
      });

      const now = "" + Date.now();
      logger.info("test");

      //{"message":"test","level":"info","ms":"+0ms","timestamp":1616344216921}\n
      const regex = new RegExp(
        `^{"level|message":".*","level|message":".*","ms":"\\+\\dms","timestamp":${now.substr(
          0,
          now.length - 4
        )}[0-9]{4}}\\n$`
      );

      // reset
      process.stdout.write = process.stdout._orig_write;

      expect(logs[0]).to.match(regex);
      expect(logs[1]).to.be.equal("\u001b[32minfo: test\u001b[39m\n");
    });

    it("should log respecting formats and colors with SPLAT", () => {
      const logs = [];
      // replace normal stdout to push into logs
      process.stdout._orig_write = process.stdout.write;
      process.stdout.write = (data) => {
        logs.push(data);
      };

      const { logger } = proxyquire("../index", {
        "winston-daily-rotate-file": transports.Console,
      });

      const now = "" + Date.now();
      logger.info("test", "test splat");

      //{"message":"test","level":"info","ms":"+0ms","timestamp":1616344216921}\n
      const regex = new RegExp(
        `^{"level|message":".*","level|message":".*","ms":"\\+\\dms","timestamp":${now.substr(
          0,
          now.length - 4
        )}[0-9]{4}}\\n$`
      );

      // reset
      process.stdout.write = process.stdout._orig_write;

      expect(logs[0]).to.match(regex);
      expect(logs[1]).to.be.equal(
        '\u001b[32minfo: test\u001b[39m\n[\n  "test splat"\n]\n'
      );
    });
  });

  describe("NODE_ENV test", () => {
    before(() => {
      process.env.NODE_ENV = "test";
    });

    it("should import a logger with 3 transports", () => {
      const { logger } = require("../index");
      const transportPipes = logger?._readableState?.pipes ?? [];

      expect(transportPipes).to.have.lengthOf(3);
      expect(transportPipes?.[0]).to.be.an.instanceOf(DailyRotateFile);
      expect(transportPipes?.[1]).to.be.an.instanceOf(DailyRotateFile);
      expect(transportPipes?.[2]).to.be.an.instanceOf(transports.Console);
    });
  });
});
