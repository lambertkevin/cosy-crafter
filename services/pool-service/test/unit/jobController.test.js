import { expect } from 'chai';
import * as JobController from '../../src/controllers/JobController';
import {
  JOB_STATUS_DONE,
  JOB_STATUS_WAITING
} from '../../src/lib/types/JobTypes';
import { makeWorkerMock } from '../utils/workerUtils';

describe('Job Controller Unit Tests', () => {
  describe('CreateTranscodingJob', () => {
    describe('Fails', () => {
      it('should fail to create and execute a transcoding job if payload is not decryptable', () => {
        process.env.NODE_ENV = 'development';
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

        return transcodingJob
          .start(worker)
          .catch(() => {
            expect(log).to.not.deep.include({
              decryptedPayload: {
                name: 'test',
                files: [{ id: '123' }, { id: '456' }]
              }
            });
            expect(response).to.deep.include({
              statusCode: 500,
              message: 'Transcode/Join failed'
            });
            // Job should have failed and been put back in queue
            expect(transcodingJob.fails).to.be.equal(1);
            expect(transcodingJob.status).to.be.equal(JOB_STATUS_WAITING);
          })
          .finally(() => {
            process.env.NODE_ENV = 'test';
          });
      });

      it('should fail to create and execute a failing transcoding job', () => {
        process.env.NODE_ENV = 'development';
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

        return transcodingJob
          .start(worker)
          .catch(() => {
            expect(log?.decryptedPayload).to.deep.include({
              name: 'test',
              files: [{ id: '123' }, { id: '456' }]
            });
            expect(response).to.deep.include({
              statusCode: 500,
              message: 'Transcode/Join failed'
            });
            // Job should have failed and been put back in queue
            expect(transcodingJob.fails).to.be.equal(1);
            expect(transcodingJob.status).to.be.equal(JOB_STATUS_WAITING);
          })
          .finally(() => {
            process.env.NODE_ENV = 'test';
          });
      });
    });

    describe('Success', () => {
      it('should succeed to create and execute a transcoding job', () => {
        process.env.NODE_ENV = 'development';
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
          process.env.NODE_ENV = 'test';
          expect(log?.decryptedPayload).to.deep.include({
            name: 'test',
            files: [{ id: '123' }, { id: '456' }]
          });
          expect(response).to.deep.include({
            statusCode: 200,
            data: {
              filename: 'test-craft.mp3',
              location: 'crafts/integration-craft-filename.mp3',
              storageType: 'local',
              publicLink: 'http://location/'
            }
          });
          expect(transcodingJob.progress).to.be.equal(50);
          expect(transcodingJob.status).to.be.equal(JOB_STATUS_DONE);
        });
      });
    });
  });
});
