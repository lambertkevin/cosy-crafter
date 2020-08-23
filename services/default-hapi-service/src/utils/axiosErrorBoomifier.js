import _ from 'lodash';
import Boom from '@hapi/boom';

export default (error) => {
  if (error && error.isAxiosError) {
    const responseData = _.get(error, ['response', 'data']);

    if (responseData) {
      return new Boom.Boom(responseData.message, responseData);
    }
    return Boom.badRequest(error.message);
  }
  return Boom.boomify(error);
};
