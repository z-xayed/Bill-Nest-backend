import { v7 as uuidv7 } from 'uuid';

export const generateRef = (prefix: string): string => `${prefix}_${uuidv7()}`;
