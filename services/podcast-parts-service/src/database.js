import mongoose from 'mongoose';
import { databaseConfig } from './config';

const mongoURL = `mongodb://${databaseConfig.username}:${databaseConfig.password}@${databaseConfig.host}:${databaseConfig.port}/${databaseConfig.db}`;

export default () => {
  mongoose.connect(mongoURL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
    .then(() => console.log('Database connected'))
    .catch((err) => console.log(`Database connection error: ${err.message}`));
};
