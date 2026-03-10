import { Controller, Get } from '@nestjs/common';
import { AppSettingsService } from './app-settings.service';
import { AppSettingsDto } from './dto/app-settings.dto';

@Controller('app-settings')
export class AppSettingsController {
  constructor(private readonly appSettingsService: AppSettingsService) {}

  @Get()
  getSettings(): AppSettingsDto {
    return this.appSettingsService.getSettings();
  }
}
