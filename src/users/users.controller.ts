import {
  Controller,
  Patch,
  Body,
  UseGuards,
  Req,
  Delete, HttpCode,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthenticationGuard } from '../authentication/jwt-authentication.guard';
import { RequestWithUser } from '../authentication/request-with-user.interface';
import { TransformPlainToInstance } from 'class-transformer';
import { AuthenticationResponseDto } from '../authentication/dto/authentication-response.dto';
import { UpdatePhoneDto } from './dto/update-phone.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {
  }

  @Patch('update-phone')
  @UseGuards(JwtAuthenticationGuard)
  @TransformPlainToInstance(AuthenticationResponseDto)
  async updatePhone(
    @Req() req: RequestWithUser,
    @Body() body: UpdatePhoneDto,
  ) {
    return this.usersService.updatePhoneNumber(req.user.id, body.phoneNumber);
  }

  @Delete()
  @UseGuards(JwtAuthenticationGuard)
  @HttpCode(204)
  async deleteSelf(@Req() req: RequestWithUser) {
    try {
      console.log('[DELETE /users] req.user.id =', req.user.id); // <<< who are we deleting
      await this.usersService.deleteUserCascadeVenuesAndCancelBookings(req.user.id);
    } catch (error) {
      console.error('DELETE /users failed:', error);
      throw error;
    }
  }
}
