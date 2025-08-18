import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Simple guard using 'jwt' strategy
@Injectable()
export class JwtAuthenticationGuard extends AuthGuard('jwt') {}
