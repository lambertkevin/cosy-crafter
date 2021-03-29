import { expect } from 'chai';
import jwt from 'jsonwebtoken';
import tokenFactory, { accessTokenFactory, refreshTokenFactory } from '../../src/lib/TokensFactory';

describe('TokenFactory unit tests', () => {
  it('should return a accessToken', () => {
    const token = accessTokenFactory({});

    expect(token)
      .to.be.a('string')
      .and.to.match(/^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/);
  });

  it('should return a refreshToken', () => {
    const token = refreshTokenFactory({});

    expect(token)
      .to.be.a('string')
      .and.to.match(/^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/);
  });

  it('should return a couple of tokens', () => {
    const { accessToken, refreshToken } = tokenFactory({});
    const decodedAccessToken = jwt.decode(accessToken);
    const decodedRefreshToken = jwt.decode(refreshToken);

    expect(decodedAccessToken).to.have.keys('iat', 'exp');
    expect(decodedRefreshToken).to.have.keys('iat', 'exp');
  });

  it('should return a couple of tokens with ids', () => {
    const { accessToken, refreshToken } = tokenFactory({}, ['123', '456']);
    const decodedAccessToken = jwt.decode(accessToken);
    const decodedRefreshToken = jwt.decode(refreshToken);

    expect(decodedAccessToken).to.have.keys('iat', 'exp', 'jti');
    expect(decodedAccessToken.jti).to.be.equal('123');
    expect(decodedRefreshToken).to.have.keys('iat', 'exp', 'jti');
    expect(decodedRefreshToken.jti).to.be.equal('456');
  });
});
