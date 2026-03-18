import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { FormConversation } from './entities/form-conversation.entity';
import { FormChatPrompt } from './entities/form-chat-prompt.entity';
import { FormConversationService } from './form-conversation.service';
import { PromptSeederService } from './prompt-seeder.service';
import { FormChatController } from './form-chat.controller';
import { FormModule } from '../form/form.module';
import { LlmService } from './llm.service';
import { NluService } from './nlu.service';
import { NlgService } from './nlg.service';
import { FormChatOrchestratorService } from './form-chat-orchestrator.service';
import { FormChatFlowService } from './form-chat-flow.service';

@Module({
  imports: [
    MikroOrmModule.forFeature([FormConversation, FormChatPrompt]),
    FormModule,
  ],
  providers: [
    FormConversationService,
    PromptSeederService,
    LlmService,
    NluService,
    NlgService,
    FormChatOrchestratorService,
    FormChatFlowService,
  ],
  controllers: [FormChatController],
})
export class FormChatModule {}
