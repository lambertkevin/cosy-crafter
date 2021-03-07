import path from 'path';
import { expect, AssertionError } from 'chai';
import { getMp3Duration, getMp3ListDuration } from '../../src/utils/Mp3Utils';

describe('Mp3 Utils Unit Tests', () => {
  describe('getMp3Duration', () => {
    describe('Fails', () => {
      it('should fail get the duration of non existing file', async () => {
        try {
          await getMp3Duration(path.resolve('./test/files/non-existing.mp3'));
          expect.fail('Promise should have failed');
        } catch (error) {
          if (error instanceof AssertionError) {
            throw error;
          }

          expect(error).to.be.an('error');
          expect(error.name).to.be.equal('NotFound');
        }
      });

      it('should fail get the duration of non audio file', async () => {
        try {
          await getMp3Duration(path.resolve('./test/files/not-a-mp3.txt'));
          expect.fail('Promise should have failed');
        } catch (error) {
          if (error instanceof AssertionError) {
            throw error;
          }

          expect(error).to.be.an('error');
          expect(error.name).to.be.equal('FileFormatError');
        }
      });

      it('should fail get the duration of wav file', async () => {
        try {
          await getMp3Duration(
            path.resolve('./test/files/2-seconds-of-silence.wav')
          );
          expect.fail('Promise should have failed');
        } catch (error) {
          if (error instanceof AssertionError) {
            throw error;
          }

          expect(error).to.be.an('error');
          expect(error.name).to.be.equal('FileFormatError');
        }
      });
    });

    describe('Success', () => {
      it('should get the 10s mp3 duration', () => {
        return getMp3Duration(
          path.resolve('./test/files/10-seconds-of-silence.mp3')
        ).then((res) => {
          expect(Math.round(res)).to.be.equal(10);
        });
      });

      it('should get the 15s mp3 duration', () => {
        return getMp3Duration(
          path.resolve('./test/files/15-seconds-of-silence.mp3')
        ).then((res) => {
          expect(Math.round(res)).to.be.equal(15);
        });
      });

      it('should get the 30s mp3 duration', () => {
        return getMp3Duration(
          path.resolve('./test/files/30-seconds-of-silence.mp3')
        ).then((res) => {
          expect(Math.round(res)).to.be.equal(30);
        });
      });

      it('should get the 45s mp3 duration', () => {
        return getMp3Duration(
          path.resolve('./test/files/45-seconds-of-silence.mp3')
        ).then((res) => {
          expect(Math.round(res)).to.be.equal(45);
        });
      });
    });
  });

  describe('getMp3ListDuration', () => {
    describe('Fails', () => {
      it("should fail to get a list of mp3's duration with an invalid file format", async () => {
        const mp3s = [
          path.resolve('./test/files/15-seconds-of-silence.mp3'),
          path.resolve('./test/files/30-seconds-of-silence.mp3'),
          path.resolve('./test/files/45-seconds-of-silence.mp3'),
          path.resolve('./test/files/2-seconds-of-silence.wav')
        ];

        try {
          await getMp3ListDuration(mp3s);
          expect.fail('Promise should have failed');
        } catch (error) {
          if (error instanceof AssertionError) {
            throw error;
          }

          expect(error).to.be.an('error');
          expect(error.name).to.be.equal('FileFormatError');
        }
      });

      it("should fail to get a list of mp3's duration with an non existing file", async () => {
        const mp3s = [
          path.resolve('./test/files/15-seconds-of-silence.mp3'),
          path.resolve('./test/files/30-seconds-of-silence.mp3'),
          path.resolve('./test/files/non-existing.mp3'),
          path.resolve('./test/files/45-seconds-of-silence.mp3')
        ];

        try {
          await getMp3ListDuration(mp3s);
          expect.fail('Promise should have failed');
        } catch (error) {
          if (error instanceof AssertionError) {
            throw error;
          }

          expect(error).to.be.an('error');
          expect(error.name).to.be.equal('NotFound');
        }
      });
    });

    describe('Success', () => {
      it("should get a list of mp3's duration", () => {
        const mp3s = [
          path.resolve('./test/files/10-seconds-of-silence.mp3'),
          path.resolve('./test/files/15-seconds-of-silence.mp3'),
          path.resolve('./test/files/30-seconds-of-silence.mp3'),
          path.resolve('./test/files/45-seconds-of-silence.mp3')
        ];

        return getMp3ListDuration(mp3s).then((res) =>
          expect(Math.round(res?.duration)).to.be.equal(102)
        );
      });
    });
  });
});
