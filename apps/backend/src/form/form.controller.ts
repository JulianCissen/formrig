import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { FormService }       from './form.service';
import { FormDefinitionDto } from './dto/form-definition.dto';

@Controller('form')
export class FormController {
  constructor(private readonly formService: FormService) {}

  /**
   * GET /api/form/active
   *
   * Returns the active form definition after running event handlers.
   * For MVP, "active form" is always the `demo-form` plugin.
   */
  @Get('active')
  async getActiveForm(): Promise<FormDefinitionDto> {
    const dto = await this.formService.getActiveForm();
    if (!dto) {
      throw new HttpException(
        { message: 'No active form plugin available' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return dto;
  }
}
