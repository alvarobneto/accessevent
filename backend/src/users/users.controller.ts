import {
  Controller,
  Post,
  Body,
  Get,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('signup')
  async signup(
    @Body()
    body: {
      email?: string;
      firstName?: string;
      lastName?: string;
      birthDate?: string;
      password?: string;
    },
  ) {
    if (!body.email?.trim()) {
      throw new BadRequestException('Informe um e-mail válido.');
    }
    if (!body.firstName?.trim()) {
      throw new BadRequestException('Informe o primeiro nome.');
    }
    if (!body.lastName?.trim()) {
      throw new BadRequestException('Informe o sobrenome.');
    }
    if (!body.password?.trim()) {
      throw new BadRequestException('Informe uma senha.');
    }

    const birthDate = body.birthDate?.trim() || null;
    if (birthDate) {
      const birthDateObj = new Date(birthDate);
      if (isNaN(birthDateObj.getTime())) {
        throw new BadRequestException('Data de nascimento inválida.');
      }
    }

    const email = body.email.trim().toLowerCase();
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new ConflictException(
        'Já existe uma conta cadastrada com este e-mail.',
      );
    }

    return this.usersService.create(
      email,
      body.firstName.trim(),
      body.lastName.trim(),
      birthDate,
      body.password,
    );
  }

  @Post('login')
  async login(@Body() body: { email?: string; password?: string }) {
    if (!body.email?.trim() || !body.password?.trim()) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    const email = body.email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    const passwordMatches = await bcrypt.compare(body.password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);
    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  @Get()
  async list() {
    return [];
  }
}
