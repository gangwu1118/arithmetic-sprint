import { z } from 'zod';
import { canonicalTimeZone } from '../domain/days.js';

/** An IANA time zone name, put in its usual spelling. */
export const timeZoneSchema = z
  .string()
  .max(64)
  .refine((name) => canonicalTimeZone(name) !== null, {
    message: 'Unknown time zone: send an IANA name such as Australia/Sydney',
  })
  .transform((name) => canonicalTimeZone(name) ?? name);
