import { customType } from 'drizzle-orm/pg-core';
import { z } from 'zod';

export const validatedJsonb = <TSchema extends z.ZodType>(schema: TSchema) =>
  customType<{ data: z.infer<TSchema>; driverData: string }>({
    dataType() {
      return 'jsonb';
    },
    toDriver(value: z.infer<TSchema>): string {
      const parsed = schema.parse(value);
      return JSON.stringify(parsed);
    },
    fromDriver(value: string): z.infer<TSchema> {
      const parsed = JSON.parse(value);
      return schema.parse(parsed);
    },
  });