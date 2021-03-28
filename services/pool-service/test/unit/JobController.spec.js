import { expect } from 'chai';
import proxyquire from 'proxyquire';
import * as JobController from '../../src/controllers/JobController';
import { JOB_STATUS_DONE, JOB_STATUS_WAITING } from '../../src/lib/types/JobTypes';
import { makeWorkerMock } from '../utils/workerUtils';

describe('Job Controller Unit Tests', () => {
  before(() => {
    process.env.NODE_ENV = 'development';
  });

  after(() => {
    process.env.NODE_ENV = 'test';
  });

  describe('CreateTranscodingJob', () => {
    describe('Fails', () => {
      it('should fail to create and execute a transcoding job if payload is not decryptable', () => {
        let response;
        const log = {};
        // Let's imagine the job or worker has the wrong set of key
        const worker = makeWorkerMock(log, 'auth');
        const transcodingJob = JobController.createTranscodingJob(
          {
            name: 'test',
            files: [{ id: '123' }, { id: '456' }]
          },
          (res) => {
            response = res;
          }
        );

        return transcodingJob.start(worker).catch(() => {
          expect(log).to.not.deep.include({
            decryptedPayload: {
              name: 'test',
              files: [{ id: '123' }, { id: '456' }]
            }
          });
          expect(response).to.deep.include({
            statusCode: 403,
            message: 'Decryption error'
          });
          // Job should have failed and been put back in queue
          expect(transcodingJob.fails).to.be.equal(1);
          expect(transcodingJob.status).to.be.equal(JOB_STATUS_WAITING);
        });
      });

      it('should fail to create and execute a failing transcoding job', () => {
        let response;
        const log = {};
        // Let's imagine the job or worker has the wrong set of key
        const worker = makeWorkerMock(log, 'pool', true);
        const transcodingJob = JobController.createTranscodingJob(
          {
            name: 'test',
            files: [{ id: '123' }, { id: '456' }]
          },
          (res) => {
            response = res;
          }
        );

        return transcodingJob.start(worker).catch(() => {
          expect(log?.decryptedPayload).to.deep.include({
            name: 'test',
            files: [{ id: '123' }, { id: '456' }]
          });
          expect(response).to.deep.include({
            statusCode: 500,
            message: 'An error has occured'
          });
          // Job should have failed and been put back in queue
          expect(transcodingJob.fails).to.be.equal(1);
          expect(transcodingJob.status).to.be.equal(JOB_STATUS_WAITING);
        });
      });

      it('should ack a 500 error if anything fail while creating the job', async () => {
        let response;
        const { createTranscodingJob } = proxyquire('../../src/controllers/JobController.js', {
          '../lib/JobFactory': {
            makeJob: () => {
              throw new Error();
            }
          }
        });
        createTranscodingJob({}, (res) => {
          response = res;
        });

        expect(response).to.deep.include({
          statusCode: 500,
          message: "Couldn't create the transcoding job"
        });
      });
    });

    describe('Success', () => {
      it('should succeed to create and execute a transcoding job', () => {
        let response;
        const log = {};
        const worker = makeWorkerMock(log);
        const transcodingJob = JobController.createTranscodingJob(
          {
            name: 'test',
            files: [{ id: '123' }, { id: '456' }]
          },
          (res) => {
            response = res;
          }
        );

        return transcodingJob.start(worker).then(() => {
          expect(log?.decryptedPayload).to.deep.include({
            name: 'test',
            files: [{ id: '123' }, { id: '456' }]
          });
          expect(response).to.deep.include({
            statusCode: 201,
            data: {
              craftId: '1234'
            }
          });
          expect(transcodingJob.progress).to.be.equal(50);
          expect(transcodingJob.status).to.be.equal(JOB_STATUS_DONE);
        });
      });
    });
  });
});
