import { Module } from '@nestjs/common';
import { AppController } from './controllers/app.controller';
import { AppGateway } from './gateways/app.gateway';
import { AppHelperService } from './helpers/app.helper.service';

@Module({
  controllers: [AppController],
  providers: [AppGateway, AppHelperService],
})
export class AppModule {}
