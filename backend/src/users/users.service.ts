import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './user.entity.js';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async create(
    email: string,
    firstName: string,
    lastName: string,
    birthDate: string,
    password: string,
  ): Promise<Omit<UserEntity, 'password'>> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.userRepository.create({
      email,
      firstName,
      lastName,
      birthDate,
      password: hashedPassword,
    });
    try {
      const saved = await this.userRepository.save(user);
      const { password: _, ...userWithoutPassword } = saved;
      return userWithoutPassword;
    } catch (error: any) {
      if (error?.code === '23505') {
        throw new ConflictException('Já existe uma conta cadastrada com este e-mail.');
      }
      throw error;
    }
  }
}