import { makeRsaPublicDecrypter } from '../../src/utils/RsaUtils';

export const makeWorkerMock = (log, decrypter = 'pool', failing = false) => ({
  emit: (eventName, payload, cb) => {
    setTimeout(() => {
      try {
        const rsaPrivateDecrypter = makeRsaPublicDecrypter(decrypter);
        const decryptedPayload = rsaPrivateDecrypter(payload, 'json');
        // eslint-disable-next-line no-param-reassign
        log.decryptedPayload = decryptedPayload;
        cb(
          failing
            ? { statusCode: 500, message: 'Error' }
            : {
                statusCode: 200,
                savedCraft: {
                  statusCode: 200,
                  data: {
                    filename: 'test-craft.mp3',
                    location: 'crafts/integration-craft-filename.mp3',
                    storageType: 'local',
                    publicLink: `http://location/`
                  }
                }
              }
        );
      } catch (e) {
        cb({
          response: { statusCode: 500, message: 'Error' }
        });
      }
    }, 50);
  },
  on: (eventName, cb) => {
    setTimeout(() => {
      cb({ percent: 50 });
    }, 10);
  }
});

export default {
  makeWorkerMock
};
