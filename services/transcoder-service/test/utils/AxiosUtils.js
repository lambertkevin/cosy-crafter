/* eslint-disable import/no-extraneous-dependencies */
import createAxiosError from 'axios/lib/core/createError';
import path from 'path';
import fs from 'fs';

const {
  STORAGE_SERVICE_NAME,
  STORAGE_SERVICE_PORT,
  PODCAST_SERVICE_NAME,
  PODCAST_SERVICE_PORT
} = process.env;

export const mockAxiosCreate = ({
  uploadFileSuccess = false,
  saveCraftSuccess = false,
  savedFileEmpty = false
}) => () => ({
  interceptors: {
    request: {
      use: () => {}
    }
  },
  post: (url) => {
    if (
      url === `http://${STORAGE_SERVICE_NAME}:${STORAGE_SERVICE_PORT}/v1/crafts`
    ) {
      if (uploadFileSuccess && !savedFileEmpty) {
        return Promise.resolve({
          code: 200,
          data: {
            statusCode: 200,
            data: {
              filename: 'integration-craft-filename.mp3',
              location: 'crafts/integration-craft-filename.mp3',
              storageType: 'local',
              publicLink: undefined
            }
          }
        });
      }

      if (uploadFileSuccess && savedFileEmpty) {
        return Promise.resolve({ savedFile: null });
      }

      const error = createAxiosError('Request failed with status code 404');
      const errorResponse = {
        status: 404,
        statusText: 'Not Found'
      };

      return Promise.reject(
        createAxiosError(error, null, 404, null, errorResponse)
      );
    }

    if (
      url === `http://${PODCAST_SERVICE_NAME}:${PODCAST_SERVICE_PORT}/v1/crafts`
    ) {
      if (saveCraftSuccess) {
        return Promise.resolve({
          code: 200,
          data: {
            statusCode: 200,
            data: {
              user: '603181b5136eaf770f0949e8',
              _id: '604ffd4e5e299c61f9df5ff1',
              name: 'My Craft',
              jobId: 'f32991eb-f544-40fd-ab24-93ef59ef2524',
              storageType: 'aws',
              storagePath: 'crafts/',
              storageFilename: 'craft.mp3',
              __v: 0
            },
            meta: {}
          }
        });
      }

      const error = createAxiosError('Request failed with status code 404');
      const errorResponse = {
        status: 404,
        statusText: 'Not Found'
      };

      return Promise.reject(
        createAxiosError(error, null, 404, null, errorResponse)
      );
    }

    return Promise.reject();
  }
});

export const mockAxiosGet = ({ getFileSuccess = false }) => {
  let i = 0;
  return () => {
    if (getFileSuccess) {
      i += 1;
      return i % 2
        ? Promise.resolve({
            data: fs.readFileSync(
              path.resolve('./test/files/This_is_a_test_-_voice_1.mp3')
            )
          })
        : Promise.resolve({
            data: fs.readFileSync(
              path.resolve('./test/files/Beat_Thee_-_128Kbps.mp3')
            )
          });
    }

    const error = createAxiosError('Request failed with status code 404');
    const errorResponse = {
      status: 404,
      statusText: 'Not Found'
    };

    return Promise.reject(
      createAxiosError(error, null, 404, null, errorResponse)
    );
  };
};

export default {
  mockAxiosGet,
  mockAxiosCreate
};
