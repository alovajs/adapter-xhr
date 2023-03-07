import { setupServer } from 'msw/node';
import handler from './handler';

export const mockServer = setupServer(...handler);
