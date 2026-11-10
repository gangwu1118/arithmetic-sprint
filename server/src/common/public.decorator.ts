import { SetMetadata } from '@nestjs/common';

// Every route needs a player key unless it is marked @Public(). The guard is
// global, so a new route cannot forget it: forgetting means a 401.
export const IS_PUBLIC = 'isPublic';

export const Public = () => SetMetadata(IS_PUBLIC, true);
