import { z } from 'zod';

export const authValidation = {
  login: z.object({
    body: z.object({
      email: z.string().email(),
      password: z.string().min(6),
    }),
  }),
  register: z.object({
    body: z.object({
      name: z.string().min(1),
      email: z.string().email(),
      password: z.string().min(6),
    }),
  }),
  refreshToken: z.object({
    body: z.object({
      refreshToken: z.string().min(1),
    }),
  }),
};

