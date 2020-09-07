import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_LIFETIME =
  process.env.NODE_ENV === 'production' ? '5m' : '2h';
const REFRESH_TOKEN_LIFETIME = '1d';

/**
 * Create an access token
 *
 * @param {String|Object|Buffer} payload
 * @param {String} jwtid
 *
 * @return {Promise<String>}
 */
export const accessTokenFactory = (payload, jwtid) =>
  jwt.sign(payload, process.env.SERVICE_JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_LIFETIME,
    jwtid
  });

/**
 * Create an refresh token
 *
 * @param {String|Object|Buffer} payload
 * @param {String} jwtid
 *
 * @return {Promise<String>}
 */
export const refreshTokenFactory = (payload, jwtid) =>
  jwt.sign(payload, process.env.SERVICE_JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_LIFETIME,
    jwtid
  });

/**
 * Create a combo of access and refresh token
 * with the same payload
 *
 * @param {String|Object|Buffer} payload
 * @param {Array<Strng>} jwtids
 *
 * @return {Promise<Object>}
 */
export default async (payload, jwtids = []) => ({
  accessToken: await accessTokenFactory(payload, jwtids[0] || undefined),
  refreshToken: await refreshTokenFactory(payload, jwtids[1] || undefined)
});
