import jwt from 'jsonwebtoken';
// istanbul ignore next
const ACCESS_TOKEN_LIFETIME = process.env.NODE_ENV === 'production' ? '5m' : '2h';
const REFRESH_TOKEN_LIFETIME = '1d';

/**
 * Create an access token
 *
 * @param {String|Object|Buffer} payload
 * @param {String} jwtid
 * @param {String} expire
 *
 * @return {String}
 */
export const accessTokenFactory = (payload, jwtid, expire) =>
  jwt.sign(payload, process.env.SERVICE_JWT_SECRET, {
    expiresIn: expire || ACCESS_TOKEN_LIFETIME,
    ...(jwtid ? { jwtid } : null)
  });
/**
 * Create an refresh token
 *
 * @param {String|Object|Buffer} payload
 * @param {String} jwtid
 * @param {String} expire
 *
 * @return {String}
 */
export const refreshTokenFactory = (payload, jwtid, expire) =>
  jwt.sign(payload, process.env.SERVICE_JWT_REFRESH_SECRET, {
    expiresIn: expire || REFRESH_TOKEN_LIFETIME,
    ...(jwtid ? { jwtid } : null)
  });

/**
 * Create a combo of access and refresh token
 * with the same payload
 *
 * @param {String|Object|Buffer} payload
 * @param {Array<Strng>} jwtids
 *
 * @return {Object}
 */
export default (payload, jwtids = []) => ({
  accessToken: accessTokenFactory(payload, jwtids[0]),
  refreshToken: refreshTokenFactory(payload, jwtids[1])
});
