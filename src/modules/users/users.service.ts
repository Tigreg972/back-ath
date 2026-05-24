import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from './entities/user.entity';
import { Address } from './entities/address.entity';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(Address)
    private readonly addressesRepository: Repository<Address>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
    });
  }

  async create(data: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(data);
    return this.usersRepository.save(user);
  }

  async findMyAddresses(userId: number): Promise<Address[]> {
    return this.addressesRepository.find({
      where: { userId },
      order: {
        isDefault: 'DESC',
        createdAt: 'DESC',
      },
    });
  }

  async createAddress(
    userId: number,
    createAddressDto: CreateAddressDto,
  ): Promise<Address> {
    if (createAddressDto.isDefault) {
      await this.addressesRepository.update(
        { userId },
        { isDefault: false },
      );
    }

    const address = this.addressesRepository.create({
      ...createAddressDto,
      userId,
    });

    return this.addressesRepository.save(address);
  }

  async updateAddress(
    userId: number,
    addressId: number,
    updateAddressDto: UpdateAddressDto,
  ): Promise<Address> {
    const address = await this.addressesRepository.findOne({
      where: {
        id: addressId,
        userId,
      },
    });

    if (!address) {
      throw new NotFoundException('Adresse introuvable');
    }

    if (updateAddressDto.isDefault) {
      await this.addressesRepository.update(
        { userId },
        { isDefault: false },
      );
    }

    Object.assign(address, updateAddressDto);

    return this.addressesRepository.save(address);
  }

  async removeAddress(
    userId: number,
    addressId: number,
  ): Promise<{ message: string }> {
    const address = await this.addressesRepository.findOne({
      where: {
        id: addressId,
        userId,
      },
    });

    if (!address) {
      throw new NotFoundException('Adresse introuvable');
    }

    await this.addressesRepository.remove(address);

    return {
      message: 'Adresse supprimée avec succès',
    };
  }
}