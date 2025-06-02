import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeleteResult } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(data: Partial<User>): Promise<User> {
    const user = this.usersRepository.create({
      ...data,
      password: await this.hashPassword(String(data.password)),
    });
    return await this.usersRepository.save(user);
  }

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt();
    return await bcrypt.hash(password, salt);
  }

  async comparePasswords(password: string, hash: string): Promise<boolean> {
    if (!password || !hash) {
      return false;
    }
    return await bcrypt.compare(password, hash);
  }

  async get(id: number) {
    return await this.usersRepository.findOne({ where: { id } });
  }

  async getByEmail(email: string): Promise<User | null> {
    return await this.usersRepository.findOneBy({ email });
  }

  async getByName(name: string) {
    return await this.usersRepository.findOne({ where: { name } });
  }

  async delete(id: number) {
    return await this.usersRepository.delete(id);
  }

  async update(id: number, data: Partial<User>) {
    return await this.usersRepository.update(id, data);
  }

  async updatePassword(id: number, password: string) {
    password = await this.hashPassword(password);
    console.log(password);
    return await this.usersRepository.update(id, { password });
  }

  async updateRole(id: number, role: string) {
    return await this.usersRepository.update(id, { role });
  }

  // Add standard CRUD methods for REST controllers
  async findAll(): Promise<User[]> {
    return await this.usersRepository.find();
  }

  async findOne(id: number): Promise<User | null> {
    return await this.get(id);
  }

  async remove(id: number): Promise<DeleteResult> {
    return await this.delete(id);
  }
}