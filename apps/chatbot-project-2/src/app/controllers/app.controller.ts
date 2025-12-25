import { Controller, Get, Header } from '@nestjs/common';
import { AppHelperService } from '../helpers/app.helper.service';

@Controller()
export class AppController {
  private readonly helper: AppHelperService = new AppHelperService();

  constructor() { /* empty */ }

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
