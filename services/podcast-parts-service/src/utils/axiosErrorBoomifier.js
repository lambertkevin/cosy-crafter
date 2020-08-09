import _ from 'lodash';
import Boom from '@hapi/boom';

export default (error) => {
  if (error && error.isAxiosError) {
    const data = _.get(error, ['response', 'data'], {});
    return new Boom.Boom(data.message, data);
  }
  return Boom.boomify(error);
};
