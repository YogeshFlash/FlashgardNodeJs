import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MachineCutsController } from './machine-cuts.controller';
import { MachineCutsService } from './machine-cuts.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secretKey',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [MachineCutsController],
  providers: [MachineCutsService],
  exports: [MachineCutsService],
})
export class MachineCutsModule {}

