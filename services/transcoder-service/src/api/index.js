import TranscodeApi from './TranscodeApi';

export default (socket) => {
  TranscodeApi('transcode', socket);
};
