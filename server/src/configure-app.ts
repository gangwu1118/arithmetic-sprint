import {
  type INestApplication,
  StandardSchemaValidationPipe,
} from '@nestjs/common';
import { invalidRequest } from './common/errors.js';

// Everything the HTTP layer needs besides the modules. The server and the
// tests both call this, so the tests run the same configuration.
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  // Validates any parameter that declares a schema, e.g. @Body({ schema }),
  // and reports a wrong shape as 400 invalid_request.
  app.useGlobalPipes(
    new StandardSchemaValidationPipe({ exceptionFactory: invalidRequest }),
  );
}
