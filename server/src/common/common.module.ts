import { Global, Module } from '@nestjs/common';
import { CLOCK, systemClock } from './clock.js';
import { RANDOM, systemRandom } from './random.js';

// Global, so every feature module can inject the clock and the random source.
@Global()
@Module({
  providers: [
    { provide: CLOCK, useValue: systemClock },
    { provide: RANDOM, useValue: systemRandom },
  ],
  exports: [CLOCK, RANDOM],
})
export class CommonModule {}
