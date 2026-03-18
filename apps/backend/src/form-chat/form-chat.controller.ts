import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  HttpException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RequireAuthGuard } from '../common/guards/require-auth.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ChatTurnRequestSchema, type ChatTurnRequestDto } from './dto/chat-turn-request.dto';
import { ChatTurnResponseDto } from './dto/chat-turn-response.dto';
import { SyncResponseDto } from './dto/sync-response.dto';
import { GetChatConversationResponseDto } from './dto/get-chat-conversation-response.dto';
import { FormChatOrchestratorService } from './form-chat-orchestrator.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../dev-auth/entities/user.entity';

@UseGuards(RequireAuthGuard)
@Controller('forms')
export class FormChatController {
  constructor(private readonly orchestrator: FormChatOrchestratorService) {}

  @Get(':formId/chat')
  async getConversation(
    @Param('formId', ParseUUIDPipe) formId: string,
    @CurrentUser() user: User,
  ): Promise<GetChatConversationResponseDto> {
    return this.orchestrator.getConversation(formId, user);
  }

  @Post(':formId/chat/sync')
  async handleSync(
    @Param('formId', ParseUUIDPipe) formId: string,
    @CurrentUser() user: User,
  ): Promise<SyncResponseDto> {
    try {
      return await this.orchestrator.handleSync(formId, user);
    } catch (e) {
      if (e instanceof HttpException) throw e;
      throw new HttpException('AI service unavailable', 502);
    }
  }

  @Post(':formId/chat')
  @HttpCode(HttpStatus.OK)
  async handleChatTurn(
    @Param('formId', ParseUUIDPipe) formId: string,
    @Body(new ZodValidationPipe(ChatTurnRequestSchema)) body: ChatTurnRequestDto,
    @CurrentUser() user: User,
  ): Promise<ChatTurnResponseDto> {
    try {
      return await this.orchestrator.handleTurn(formId, body, user);
    } catch (e) {
      if (e instanceof HttpException) throw e;
      throw new HttpException('AI service unavailable', 502);
    }
  }
}
