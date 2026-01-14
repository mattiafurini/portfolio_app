
import { Controller, Post, Body, UnauthorizedException, Get, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('register')
    async register(@Body() body: any) {
        return this.authService.register(body.email, body.password);
    }

    @Post('login')
    async login(@Body() body: any) {
        const user = await this.authService.validateUser(body.email, body.password);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }
        return this.authService.login(user);
    }

    @Post('forgot-password')
    async forgotPassword(@Body() body: any) {
        return this.authService.forgotPassword(body.email);
    }

    @Post('reset-password')
    async resetPassword(@Body() body: any) {
        return this.authService.resetPassword(body.token, body.password);
    }

    @UseGuards(JwtAuthGuard)
    @Get('profile')
    getProfile(@Request() req: any) {
        return req.user;
    }
}
