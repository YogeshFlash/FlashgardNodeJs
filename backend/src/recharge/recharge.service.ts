import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CONFIG } from '../app-config';
import * as crypto from 'crypto';

const Razorpay = require('razorpay');

@Injectable()
export class RechargeService {
  private razorpay: any;

  constructor(private prisma: PrismaService) {
    this.razorpay = new Razorpay({
      key_id: CONFIG.RAZORPAY.KEY_ID,
      key_secret: CONFIG.RAZORPAY.KEY_SECRET,
    });
  }

  async getRazorpayClient() {
    const keyIdSetting = await this.prisma.systemSetting.findUnique({ where: { key: 'razorpay_key_id' } });
    const keySecretSetting = await this.prisma.systemSetting.findUnique({ where: { key: 'razorpay_key_secret' } });

    const keyId = keyIdSetting?.value || CONFIG.RAZORPAY.KEY_ID;
    const keySecret = keySecretSetting?.value || CONFIG.RAZORPAY.KEY_SECRET;

    return {
      client: new Razorpay({ key_id: keyId, key_secret: keySecret }),
      keyId,
      keySecret,
    };
  }

  async getPackages() {
    return this.prisma.rechargePackage.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });
  }

  async getAllPackages() {
    return this.prisma.rechargePackage.findMany({ orderBy: { price: 'asc' } });
  }

  async createPackage(data: { name: string; description?: string; credits: number; price: number; currency?: string }) {
    return this.prisma.rechargePackage.create({ data: { ...data, currency: data.currency || 'INR' } });
  }

  async updatePackage(id: string, data: { name?: string; description?: string; credits?: number; price?: number; isActive?: boolean }) {
    return this.prisma.rechargePackage.update({ where: { id }, data });
  }

  async deletePackage(id: string) {
    return this.prisma.rechargePackage.delete({ where: { id } });
  }

  async getPaymentTransactions(skip = 0, take = 50, search?: string) {
    const where: any = {};
    if (search) {
      where.OR = [
        { razorpayOrderId: { contains: search, mode: 'insensitive' } },
        { razorpayPaymentId: { contains: search, mode: 'insensitive' } },
        { organization: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.paymentTransaction.findMany({
        where,
        include: {
          organization: { select: { id: true, name: true } },
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          package: { select: { id: true, name: true, credits: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.paymentTransaction.count({ where }),
    ]);
    return { items, total };
  }

  async createOrder(packageId: string, userId: string) {
    // 1. Fetch user and check active license on their organization
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: {
          include: {
            orgLicenses: {
              where: { status: 'ACTIVE' },
            },
          },
        },
      },
    });

    if (!user || !user.organization) {
      throw new BadRequestException('User organization not found');
    }

    if (user.organization.orgLicenses.length === 0) {
      throw new BadRequestException('Recharge requires an active organization license');
    }

    // 2. Fetch package details
    const pkg = await this.prisma.rechargePackage.findUnique({
      where: { id: packageId },
    });

    if (!pkg || !pkg.isActive) {
      throw new BadRequestException('Invalid or inactive recharge package');
    }

    // 3. Create order on Razorpay using dynamic client
    const gateway = await this.getRazorpayClient();
    const amountInPaise = Math.round(Number(pkg.price) * 100);

    let razorpayOrder;
    try {
      razorpayOrder = await gateway.client.orders.create({
        amount: amountInPaise,
        currency: pkg.currency,
        receipt: `receipt_recharge_${Date.now()}`,
      });
    } catch (e) {
      console.error('Razorpay order creation error:', e);
      throw new BadRequestException('Failed to initialize payment gateway order');
    }

    // 4. Create local pending transaction
    const transaction = await this.prisma.paymentTransaction.create({
      data: {
        organizationId: user.organization.id,
        userId: user.id,
        packageId: pkg.id,
        razorpayOrderId: razorpayOrder.id,
        amount: pkg.price,
        status: 'PENDING',
      },
    });

    return {
      razorpayOrderId: razorpayOrder.id,
      amount: amountInPaise,
      currency: pkg.currency,
      keyId: gateway.keyId,
      transactionId: transaction.id,
    };
  }

  async verifyPayment(data: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = data;

    // Verify signature dynamically
    const gateway = await this.getRazorpayClient();
    const hmac = crypto.createHmac('sha256', gateway.keySecret);
    hmac.update(`${razorpayOrderId}|${razorpayPaymentId}`);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature !== razorpaySignature) {
      throw new BadRequestException('Invalid signature verification failed');
    }

    // Update wallet and transaction
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.paymentTransaction.findUnique({
        where: { razorpayOrderId },
        include: { package: true },
      });

      if (!transaction) {
        throw new BadRequestException('Transaction not found');
      }

      if (transaction.status === 'SUCCESS') {
        return { success: true, message: 'Already processed' };
      }

      // Update transaction status
      await tx.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'SUCCESS',
          razorpayPaymentId,
        },
      });

      // Update organization wallet balance
      const wallet = await tx.entityWallet.findFirst({
        where: { tenantId: transaction.organizationId },
      });

      // Query active license for this tenant
      const activeLicense = await tx.orgLicense.findFirst({
        where: {
          tenantId: transaction.organizationId,
          status: 'ACTIVE',
        },
      });

      // Query Flashgard parent organization to set as the credit distributor ("Assigned From")
      const distributorSetting = await tx.systemSetting.findUnique({
        where: { key: 'recharge_distributor_id' }
      });
      let distributorId = distributorSetting?.value;
      if (!distributorId) {
        const flashgardOrg = await tx.organization.findFirst({
          where: { name: { contains: 'Flashgard Pvt Ltd Hyd', mode: 'insensitive' } }
        });
        distributorId = flashgardOrg?.id || 'f36fa0d9-2f6b-4d6a-be1c-06062611f870';
      }

      // Create CutCredit (Assignment History log entry)
      await tx.cutCredit.create({
        data: {
          planType: 'USAGE',
          credits: transaction.package.credits,
          notes: `UPI Online Recharge • Gateway: Razorpay • Order ID: ${transaction.razorpayOrderId} • Payment ID: ${razorpayPaymentId}`,
          ownerId: distributorId,
          tenantId: transaction.organizationId,
          licenseId: activeLicense?.id || null,
          startDate: new Date(),
        },
      });

      if (!wallet) {
        const newWallet = await tx.entityWallet.create({
          data: {
            tenantId: transaction.organizationId,
            orgId: transaction.organizationId,
            totalCredits: transaction.package.credits,
            usedCredits: 0,
            balance: transaction.package.credits,
          },
        });
        
        await tx.creditTransaction.create({
          data: {
            walletId: newWallet.id,
            amount: transaction.package.credits,
            type: 'CREDIT',
            source: 'RECHARGE',
            notes: `UPI Wallet Recharge - ${transaction.package.name}`,
            tenantId: transaction.organizationId,
          },
        });
      } else {
        await tx.entityWallet.update({
          where: { id: wallet.id },
          data: {
            totalCredits: { increment: transaction.package.credits },
            balance: { increment: transaction.package.credits },
          },
        });

        await tx.creditTransaction.create({
          data: {
            walletId: wallet.id,
            amount: transaction.package.credits,
            type: 'CREDIT',
            source: 'RECHARGE',
            notes: `UPI Wallet Recharge - ${transaction.package.name}`,
            tenantId: transaction.organizationId,
          },
        });
      }

      return { success: true };
    });
  }

  async handleWebhook(body: any, signature: string) {
    const gateway = await this.getRazorpayClient();
    const expectedSignature = crypto
      .createHmac('sha256', gateway.keySecret)
      .update(JSON.stringify(body))
      .digest('hex');

    if (body.event === 'order.paid' || body.event === 'payment.captured') {
      const paymentEntity = body.payload.payment.entity;
      const razorpayOrderId = paymentEntity.order_id;
      const razorpayPaymentId = paymentEntity.id;

      try {
        await this.verifyPayment({
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature: signature,
        });
      } catch (e) {
        if (expectedSignature === signature) {
          await this.prisma.$transaction(async (tx) => {
            const transaction = await tx.paymentTransaction.findUnique({
              where: { razorpayOrderId },
              include: { package: true },
            });

            if (transaction && transaction.status !== 'SUCCESS') {
              await tx.paymentTransaction.update({
                where: { id: transaction.id },
                data: {
                  status: 'SUCCESS',
                  razorpayPaymentId,
                },
              });

              const wallet = await tx.entityWallet.findFirst({
                where: { tenantId: transaction.organizationId },
              });

              if (wallet) {
                await tx.entityWallet.update({
                  where: { id: wallet.id },
                  data: {
                    totalCredits: { increment: transaction.package.credits },
                    balance: { increment: transaction.package.credits },
                  },
                });

                await tx.creditTransaction.create({
                  data: {
                    walletId: wallet.id,
                    amount: transaction.package.credits,
                    type: 'CREDIT',
                    source: 'RECHARGE',
                    notes: `UPI Webhook Wallet Recharge - ${transaction.package.name}`,
                    tenantId: transaction.organizationId,
                  },
                });
              }
            }
          });
        }
      }
    }
    return { received: true };
  }

  async getGatewaySettings() {
    const keyId = await this.prisma.systemSetting.findUnique({ where: { key: 'razorpay_key_id' } });
    const keySecret = await this.prisma.systemSetting.findUnique({ where: { key: 'razorpay_key_secret' } });
    const distributorId = await this.prisma.systemSetting.findUnique({ where: { key: 'recharge_distributor_id' } });

    return {
      razorpayKeyId: keyId?.value || CONFIG.RAZORPAY.KEY_ID,
      razorpayKeySecret: keySecret?.value || CONFIG.RAZORPAY.KEY_SECRET,
      rechargeDistributorId: distributorId?.value || 'f36fa0d9-2f6b-4d6a-be1c-06062611f870',
    };
  }

  async saveGatewaySettings(data: { keyId: string; keySecret: string; distributorId: string }) {
    await this.prisma.systemSetting.upsert({
      where: { key: 'razorpay_key_id' },
      update: { value: data.keyId },
      create: { key: 'razorpay_key_id', value: data.keyId },
    });
    await this.prisma.systemSetting.upsert({
      where: { key: 'razorpay_key_secret' },
      update: { value: data.keySecret },
      create: { key: 'razorpay_key_secret', value: data.keySecret },
    });
    await this.prisma.systemSetting.upsert({
      where: { key: 'recharge_distributor_id' },
      update: { value: data.distributorId },
      create: { key: 'recharge_distributor_id', value: data.distributorId },
    });
    return { success: true };
  }
}
