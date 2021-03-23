import jwt from 'jsonwebtoken';

/**
 * Middleware in charge of checking weither a socket
 * client is using auth through handshake or not.
 * Will disconnect the socket if
 * it is not authorized
 *
 * @param {Object} socket
 * @param {Function} next
 *
 * @return {void}
 */
export const jwtMiddleware = (socket, next) => {
  try {
    const { token } = socket.handshake.auth;
    jwt.verify(token, process.env.SERVICE_JWT_SECRET);
    // eslint-disable-next-line no-param-reassign
    socket.handshake.decodedToken = jwt.decode(token);
    next();
  } catch (error) {
    if (['JsonWebTokenError', 'TokenExpiredError'].includes(error.name)) {
      error.data = { name: error.name, message: error.message };

      next(error);
    } else {
      setTimeout(() => {
        socket.disconnect();
      }, 200);

      // Do not change it to CustomError as socket.io will throw an Error instance
      next(new Error('An error has occured'));
    }
  }
};

export default {
  jwtMiddleware
};
