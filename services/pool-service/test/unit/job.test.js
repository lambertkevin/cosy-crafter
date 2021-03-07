import { AssertionError, expect } from 'chai';
import {
  JOB_STATUS_WAITING,
  JOB_STATUS_DONE,
  JOB_STATUS_FAILED,
  JOB_STATUS_ONGOING
} from '../../src/lib/types/JobTypes';
import { makeJob } from '../../src/lib/JobFactory';

const now = Date.now();
const options = {
  priority: 1,
  progress: 0,
  status: JOB_STATUS_WAITING,
  addedAt: now,
  startedAt: now + 1,
  finishedAt: now + 2,
  retries: 4
};
const successAsyncAction = () =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, 5);
  });
const failAsyncAction = () =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      reject();
    }, 5);
  });

describe('Job Unit Test', () => {
  describe('Creation', () => {
    describe('Fails', () => {
      describe('Validation', () => {
        it('should fail making a job with asyncAction null and opts.asyncAction null', () => {
          try {
            const job = makeJob(null, {
              asyncAction: null
            });
            expect(job).to.throw();
          } catch (e) {
            expect(e).to.be.an('error');
            expect(e?.message).to.be.equal(
              'Arguments are invalid: "opts.asyncAction" contains an invalid value'
            );
          }
        });

        it('should fail making a job with asyncAction undefined and opts.asyncAction null', () => {
          try {
            const job = makeJob(undefined, {
              asyncAction: null
            });
            expect(job).to.throw();
          } catch (e) {
            expect(e).to.be.an('error');
            expect(e?.message).to.be.equal(
              'Arguments are invalid: "asyncAction" is required'
            );
          }
        });

        it('should fail making a job with asyncAction undefined and opts.asyncAction undefined', () => {
          try {
            const job = makeJob();
            expect(job).to.throw();
          } catch (e) {
            expect(e).to.be.an('error');
            expect(e?.message).to.be.equal(
              'Arguments are invalid: "asyncAction" is required'
            );
          }
        });

        it('should fail making a job with asyncAction null and opts is undefined', () => {
          try {
            const job = makeJob(null);
            expect(job).to.throw();
          } catch (e) {
            expect(e).to.be.an('error');
            expect(e?.message).to.be.equal(
              'Arguments are invalid: "opts" is required'
            );
          }
        });

        it('should fail making a job with asyncAction null and opts is empty object', () => {
          try {
            const job = makeJob(null, {});
            expect(job).to.throw();
          } catch (e) {
            expect(e).to.be.an('error');
            expect(e?.message).to.be.equal(
              'Arguments are invalid: "opts.asyncAction" is required'
            );
          }
        });

        it('should fail making a job with priority not a number', () => {
          try {
            const job = makeJob(successAsyncAction, {
              ...options,
              priority: '1'
            });
            expect(job).to.throw();
          } catch (e) {
            expect(e).to.be.an('error');
            expect(e?.message).to.be.equal(
              'Arguments are invalid: "opts.priority" must be a number'
            );
          }
        });

        it('should fail making a job with progress not a number', () => {
          try {
            const job = makeJob(successAsyncAction, {
              ...options,
              progress: '1'
            });
            expect(job).to.throw();
          } catch (e) {
            expect(e).to.be.an('error');
            expect(e?.message).to.be.equal(
              'Arguments are invalid: "opts.progress" must be a number'
            );
          }
        });

        it('should fail making a job with progress negative', () => {
          try {
            const job = makeJob(successAsyncAction, {
              ...options,
              progress: -1
            });
            expect(job).to.throw();
          } catch (e) {
            expect(e).to.be.an('error');
            expect(e?.message).to.be.equal(
              'Arguments are invalid: "opts.progress" must be a positive number'
            );
          }
        });

        it('should fail making a job with progress over 100', () => {
          try {
            const job = makeJob(successAsyncAction, {
              ...options,
              progress: 101
            });
            expect(job).to.throw();
          } catch (e) {
            expect(e).to.be.an('error');
            expect(e?.message).to.be.equal(
              'Arguments are invalid: "opts.progress" must be less than or equal to 100'
            );
          }
        });

        it('should fail making a job with status not a string', () => {
          try {
            const job = makeJob(successAsyncAction, {
              ...options,
              status: true
            });
            expect(job).to.throw();
          } catch (e) {
            expect(e).to.be.an('error');
            expect(e?.message).to.be.equal(
              'Arguments are invalid: "opts.status" must be one of [waiting, ongoing, done, failed]'
            );
          }
        });

        it('should fail making a job with unknown status', () => {
          try {
            const job = makeJob(successAsyncAction, {
              ...options,
              status: 'ok'
            });
            expect(job).to.throw();
          } catch (e) {
            expect(e).to.be.an('error');
            expect(e?.message).to.be.equal(
              'Arguments are invalid: "opts.status" must be one of [waiting, ongoing, done, failed]'
            );
          }
        });

        it('should fail making a job with addedAt not a timestamp', () => {
          try {
            const job = makeJob(successAsyncAction, {
              ...options,
              addedAt: 'date'
            });
            expect(job).to.throw();
          } catch (e) {
            expect(e).to.be.an('error');
            expect(e?.message).to.be.equal(
              'Arguments are invalid: "opts.addedAt" must be in timestamp or number of milliseconds format'
            );
          }
        });

        it('should fail making a job with startedAt not a timestamp', () => {
          try {
            const job = makeJob(successAsyncAction, {
              ...options,
              startedAt: 'date'
            });
            expect(job).to.throw();
          } catch (e) {
            expect(e).to.be.an('error');
            expect(e?.message).to.be.equal(
              'Arguments are invalid: "opts.startedAt" must be in timestamp or number of milliseconds format'
            );
          }
        });

        it('should fail making a job with finishedAt not a timestamp', () => {
          try {
            const job = makeJob(successAsyncAction, {
              ...options,
              finishedAt: 'date'
            });
            expect(job).to.throw();
          } catch (e) {
            expect(e).to.be.an('error');
            expect(e?.message).to.be.equal(
              'Arguments are invalid: "opts.finishedAt" must be in timestamp or number of milliseconds format'
            );
          }
        });

        it('should fail making a job with retries not a number', () => {
          try {
            const job = makeJob(successAsyncAction, {
              ...options,
              retries: '1'
            });
            expect(job).to.throw();
          } catch (e) {
            expect(e).to.be.an('error');
            expect(e?.message).to.be.equal(
              'Arguments are invalid: "opts.retries" must be a number'
            );
          }
        });

        it('should fail making a job with retries negative', () => {
          try {
            const job = makeJob(successAsyncAction, {
              ...options,
              retries: -1
            });
            expect(job).to.throw();
          } catch (e) {
            expect(e).to.be.an('error');
            expect(e?.message).to.be.equal(
              'Arguments are invalid: "opts.retries" must be a positive number'
            );
          }
        });

        it('should fail making a job with opts asyncAction not a string', () => {
          try {
            const job = makeJob(successAsyncAction, {
              ...options,
              asyncAction: false
            });
            expect(job).to.throw();
          } catch (e) {
            expect(e).to.be.an('error');
            expect(e?.message).to.be.equal(
              'Arguments are invalid: "opts.asyncAction" must be a string'
            );
          }
        });
      });
    });

    describe('Success', () => {
      it('should success making a job with function as string and all opts', () => {
        const job = makeJob(null, {
          ...options,
          asyncAction: successAsyncAction.toString()
        });

        expect(job).to.be.a('object');
        expect(job).to.have.property('id');
        expect(job).to.have.property('events');
        expect(job).to.deep.include({
          priority: options.priority,
          progress: options.progress,
          status: options.status,
          addedAt: options.addedAt,
          startedAt: options.startedAt,
          finishedAt: options.finishedAt,
          retries: options.retries
        });
      });

      it('should success making a job with asyncFunction and all opts', () => {
        const job = makeJob(successAsyncAction, options);

        expect(job).to.be.a('object');
        expect(job).to.have.property('id');
        expect(job).to.have.property('events');
        expect(job).to.deep.include({
          priority: options.priority,
          progress: options.progress,
          status: options.status,
          addedAt: options.addedAt,
          startedAt: options.startedAt,
          finishedAt: options.finishedAt,
          retries: options.retries
        });
      });
    });
  });

  describe('Execution', () => {
    describe('Fails', () => {
      it('should fail executing a job with asyncAction as string rejecting with no retry', () => {
        const job = makeJob(null, {
          ...options,
          startedAt: undefined,
          finishedAt: undefined,
          asyncAction: failAsyncAction.toString(),
          retries: 0
        });

        return job.start().catch((e) => {
          expect(e).to.be.an('error');
          expect(e.name).to.be.equal('JobFailedError');
          expect(e.message).to.be.equal('Job finally failed');
          expect(job.fails).to.be.equal(1);
          expect(job.status).to.be.equal(JOB_STATUS_FAILED);
        });
      });

      it('should fail executing a job with asyncAction rejecting with no retry', () => {
        const job = makeJob(failAsyncAction, {
          ...options,
          startedAt: undefined,
          finishedAt: undefined,
          retries: 0
        });

        return job.start().catch((e) => {
          expect(e).to.be.an('error');
          expect(e.name).to.be.equal('JobFailedError');
          expect(e.message).to.be.equal('Job finally failed');
          expect(job.fails).to.be.equal(1);
          expect(job.status).to.be.equal(JOB_STATUS_FAILED);
        });
      });

      it('should fail executing a job with asyncAction rejecting but be put back in queue if it has retries', () => {
        const job = makeJob(failAsyncAction, {
          ...options,
          startedAt: undefined,
          finishedAt: undefined,
          retries: 1
        });

        return job.start().catch((e) => {
          expect(e).to.be.an('error');
          expect(e.name).to.be.equal('JobRetryError');
          expect(e.message).to.be.equal('Job failed but will retry');
          expect(job.fails).to.be.equal(1);
          expect(job.retries).to.be.equal(0);
          expect(job.status).to.be.equal(JOB_STATUS_WAITING);
        });
      });

      it('should fail if asyncAction returns is not a promise', async () => {
        const job = makeJob(() => {});

        try {
          await job.start();
          expect.fail('Promise should have failed');
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }

          expect(e).to.be.an('error');
          expect(e.name).to.be.equal('AsyncActionNotAsync');
        }
      });
    });

    describe('Success', () => {
      it('should succeed executing a job with function as string and all opts', () => {
        const job = makeJob(null, {
          ...options,
          startedAt: undefined,
          finishedAt: undefined,
          asyncAction: successAsyncAction.toString()
        });

        return job.start().then(() => {
          expect(job.status).to.be.equal(JOB_STATUS_DONE);
          expect(job.startedAt).to.be.a('number');
          expect(job.finishedAt).to.be.a('number');
        });
      });

      it('should succeed executing a job with asyncFunction and all opts', () => {
        const job = makeJob(successAsyncAction, {
          ...options,
          startedAt: undefined,
          finishedAt: undefined
        });

        return job.start().then(() => {
          expect(job.status).to.be.equal(JOB_STATUS_DONE);
          expect(job.startedAt).to.be.a('number');
          expect(job.finishedAt).to.be.a('number');
        });
      });
    });
  });

  describe('Methods and Attributes', () => {
    describe('Fails', () => {
      it("should fail changing status if it's is unknown", () => {
        try {
          const job = makeJob(successAsyncAction);
          job.status = 'unkown status';
          expect(job).to.throw();
        } catch (e) {
          expect(e).to.be.an('error');
          expect(e.message).to.be.equal(
            'Unkown status: "value" must be one of [waiting, ongoing, done, failed]'
          );
        }
      });

      it('should fail changing priority with something not a number', () => {
        try {
          const job = makeJob(successAsyncAction);
          job.priority = false;
          expect(job).to.throw();
        } catch (e) {
          expect(e).to.be.an('error');
          expect(e.message).to.be.equal(
            'Invalid priority: "value" must be a number'
          );
        }
      });

      it('should fail changing progress with something not a number', () => {
        try {
          const job = makeJob(successAsyncAction);
          job.progress = false;
          expect(job).to.throw();
        } catch (e) {
          expect(e).to.be.an('error');
          expect(e.message).to.be.equal(
            'Invalid progress: "value" must be a number'
          );
        }
      });

      it('should fail changing progress with a number bigger than 100', () => {
        try {
          const job = makeJob(successAsyncAction);
          job.progress = 101;
          expect(job).to.throw();
        } catch (e) {
          expect(e).to.be.an('error');
          expect(e.message).to.be.equal(
            'Invalid progress: "value" must be less than or equal to 100'
          );
        }
      });

      it('should return duration starting with "failed after" when job status is failed', () => {
        const job = makeJob(failAsyncAction, {
          status: JOB_STATUS_FAILED,
          startedAt: 1398038400000,
          finishedAt: 1398038700000
        });

        expect(job.duration.startsWith('Failed after')).to.be.equal(true);
      });
    });

    describe('Success', () => {
      it('should change status and emit an event', (done) => {
        const job = makeJob(successAsyncAction);

        job.events.on('job-status-changed', () => {
          expect(job.status).to.be.equal(JOB_STATUS_ONGOING);
          done();
        });

        job.status = JOB_STATUS_ONGOING;
      });

      it('should change priority and emit an event', (done) => {
        const job = makeJob(successAsyncAction);

        job.events.on('job-priority-changed', () => {
          expect(job.priority).to.be.equal(2);
          done();
        });

        job.priority = 2;
      });

      it('should change progress and emit an event', (done) => {
        const job = makeJob(successAsyncAction);

        job.events.on('job-progress-changed', () => {
          expect(job.progress).to.be.equal(50);
          done();
        });

        job.progress = 50;
      });

      it('should return humanized duration when job is done', () => {
        const job = makeJob(failAsyncAction, {
          status: JOB_STATUS_DONE,
          startedAt: 1398038400000,
          finishedAt: 1398038700000
        });

        expect(job.duration).to.be.equal('5 minutes');
      });
    });
  });
});
