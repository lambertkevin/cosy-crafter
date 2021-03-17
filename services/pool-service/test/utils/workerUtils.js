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
            ? {
                statusCode: 500,
                message: 'An error has occured'
              }
            : {
                statusCode: 201,
                data: {
                  craftId: '1234'
                }
              }
        );
      } catch (e) {
        cb({
          statusCode: 403,
          message: 'Decryption error'
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
