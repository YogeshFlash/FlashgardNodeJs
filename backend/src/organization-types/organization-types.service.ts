import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrganizationTypesService {
  private readonly logger = new Logger(OrganizationTypesService.name);

  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    try {
      return await this.prisma.organizationType.create({ data });
    } catch (e: any) {
      this.logger.error(`Create org type failed: ${e.message}`);
      throw new InternalServerErrorException(e.message);
    }
  }

  async findAll(includeDeleted?: boolean) {
    return this.prisma.organizationType.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.organizationType.findUnique({ where: { id } });
  }

  async update(id: string, data: any) {
    return this.prisma.organizationType.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.organizationType.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() }
    });
  }

  async restore(id: string, currentUser?: any) {
    if (!currentUser?.isSuperAdmin) {
      throw new InternalServerErrorException('Only Super Admins can restore organization types.');
    }

    return this.prisma.organizationType.update({
      where: { id },
      data: { isDeleted: false, deletedAt: null }
    });
  }

  async purge(id: string, currentUser?: any) {
    if (!currentUser?.isSuperAdmin) {
      throw new InternalServerErrorException('Only Super Admins can permanently delete organization types.');
    }

    const type = await this.prisma.organizationType.findUnique({ where: { id } });
    if (!type?.isDeleted) {
      throw new InternalServerErrorException('Only soft-deleted types can be permanently purged.');
    }

    return this.prisma.organizationType.delete({
      where: { id }
    });
  }
}
