import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
// requireAll defaults to true, meaning the user must have ALL listed permissions.
// You can pass an array of permissions required. 
export const RequirePermissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);
