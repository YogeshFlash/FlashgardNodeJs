import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MaterialCategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    let legacyId = data.legacyId;
    if (!legacyId) {
      const max = await this.prisma.materialCategory.aggregate({
        _max: { legacyId: true }
      });
      legacyId = (max._max.legacyId || 0) + 1;
    }

    let targetProductTypeId = data.productTypeId;
    let parentId = data.parentId;

    if (targetProductTypeId) {
      // Check if targetProductTypeId is a ProductType
      const ptExists = await this.prisma.productType.findUnique({ where: { id: targetProductTypeId } });
      if (!ptExists) {
        // If targetProductTypeId is actually a parent MaterialCategory, retrieve its productTypeId
        const parentMc = await this.prisma.materialCategory.findUnique({ where: { id: targetProductTypeId } });
        if (parentMc) {
          parentId = parentMc.id;
          targetProductTypeId = parentMc.productTypeId;
        } else {
          // Fallback to default product type if available
          const defaultPt = await this.prisma.productType.findFirst();
          if (defaultPt) targetProductTypeId = defaultPt.id;
        }
      }
    }

    return this.prisma.materialCategory.create({
      data: {
        name: data.name,
        description: data.description,
        productTypeId: targetProductTypeId,
        parentId,
        legacyId,
        isActive: data.isActive ?? true,
        isDeleted: data.isDeleted ?? false,
      },
      include: { productType: true }
    });
  }

  async importProductTypesToMaterialCategories() {
    const productTypes = await this.prisma.productType.findMany({
      where: { isDeleted: false },
    });

    const createdMcMap = new Map<string, string>(); // ptId -> new mcId

    for (const pt of productTypes) {
      // Check if a material category with matching ID or matching name already exists
      const existing = await this.prisma.materialCategory.findFirst({
        where: {
          isDeleted: false,
          OR: [
            { id: pt.id },
            { name: { equals: pt.name, mode: 'insensitive' } }
          ]
        }
      });

      if (existing) {
        createdMcMap.set(pt.id, existing.id);
      } else {
        // Calculate next legacyId if pt.legacyId conflicts
        let targetLegacyId = pt.legacyId;
        const legacyIdExists = await this.prisma.materialCategory.findFirst({
          where: { legacyId: targetLegacyId }
        });
        if (legacyIdExists) {
          const max = await this.prisma.materialCategory.aggregate({
            _max: { legacyId: true }
          });
          targetLegacyId = (max._max.legacyId || 0) + 1;
        }

        const newMc = await this.prisma.materialCategory.create({
          data: {
            id: pt.id, // Keep exact ID if possible
            name: pt.name,
            legacyId: targetLegacyId,
            isActive: pt.isActive,
            isDeleted: false,
            parentId: null,
          }
        });
        createdMcMap.set(pt.id, newMc.id);
      }
    }

    // Now re-parent ALL existing materialCategories that have productTypeId set to createdMcMap
    const childCategories = await this.prisma.materialCategory.findMany({
      where: {
        isDeleted: false,
        productTypeId: { not: null },
      }
    });

    for (const child of childCategories) {
      if (child.productTypeId && createdMcMap.has(child.productTypeId)) {
        const parentMcId = createdMcMap.get(child.productTypeId)!;
        // Don't parent to self
        if (parentMcId !== child.id) {
          await this.prisma.materialCategory.update({
            where: { id: child.id },
            data: { parentId: parentMcId }
          });
        }
      }
    }

    return { success: true, importedProductTypes: productTypes.length };
  }

  async findAll(search?: string, includeDeleted = false) {
    // Automatically migrate any productTypes into materialCategories if productTypes exist but aren't in materialCategories
    await this.importProductTypesToMaterialCategories();

    return this.prisma.materialCategory.findMany({
      where: {
        AND: [
          search ? { name: { contains: search, mode: 'insensitive' } } : {},
          !includeDeleted ? { isDeleted: false } : {}
        ]
      },
      include: { productType: true },
      orderBy: { name: 'asc' }
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.materialCategory.findUnique({ 
      where: { id },
      include: { productType: true }
    });
    if (!item) throw new NotFoundException(`MaterialCategory with ID ${id} not found`);
    return item;
  }

  async update(id: string, data: any) {
    await this.findOne(id);

    let targetProductTypeId = data.productTypeId;
    let parentId = data.parentId;

    if (targetProductTypeId) {
      const ptExists = await this.prisma.productType.findUnique({ where: { id: targetProductTypeId } });
      if (!ptExists) {
        const parentMc = await this.prisma.materialCategory.findUnique({ where: { id: targetProductTypeId } });
        if (parentMc) {
          parentId = parentMc.id;
          targetProductTypeId = parentMc.productTypeId;
        }
      } else {
        // If productTypeId is directly a ProductType, parentId becomes null unless explicitly specified
        if (data.parentId === undefined) parentId = null;
      }
    }

    const updateData: any = { ...data };
    if (targetProductTypeId !== undefined) updateData.productTypeId = targetProductTypeId;
    if (parentId !== undefined) updateData.parentId = parentId;

    return this.prisma.materialCategory.update({
      where: { id },
      data: updateData,
      include: { productType: true }
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.materialCategory.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() }
    });
  }

  async restore(id: string) {
    await this.findOne(id);
    return this.prisma.materialCategory.update({
      where: { id },
      data: { isDeleted: false, deletedAt: null }
    });
  }

  async purge(id: string) {
    await this.findOne(id);
    return this.prisma.materialCategory.delete({ where: { id } });
  }
}
