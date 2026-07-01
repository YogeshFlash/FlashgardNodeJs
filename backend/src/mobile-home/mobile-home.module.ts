import { Module } from '@nestjs/common';
import { MobileHomeService } from './mobile-home.service';
import { MobileHomeController } from './mobile-home.controller';

@Module({
  providers: [MobileHomeService],
  controllers: [MobileHomeController],
  exports: [MobileHomeService],
})
export class MobileHomeModule {}
