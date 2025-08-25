import {
  Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards,
} from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import { SignUpDto } from './dto/sign-up.dto';
import { LogInDto } from './dto/log-in.dto';
import { Response } from 'express';
import { JwtAuthenticationGuard } from './jwt-authentication.guard';
import { RequestWithUser } from './request-with-user.interface';
import { TransformPlainToInstance } from 'class-transformer';
import { AuthenticationResponseDto } from './dto/authentication-response.dto';
import { seconds, Throttle } from '@nestjs/throttler';


@Controller('authentication')
export class AuthenticationController {
  constructor(private readonly auth: AuthenticationService) {
  }

  @Post('sign-up')
  @HttpCode(201)
  @TransformPlainToInstance(AuthenticationResponseDto)
  async signUp(@Body() data: SignUpDto) {
    const user = await this.auth.signUp(data);
    return { id: user.id, email: user.email };
  }

  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: seconds(10) } })
  @Post('log-in')
  @TransformPlainToInstance(AuthenticationResponseDto)
  async logIn(
    @Body() data: LogInDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Validate credentials, then set HttpOnly cookie with JWT
    const user = await this.auth.getAuthenticatedUser(data);
    const cookie = this.auth.getCookieWithJwtToken(user.id);
    res.setHeader('Set-Cookie', cookie);
    return user;
  }

  @HttpCode(200)
  @Post('log-out')
  async logOut(@Res({ passthrough: true }) res: Response) {
    // Clear the cookie
    res.setHeader('Set-Cookie', this.auth.getCookieForLogOut());
  }

  @UseGuards(JwtAuthenticationGuard)
  @Get()
  @TransformPlainToInstance(AuthenticationResponseDto)
  authenticate(@Req() req: RequestWithUser) {
    // If guard passes, req.user is available
    return req.user;
  }
}
