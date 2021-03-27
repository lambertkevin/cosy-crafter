import { expect } from 'chai';
import jwt from 'jsonwebtoken';
import { jwtMiddleware } from '../../src/middlewares/JwtMiddleware';

let response;
const next = (data) => {
  response = data;
};

describe('JwtMiddleware unit tests', () => {
  beforeEach(() => {
    response = null;
  });

  it('should next an error if jwt is invalid', () => {
    const socket = {
      handshake: {
        auth: {
          token: jwt.sign({}, 'wrong-key')
        }
      }
    };
    jwtMiddleware(socket, next);

    expect(response?.data).to.include({
      name: 'JsonWebTokenError',
      message: 'invalid signature'
    });
  });

  it('should next an error if jwt is expired', () => {
    const socket = {
      handshake: {
        auth: {
          token: jwt.sign({}, process.env.SERVICE_JWT_SECRET, { expiresIn: '-5s' })
        }
      }
    };
    jwtMiddleware(socket, next);

    expect(response?.data).to.include({
      name: 'TokenExpiredError',
      message: 'jwt expired'
    });
  });

  it('should next an error if jwt is expired', (done) => {
    let disconnected;
    const socket = {
      handshake: {},
      disconnect: () => {
        disconnected = true;
      }
    };
    jwtMiddleware(socket, next);

    expect(response).to.be.an('error');
    expect(response?.message).to.be.equal('An error has occured');
    setTimeout(() => {
      expect(disconnected).to.be.equal(true);
      done();
    }, 300);
  });
});
