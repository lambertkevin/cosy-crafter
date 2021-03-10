import path from 'path';
import { expect } from 'chai';
import {
  getCrossFadeFilters,
  percentageFromTimemark
} from '../../src/utils/FfmpegUtils';

describe('FFmpeg Utils Unit Tests', () => {
  describe('getCrossFadeFilters', () => {
    describe('Success', () => {
      it('should create an array crossfade complex filters for each input', () => {
        const files = Array(8).fill({
          path: path.resolve('./test/files/10-seconds-of-silence.mp3')
        });
        const filters = getCrossFadeFilters(files);
        expect(filters).to.include.deep.ordered.members([
          {
            filter: 'acrossfade',
            options: { d: 4, c1: 'log', c2: 'nofade' },
            inputs: ['0', '1'],
            outputs: ['01']
          },
          {
            filter: 'acrossfade',
            options: { d: 4, c1: 'log', c2: 'nofade' },
            inputs: ['01', '2'],
            outputs: ['012']
          },
          {
            filter: 'acrossfade',
            options: { d: 4, c1: 'log', c2: 'nofade' },
            inputs: ['012', '3'],
            outputs: ['0123']
          },
          {
            filter: 'acrossfade',
            options: { d: 4, c1: 'log', c2: 'nofade' },
            inputs: ['0123', '4'],
            outputs: ['01234']
          },
          {
            filter: 'acrossfade',
            options: { d: 4, c1: 'log', c2: 'nofade' },
            inputs: ['01234', '5'],
            outputs: ['012345']
          },
          {
            filter: 'acrossfade',
            options: { d: 4, c1: 'log', c2: 'nofade' },
            inputs: ['012345', '6'],
            outputs: ['0123456']
          },
          {
            filter: 'acrossfade',
            options: { d: 4, c1: 'log', c2: 'nofade' },
            inputs: ['0123456', '7']
          }
        ]);
      });

      it('should fail or throw if array of files is empty', () => {
        const files = [];
        const filters = getCrossFadeFilters(files);
        expect(filters).to.be.equal(null);
      });

      it('should fail or throw if array of files is null', () => {
        const filters = getCrossFadeFilters(null);
        expect(filters).to.be.equal(null);
      });

      it('should fail or throw if array of files is undefined', () => {
        const filters = getCrossFadeFilters(undefined);
        expect(filters).to.be.equal(null);
      });
    });
  });

  describe('percentageFromTimemark', () => {
    describe('Fails', () => {
      it('should return 0 if timemark is wrongly formatted', () => {
        const percentage = percentageFromTimemark('00:30:00.000', 3600);
        expect(percentage).to.be.equal(0);
      });

      it('should return 0 if duration is not a number', () => {
        const percentage = percentageFromTimemark('00:30:00.00', '3600');
        expect(percentage).to.be.equal(0);
      });

      it('should return 0 if timemark is null', () => {
        const percentage = percentageFromTimemark(null, 3600);
        expect(percentage).to.be.equal(0);
      });

      it('should return 0 if timemark is undefined', () => {
        const percentage = percentageFromTimemark(undefined, 3600);
        expect(percentage).to.be.equal(0);
      });

      it('should return 0 if duration is null', () => {
        const percentage = percentageFromTimemark('00:30:00.00', null);
        expect(percentage).to.be.equal(0);
      });

      it('should return 0 if duration is undefined', () => {
        const percentage = percentageFromTimemark('00:30:00.00', undefined);
        expect(percentage).to.be.equal(0);
      });
    });

    describe('Success', () => {
      it('should get percentage 50% for 30min on 1 hour', () => {
        const percentage = percentageFromTimemark('00:30:00.00', 3600);
        expect(percentage).to.be.equal(50);
      });

      it('should get percentage 75% for 45min on 1 hour', () => {
        const percentage = percentageFromTimemark('00:45:00.00', 3600);
        expect(percentage).to.be.equal(75);
      });
    });
  });
});
