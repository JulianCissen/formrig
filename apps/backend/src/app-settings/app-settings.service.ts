import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppSettingsDto } from './dto/app-settings.dto';

@Injectable()
export class AppSettingsService {
  constructor(private readonly configService: ConfigService) {}

  getSettings(): AppSettingsDto {
    const aiRaw = this.configService.get<string>('AI_FEATURE_ENABLED', '').toLowerCase();
    const aiEnabled = aiRaw !== 'false' && aiRaw !== '0';

    const interfaceRaw = this.configService.get<string>('DEFAULT_INTERFACE', 'form');
    const defaultInterface: 'form' | 'chat' =
      interfaceRaw === 'chat' ? 'chat' : 'form';

    const dto = new AppSettingsDto();
    dto.aiEnabled = aiEnabled;
    dto.defaultInterface = defaultInterface;
    return dto;
  }
}
