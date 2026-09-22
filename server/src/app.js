import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { errorHandler, notFoundHandler } from './middleware/errors.js';
import authRouter from './routes/auth.js';
import branchRouter from './routes/branches.js';
import inventoryRouter from './routes/inventory.js';
import productRouter from './routes/products.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json());
app.use(morgan('dev'));

const api = express.Router();

api.get('/health', (_request, response) => {
  response.status(200).json({ status: 'ok', service: 'clothing-pos-api' });
});

api.use('/auth', authRouter);
api.use('/branches', branchRouter);
api.use('/inventory', inventoryRouter);
api.use('/products', productRouter);

app.use('/api/v1', api);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
