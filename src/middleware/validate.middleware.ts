import type { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';

export function validate<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation error',
          details: error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
}

// Validation schemas
export const matchRequestSchema = z.object({
  queries: z.record(
    z.string(),
    z.object({
      schema: z.enum([
        'Person',
        'Company',
        'Organization',
        'LegalEntity',
        'Vessel',
        'Aircraft',
        'CryptoWallet',
        'Address',
        'Identification',
      ]),
      properties: z.record(z.string(), z.array(z.string())),
    })
  ),
});

export const searchQuerySchema = z.object({
  q: z.string().min(1),
  schema: z
    .enum([
      'Person',
      'Company',
      'Organization',
      'LegalEntity',
      'Vessel',
      'Aircraft',
      'CryptoWallet',
    ])
    .optional(),
  limit: z.coerce.number().min(1).max(500).optional(),
  offset: z.coerce.number().min(0).optional(),
  fuzzy: z.coerce.boolean().optional(),
  simple: z.coerce.boolean().optional(),
});
