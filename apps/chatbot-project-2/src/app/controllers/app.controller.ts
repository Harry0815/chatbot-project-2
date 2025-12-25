import { Controller, Get, Header } from '@nestjs/common';
import { AppHelperService } from '../helpers/app.helper.service';

@Controller()
export class AppController {
  constructor(private readonly helper: AppHelperService) {}

  @Get()
  getRoot() {
    return this.helper.getRootPayload();
  }

  @Get('api/status')
  getStatus() {
    return this.helper.getStatus();
  }

  @Get('translator')
  @Header('Content-Type', 'text/html')
  getTranslator() {
    return this.helper.getTranslatorHtml();
  }
}
