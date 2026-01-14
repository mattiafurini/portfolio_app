
import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) { }

    async register(email: string, password: string) {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await this.prisma.user.create({
            data: {
                email,
                password: hashedPassword,
            },
        });
        return this.login(user);
    }

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (user && (await bcrypt.compare(pass, user.password))) {
            const { password, ...result } = user;
            return result;
        }
        return null;
    }

    async login(user: any) {
        const payload = { email: user.email, sub: user.id };
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                email: user.email,
            },
        };
    }

    async forgotPassword(email: string) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const token = crypto.randomBytes(32).toString('hex');
        const expiry = new Date();
        expiry.setHours(expiry.getHours() + 1); // 1 hour validity

        await this.prisma.user.update({
            where: { email },
            data: {
                resetToken: token,
                resetTokenExpiry: expiry,
            },
        });

        // Send email via Gmail
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_PASS, // App Password
            },
        });

        const resetLink = `http://YOUR_SERVER_IP/reset-password?token=${token}`;

        await transporter.sendMail({
            from: '"Portfolio App" <' + process.env.GMAIL_USER + '>',
            to: email,
            subject: 'Password Reset Request',
            html: `
                <h3>Password Reset</h3>
                <p>You requested a password reset. Click the link below to set a new password:</p>
                <p><a href="${resetLink}">Reset Password</a></p>
                <p>If you didn't request this, purely ignore this email.</p>
            `,
        });

        return { message: 'If user exists, email sent' };
    }

    async resetPassword(token: string, newPass: string) {
        const user = await this.prisma.user.findFirst({
            where: {
                resetToken: token,
                resetTokenExpiry: { gt: new Date() },
            },
        });

        if (!user) {
            throw new BadRequestException('Invalid or expired token');
        }

        const hashedPassword = await bcrypt.hash(newPass, 10);

        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetToken: null,
                resetTokenExpiry: null,
            },
        });

        return { message: 'Password reset successful' };
    }
}
