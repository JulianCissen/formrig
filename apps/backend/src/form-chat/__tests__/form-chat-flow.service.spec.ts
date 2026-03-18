import { FormChatFlowService } from '../form-chat-flow.service';
import { FormConversation } from '../entities/form-conversation.entity';
import { Form } from '../../form/entities/form.entity';
import { FieldDto } from '@formrig/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeField(overrides: Partial<FieldDto> = {}): FieldDto {
  return {
    id: 'name-0',
    label: 'Full Name',
    type: 'text',
    required: true,
    disabled: false,
    ...overrides,
  } as FieldDto;
}

function makeForm(values: Record<string, unknown> = {}): Form {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    values,
    unconfirmedFieldIds: [],
  } as unknown as Form;
}

function makeConversation(partial: Partial<FormConversation> = {}): FormConversation {
  return {
    id: '33333333-3333-3333-3333-333333333333',
    messages: [],
    skippedFieldIds: [],
    currentFieldId: null,
    status: 'COLLECTING',
    ...partial,
  } as FormConversation;
}

function makeService(overrides: {
  classifyIntentResult?: unknown;
  extractValueResult?: unknown;
  nluOverrides?: Record<string, jest.Mock>;
  nlgOverrides?: Record<string, jest.Mock>;
}) {
  const classifyIntentMock = jest.fn().mockResolvedValue(
    overrides.classifyIntentResult ?? { intent: 'ANSWER' },
  );
  // Use 'in' check so that an explicit null is preserved (null ?? 'default' === 'default')
  const extractValueMock = jest.fn().mockResolvedValue(
    'extractValueResult' in overrides ? overrides.extractValueResult : 'John Doe',
  );
  const identifyFileUploadTargetMock = jest.fn().mockResolvedValue({ confidence: 'low', targetFieldId: null });

  const nluService = {
    classifyIntent: classifyIntentMock,
    extractValue: extractValueMock,
    identifyFileUploadTarget: identifyFileUploadTargetMock,
    ...overrides.nluOverrides,
  };

  const firstAskMock = jest.fn().mockResolvedValue('Please tell me your email.');
  const nextAskMock = jest.fn().mockResolvedValue('Next up: please tell me your email.');
  const validationErrorRepromptMock = jest.fn().mockResolvedValue('That value is invalid, please try again.');
  const gibberishReplyMock = jest.fn().mockResolvedValue("I didn't understand that.");
  const offTopicReplyMock = jest.fn().mockResolvedValue("Let's get back to the form.");
  const clarificationAnswerMock = jest.fn().mockResolvedValue('Here is a clarification.');
  const skipAcknowledgementMock = jest.fn().mockResolvedValue('Okay, skipping that.');
  const formCompleteMock = jest.fn().mockResolvedValue('Form complete!');
  const fileUploadReminderMock = jest.fn().mockResolvedValue('Please upload a file.');
  const answerOtherFieldConfirmedMock = jest.fn().mockResolvedValue('Got it! Now, what is your email?');
  const correctionConfirmedMock = jest.fn().mockResolvedValue('Correction noted!');
  const cyclingReaskMock = jest.fn().mockResolvedValue('Cycling reask message.');
  const stateChangeMock = jest.fn().mockResolvedValue('State change message.');
  const welcomeMock = jest.fn().mockResolvedValue('Welcome to Demo Form!');

  const nlgService = {
    firstAsk: firstAskMock,
    nextAsk: nextAskMock,
    validationErrorReprompt: validationErrorRepromptMock,
    gibberishReply: gibberishReplyMock,
    offTopicReply: offTopicReplyMock,
    clarificationAnswer: clarificationAnswerMock,
    skipAcknowledgement: skipAcknowledgementMock,
    formComplete: formCompleteMock,
    fileUploadReminder: fileUploadReminderMock,
    answerOtherFieldConfirmed: answerOtherFieldConfirmedMock,
    correctionConfirmed: correctionConfirmedMock,
    cyclingReask: cyclingReaskMock,
    stateChange: stateChangeMock,
    welcome: welcomeMock,
    ...overrides.nlgOverrides,
  };

  const saveMock = jest.fn().mockResolvedValue(undefined);
  const persistMock = jest.fn();
  const conversationService = { save: saveMock };
  const em = { persist: persistMock };

  const svc = new FormChatFlowService(
    nluService as any,
    nlgService as any,
    conversationService as any,
    em as any,
  );

  return {
    svc,
    nluService,
    nlgService,
    classifyIntentMock,
    extractValueMock,
    identifyFileUploadTargetMock,
    firstAskMock,
    nextAskMock,
    validationErrorRepromptMock,
    gibberishReplyMock,
    offTopicReplyMock,
    clarificationAnswerMock,
    skipAcknowledgementMock,
    formCompleteMock,
    fileUploadReminderMock,
    answerOtherFieldConfirmedMock,
    correctionConfirmedMock,
    stateChangeMock,
    welcomeMock,
    saveMock,
    persistMock,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FormChatFlowService.processTurn()', () => {
  const FORM_NAME = 'Demo Form';

  describe('ANSWER intent', () => {
    it('writes value to form.values and advances cursor on valid answer', async () => {
      const currentField = makeField({ id: 'name-0', label: 'Full Name' });
      const nextField = makeField({ id: 'email-1', label: 'Email', required: true });
      const allFields = [currentField, nextField];
      const form = makeForm();
      const conversation = makeConversation();
      const { svc, classifyIntentMock, firstAskMock } = makeService({
        classifyIntentResult: { intent: 'ANSWER' },
        extractValueResult: 'John Doe',
      });

      const result = await svc.processTurn(
        conversation,
        form,
        allFields,
        currentField,
        { message: 'John Doe' },
        FORM_NAME,
      );

      expect(classifyIntentMock).toHaveBeenCalledWith(
        'John Doe',
        currentField,
        expect.any(Array),
        expect.any(Array),
      );
      expect(form.values['name-0']).toBe('John Doe');
      expect(result.updatedValues['name-0']).toBe('John Doe');
      expect(result.currentFieldId).toBe('email-1');
      expect(firstAskMock).toHaveBeenCalledWith(nextField, FORM_NAME, expect.any(Array));
      expect(conversation.messages).toHaveLength(2); // user + assistant
      expect(conversation.messages[0].role).toBe('user');
      expect(conversation.messages[1].role).toBe('assistant');
    });

    it('returns gibberish reply when extraction returns null and does not advance cursor', async () => {
      const currentField = makeField({ id: 'name-0' });
      const form = makeForm();
      const conversation = makeConversation();
      const { svc, gibberishReplyMock } = makeService({
        classifyIntentResult: { intent: 'ANSWER' },
        extractValueResult: null,
      });

      const result = await svc.processTurn(
        conversation,
        form,
        [currentField],
        currentField,
        { message: 'asdfghjkl' },
        FORM_NAME,
      );

      expect(gibberishReplyMock).toHaveBeenCalled();
      expect(result.currentFieldId).toBe('name-0');
      expect(result.updatedValues).toEqual({});
      expect(form.values['name-0']).toBeUndefined();
    });

    it('returns validation error reprompt when extracted value fails validation', async () => {
      const currentField = makeField({ id: 'age-0', label: 'Age', type: 'number', required: true });
      const form = makeForm();
      const conversation = makeConversation();
      const { svc, validationErrorRepromptMock } = makeService({
        classifyIntentResult: { intent: 'ANSWER' },
        extractValueResult: 'not-a-number', // hardValidate will fail for type: number
      });

      const result = await svc.processTurn(
        conversation,
        form,
        [currentField],
        currentField,
        { message: 'not-a-number' },
        FORM_NAME,
      );

      expect(validationErrorRepromptMock).toHaveBeenCalled();
      expect(result.currentFieldId).toBe('age-0');
      expect(result.updatedValues).toEqual({});
    });

    it('transitions to COMPLETED when all fields are answered', async () => {
      const currentField = makeField({ id: 'name-0' });
      const form = makeForm();
      const conversation = makeConversation();
      const { svc, formCompleteMock } = makeService({
        classifyIntentResult: { intent: 'ANSWER' },
        extractValueResult: 'John Doe',
      });

      const result = await svc.processTurn(
        conversation,
        form,
        [currentField],
        currentField,
        { message: 'John Doe' },
        FORM_NAME,
      );

      expect(result.status).toBe('COMPLETED');
      expect(result.currentFieldId).toBeNull();
      expect(formCompleteMock).toHaveBeenCalledWith(FORM_NAME, expect.any(Array));
    });

    it('drains unconfirmedFieldIds when field is answered', async () => {
      const currentField = makeField({ id: 'name-0' });
      const form = makeForm();
      form.unconfirmedFieldIds = ['name-0'];
      const conversation = makeConversation();
      const { svc } = makeService({
        classifyIntentResult: { intent: 'ANSWER' },
        extractValueResult: 'John Doe',
      });

      await svc.processTurn(
        conversation,
        form,
        [currentField],
        currentField,
        { message: 'John Doe' },
        FORM_NAME,
      );

      expect(form.unconfirmedFieldIds).not.toContain('name-0');
    });
  });

  describe('ANSWER_OTHER_FIELD intent', () => {
    it('writes value to target field and re-asks current', async () => {
      const currentField = makeField({ id: 'email-1', label: 'Email' });
      const targetField = makeField({ id: 'name-0', label: 'Full Name' });
      const allFields = [targetField, currentField];
      const form = makeForm();
      const conversation = makeConversation();
      const { svc, answerOtherFieldConfirmedMock } = makeService({
        classifyIntentResult: { intent: 'ANSWER_OTHER_FIELD', targetFieldId: 'name-0' },
        extractValueResult: 'John Doe',
      });

      const result = await svc.processTurn(
        conversation,
        form,
        allFields,
        currentField,
        { message: 'My name is John Doe' },
        FORM_NAME,
      );

      expect(form.values['name-0']).toBe('John Doe');
      expect(result.updatedValues['name-0']).toBe('John Doe');
      expect(result.currentFieldId).toBe('email-1');
      expect(answerOtherFieldConfirmedMock).toHaveBeenCalledWith(
        targetField,
        'John Doe',
        currentField,
        FORM_NAME,
        expect.any(Array),
      );
    });

    it('re-asks current field when extraction fails for target', async () => {
      const currentField = makeField({ id: 'email-1', label: 'Email' });
      const targetField = makeField({ id: 'name-0', label: 'Full Name' });
      const form = makeForm();
      const conversation = makeConversation();
      const { svc, firstAskMock } = makeService({
        classifyIntentResult: { intent: 'ANSWER_OTHER_FIELD', targetFieldId: 'name-0' },
        extractValueResult: null,
      });

      const result = await svc.processTurn(
        conversation,
        form,
        [targetField, currentField],
        currentField,
        { message: 'something' },
        FORM_NAME,
      );

      expect(form.values['name-0']).toBeUndefined();
      expect(result.currentFieldId).toBe('email-1');
      expect(firstAskMock).toHaveBeenCalledWith(currentField, FORM_NAME, expect.any(Array));
    });

    it('downgrades to ANSWER when targetFieldId is missing', async () => {
      const currentField = makeField({ id: 'name-0' });
      const form = makeForm();
      const conversation = makeConversation();
      const { svc } = makeService({
        classifyIntentResult: { intent: 'ANSWER_OTHER_FIELD', targetFieldId: undefined },
        extractValueResult: 'John Doe',
      });

      const result = await svc.processTurn(
        conversation,
        form,
        [currentField],
        currentField,
        { message: 'John Doe' },
        FORM_NAME,
      );

      expect(form.values['name-0']).toBe('John Doe');
      expect(result.updatedValues['name-0']).toBe('John Doe');
    });
  });

  describe('CLARIFICATION_QUESTION intent', () => {
    it('returns clarification reply without advancing cursor', async () => {
      const currentField = makeField({ id: 'name-0' });
      const form = makeForm();
      const conversation = makeConversation();
      const { svc, clarificationAnswerMock } = makeService({
        classifyIntentResult: { intent: 'CLARIFICATION_QUESTION' },
      });

      const result = await svc.processTurn(
        conversation,
        form,
        [currentField],
        currentField,
        { message: 'What do you mean by full name?' },
        FORM_NAME,
      );

      expect(clarificationAnswerMock).toHaveBeenCalledWith(
        'What do you mean by full name?',
        currentField,
        FORM_NAME,
        expect.any(Array),
      );
      expect(result.currentFieldId).toBe('name-0');
      expect(result.updatedValues).toEqual({});
    });
  });

  describe('GIBBERISH intent', () => {
    it('returns gibberish reply without advancing cursor', async () => {
      const currentField = makeField({ id: 'name-0' });
      const form = makeForm();
      const conversation = makeConversation();
      const { svc, gibberishReplyMock } = makeService({
        classifyIntentResult: { intent: 'GIBBERISH' },
      });

      const result = await svc.processTurn(
        conversation,
        form,
        [currentField],
        currentField,
        { message: '!!@#$%' },
        FORM_NAME,
      );

      expect(gibberishReplyMock).toHaveBeenCalledWith(currentField, FORM_NAME, expect.any(Array));
      expect(result.currentFieldId).toBe('name-0');
      expect(result.updatedValues).toEqual({});
    });
  });

  describe('OFF_TOPIC intent', () => {
    it('returns off-topic reply without advancing cursor', async () => {
      const currentField = makeField({ id: 'name-0' });
      const form = makeForm();
      const conversation = makeConversation();
      const { svc, offTopicReplyMock } = makeService({
        classifyIntentResult: { intent: 'OFF_TOPIC' },
      });

      const result = await svc.processTurn(
        conversation,
        form,
        [currentField],
        currentField,
        { message: 'What is the weather today?' },
        FORM_NAME,
      );

      expect(offTopicReplyMock).toHaveBeenCalledWith(currentField, FORM_NAME, expect.any(Array));
      expect(result.currentFieldId).toBe('name-0');
      expect(result.updatedValues).toEqual({});
    });
  });

  describe('CORRECTION intent', () => {
    it('overwrites target field value, removes from skippedFieldIds, re-derives cursor', async () => {
      const prevField = makeField({ id: 'name-0', label: 'Full Name' });
      const currentField = makeField({ id: 'email-1', label: 'Email' });
      const allFields = [prevField, currentField];
      const form = makeForm({ 'name-0': 'Wrong Name' });
      const conversation = makeConversation({ skippedFieldIds: [] });
      const { svc, correctionConfirmedMock } = makeService({
        classifyIntentResult: { intent: 'CORRECTION', targetFieldId: 'name-0' },
        extractValueResult: 'Correct Name',
      });

      const result = await svc.processTurn(
        conversation,
        form,
        allFields,
        currentField,
        { message: 'Actually my name is Correct Name' },
        FORM_NAME,
      );

      expect(form.values['name-0']).toBe('Correct Name');
      expect(result.updatedValues['name-0']).toBe('Correct Name');
      expect(correctionConfirmedMock).toHaveBeenCalled();
    });

    it('removes corrected field from skippedFieldIds', async () => {
      const prevField = makeField({ id: 'name-0', label: 'Full Name' });
      const currentField = makeField({ id: 'email-1', label: 'Email' });
      const allFields = [prevField, currentField];
      const form = makeForm({ 'name-0': 'Old Name' });
      const conversation = makeConversation({ skippedFieldIds: ['name-0'] });
      const { svc } = makeService({
        classifyIntentResult: { intent: 'CORRECTION', targetFieldId: 'name-0' },
        extractValueResult: 'New Name',
      });

      await svc.processTurn(
        conversation,
        form,
        allFields,
        currentField,
        { message: 'Actually my name is New Name' },
        FORM_NAME,
      );

      expect(conversation.skippedFieldIds).not.toContain('name-0');
    });

    it('removes corrected field from unconfirmedFieldIds on successful correction', async () => {
      const prevField = makeField({ id: 'name-0', label: 'Full Name' });
      const currentField = makeField({ id: 'email-1', label: 'Email' });
      const allFields = [prevField, currentField];
      const form = makeForm({ 'name-0': 'System-filled Name' });
      form.unconfirmedFieldIds = ['name-0'];
      const conversation = makeConversation({ skippedFieldIds: [] });
      const { svc } = makeService({
        classifyIntentResult: { intent: 'CORRECTION', targetFieldId: 'name-0' },
        extractValueResult: 'User Confirmed Name',
      });

      await svc.processTurn(
        conversation,
        form,
        allFields,
        currentField,
        { message: 'Actually my name is User Confirmed Name' },
        FORM_NAME,
      );

      expect(form.values['name-0']).toBe('User Confirmed Name');
      expect(form.unconfirmedFieldIds).not.toContain('name-0');
    });

    it('downgrades to ANSWER_OTHER_FIELD: extracts and writes value when target field is unanswered', async () => {
      const currentField = makeField({ id: 'email-1', label: 'Email' });
      const targetField = makeField({ id: 'name-0', label: 'Full Name' });
      const form = makeForm(); // name-0 has no value
      const conversation = makeConversation();
      const { svc, answerOtherFieldConfirmedMock } = makeService({
        classifyIntentResult: { intent: 'CORRECTION', targetFieldId: 'name-0' },
        extractValueResult: 'John Doe',
      });

      const result = await svc.processTurn(
        conversation,
        form,
        [targetField, currentField],
        currentField,
        { message: 'Actually my name is John Doe' },
        FORM_NAME,
      );

      // Target field value is written (ANSWER_OTHER_FIELD behavior)
      expect(form.values['name-0']).toBe('John Doe');
      expect(result.updatedValues['name-0']).toBe('John Doe');
      // Cursor stays on currentField (email-1) since this is ANSWER_OTHER_FIELD
      expect(result.currentFieldId).toBe('email-1');
      expect(answerOtherFieldConfirmedMock).toHaveBeenCalled();
    });

    it('downgrades to re-ask current when extraction fails for unanswered target field', async () => {
      const currentField = makeField({ id: 'email-1', label: 'Email' });
      const targetField = makeField({ id: 'name-0', label: 'Full Name' });
      const form = makeForm(); // name-0 has no value
      const conversation = makeConversation();
      const { svc, firstAskMock } = makeService({
        classifyIntentResult: { intent: 'CORRECTION', targetFieldId: 'name-0' },
        extractValueResult: null,
      });

      const result = await svc.processTurn(
        conversation,
        form,
        [targetField, currentField],
        currentField,
        { message: 'Actually my name is John Doe' },
        FORM_NAME,
      );

      expect(form.values['name-0']).toBeUndefined();
      expect(result.currentFieldId).toBe('email-1');
      expect(firstAskMock).toHaveBeenCalledWith(currentField, FORM_NAME, expect.any(Array));
    });
  });

  describe('SKIP_REQUEST intent', () => {
    it('adds required field to skippedFieldIds and advances cursor', async () => {
      const currentField = makeField({ id: 'name-0', label: 'Full Name', required: true });
      const nextField = makeField({ id: 'email-1', label: 'Email', required: true });
      const allFields = [currentField, nextField];
      const form = makeForm();
      const conversation = makeConversation();
      const { svc, skipAcknowledgementMock } = makeService({
        classifyIntentResult: { intent: 'SKIP_REQUEST' },
      });

      const result = await svc.processTurn(
        conversation,
        form,
        allFields,
        currentField,
        { message: 'skip' },
        FORM_NAME,
      );

      expect(conversation.skippedFieldIds).toContain('name-0');
      expect(skipAcknowledgementMock).toHaveBeenCalledWith(currentField, true, FORM_NAME, expect.any(Array));
      expect(result.currentFieldId).toBe('email-1');
    });

    it('adds optional field to skippedFieldIds so PASS 1 advances past it permanently', async () => {
      const currentField = makeField({ id: 'middle-0', label: 'Middle Name', required: false });
      const nextField = makeField({ id: 'email-1', label: 'Email', required: true });
      const allFields = [currentField, nextField];
      const form = makeForm();
      const conversation = makeConversation();
      const { svc } = makeService({
        classifyIntentResult: { intent: 'SKIP_REQUEST' },
      });

      const result = await svc.processTurn(
        conversation,
        form,
        allFields,
        currentField,
        { message: 'skip' },
        FORM_NAME,
      );

      // Optional fields go into skippedFieldIds so PASS 1 skips them; PASS 2 ignores them
      // since required=false, so they're permanently skipped without re-asking.
      expect(conversation.skippedFieldIds).toContain('middle-0');
      expect(result.currentFieldId).toBe('email-1');
    });

    it('calls cyclingReask when next slot is a previously-skipped required field', async () => {
      // Scenario: required field was skipped, then all other fields were answered.
      // Next turn: ANSWER for the last unskipped field → state machine enters PASS 2 → cyclingReask called.
      // We simulate this via SKIP_REQUEST where the next slot is already in skippedFieldIds.
      const skippedField = makeField({ id: 'name-0', label: 'Full Name', required: true });
      const currentField = makeField({ id: 'email-1', label: 'Email', required: true });
      // No more unskipped, unanswered fields after email-1 when we skip it → PASS 2 cycles back to name-0
      const allFields = [skippedField, currentField];
      const form = makeForm(); // name-0 not answered
      const conversation = makeConversation({ skippedFieldIds: ['name-0'] });
      const { svc, nlgService } = makeService({
        classifyIntentResult: { intent: 'SKIP_REQUEST' },
      });
      const cyclingReaskMock = nlgService.cyclingReask as jest.Mock;

      const result = await svc.processTurn(
        conversation,
        form,
        allFields,
        currentField,
        { message: 'skip' },
        FORM_NAME,
      );

      // PASS 1 finds no unskipped, unanswered field (name-0 is skipped, email-1 just got skipped).
      // PASS 2 cycles back to name-0 (required, unanswered) → cyclingReask called.
      expect(cyclingReaskMock).toHaveBeenCalledWith(skippedField, FORM_NAME, expect.any(Array));
      expect(result.currentFieldId).toBe('name-0');
    });
  });

  describe('FILE_UPLOAD intent', () => {
    it('short-circuits classifyIntent when attachmentFileIds is non-empty', async () => {
      const currentField = makeField({ id: 'name-0', label: 'Full Name', type: 'text' });
      const form = makeForm();
      const conversation = makeConversation();
      // No file-upload type fields → Outcome A
      const { svc, classifyIntentMock, fileUploadReminderMock } = makeService({});

      await svc.processTurn(
        conversation,
        form,
        [currentField],
        currentField,
        { attachmentFileIds: ['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'] },
        FORM_NAME,
      );

      expect(classifyIntentMock).not.toHaveBeenCalled();
      expect(fileUploadReminderMock).toHaveBeenCalledWith(null, FORM_NAME, expect.any(Array));
    });

    it('Outcome A: identifyFileUploadTarget not called, fileUploadReminder(null) called, no persist, cursor unchanged', async () => {
      const currentField = makeField({ id: 'name-0', label: 'Full Name', type: 'text' });
      const allFields = [currentField];
      const form = makeForm();
      const conversation = makeConversation();
      const { svc, identifyFileUploadTargetMock, fileUploadReminderMock, persistMock } = makeService({});

      const result = await svc.processTurn(
        conversation,
        form,
        allFields,
        currentField,
        { attachmentFileIds: ['file-uuid'] },
        FORM_NAME,
      );

      expect(identifyFileUploadTargetMock).not.toHaveBeenCalled();
      expect(fileUploadReminderMock).toHaveBeenCalledWith(null, FORM_NAME, expect.any(Array));
      expect(persistMock).not.toHaveBeenCalled();
      expect(form.values).toEqual({});
      expect(result.currentFieldId).toBe('name-0');
      expect(result.updatedValues).toEqual({});
    });

    it('Outcome B: fileUploadReminder called with ambiguousFields when confidence is low', async () => {
      const currentField = makeField({ id: 'name-0', label: 'Full Name', type: 'text' });
      const fileField = makeField({ id: 'doc-0', label: 'Document', type: 'file-upload' });
      const allFields = [fileField, currentField];
      const form = makeForm();
      const conversation = makeConversation();
      const { svc, identifyFileUploadTargetMock, fileUploadReminderMock, persistMock } = makeService({});
      identifyFileUploadTargetMock.mockResolvedValueOnce({ confidence: 'low', targetFieldId: 'doc-0' });

      const result = await svc.processTurn(
        conversation,
        form,
        allFields,
        currentField,
        { attachmentFileIds: ['file-uuid'] },
        FORM_NAME,
      );

      expect(identifyFileUploadTargetMock).toHaveBeenCalled();
      expect(fileUploadReminderMock).toHaveBeenCalledWith(
        null,
        FORM_NAME,
        expect.any(Array),
        expect.arrayContaining([expect.objectContaining({ label: 'Document' })]),
      );
      expect(persistMock).not.toHaveBeenCalled();
      expect(form.values['doc-0']).toBeUndefined();
      expect(result.currentFieldId).toBe('name-0');
      expect(result.updatedValues).toEqual({});
    });

    it('Outcome B2: fileUploadReminder called with ambiguousFields when targetFieldId is null', async () => {
      const currentField = makeField({ id: 'name-0', label: 'Full Name', type: 'text' });
      const fileField = makeField({ id: 'doc-0', label: 'Document', type: 'file-upload' });
      const allFields = [fileField, currentField];
      const form = makeForm();
      const conversation = makeConversation();
      const { svc, identifyFileUploadTargetMock, fileUploadReminderMock, persistMock } = makeService({});
      identifyFileUploadTargetMock.mockResolvedValueOnce({ confidence: 'high', targetFieldId: null });

      const result = await svc.processTurn(
        conversation,
        form,
        allFields,
        currentField,
        { attachmentFileIds: ['file-uuid'] },
        FORM_NAME,
      );

      expect(fileUploadReminderMock).toHaveBeenCalledWith(null, FORM_NAME, expect.any(Array), expect.any(Array));
      expect(persistMock).not.toHaveBeenCalled();
      expect(form.values['doc-0']).toBeUndefined();
      expect(result.updatedValues).toEqual({});
    });

    it('Outcome C: file IDs written, em.persist called, cursor advances, reply composed', async () => {
      const fileField = makeField({ id: 'doc-0', label: 'Document', type: 'file-upload' });
      const nextField = makeField({ id: 'name-1', label: 'Full Name', type: 'text' });
      const allFields = [fileField, nextField];
      const form = makeForm();
      const conversation = makeConversation();
      const { svc, identifyFileUploadTargetMock, persistMock, answerOtherFieldConfirmedMock } = makeService({});
      identifyFileUploadTargetMock.mockResolvedValueOnce({ confidence: 'high', targetFieldId: 'doc-0' });

      const result = await svc.processTurn(
        conversation,
        form,
        allFields,
        fileField,
        { attachmentFileIds: ['new-file-uuid'], message: '' },
        FORM_NAME,
      );

      expect(form.values['doc-0']).toEqual(['new-file-uuid']);
      expect(result.updatedValues['doc-0']).toEqual(['new-file-uuid']);
      expect(persistMock).toHaveBeenCalled();
      expect(answerOtherFieldConfirmedMock).toHaveBeenCalledWith(
        fileField,
        ['new-file-uuid'],
        fileField,
        FORM_NAME,
        expect.any(Array),
      );
      expect(result.currentFieldId).toBe('name-1');
    });

    it('Outcome C append: file IDs appended to existing array, not overwritten', async () => {
      const fileField = makeField({ id: 'doc-0', label: 'Document', type: 'file-upload' });
      const allFields = [fileField];
      const form = makeForm({ 'doc-0': ['existing-file-uuid'] });
      const conversation = makeConversation();
      const { svc, identifyFileUploadTargetMock } = makeService({});
      identifyFileUploadTargetMock.mockResolvedValueOnce({ confidence: 'high', targetFieldId: 'doc-0' });

      await svc.processTurn(
        conversation,
        form,
        allFields,
        fileField,
        { attachmentFileIds: ['new-file-uuid'] },
        FORM_NAME,
      );

      expect(form.values['doc-0']).toEqual(['existing-file-uuid', 'new-file-uuid']);
    });

    it('Outcome C: doc-0 removed from skippedFieldIds and unconfirmedFieldIds', async () => {
      const fileField = makeField({ id: 'doc-0', label: 'Document', type: 'file-upload' });
      const allFields = [fileField];
      const form = makeForm();
      form.unconfirmedFieldIds = ['doc-0'];
      const conversation = makeConversation({ skippedFieldIds: ['doc-0'] });
      const { svc, identifyFileUploadTargetMock } = makeService({});
      identifyFileUploadTargetMock.mockResolvedValueOnce({ confidence: 'high', targetFieldId: 'doc-0' });

      await svc.processTurn(
        conversation,
        form,
        allFields,
        fileField,
        { attachmentFileIds: ['file-uuid'] },
        FORM_NAME,
      );

      expect(form.unconfirmedFieldIds).not.toContain('doc-0');
      expect(conversation.skippedFieldIds).not.toContain('doc-0');
    });

    it('Outcome C next slot: fileUploadReminder dispatched for next file-upload field via resolveSlotResult', async () => {
      const fileField1 = makeField({ id: 'doc-0', label: 'Doc 1', type: 'file-upload' });
      const fileField2 = makeField({ id: 'doc-1', label: 'Doc 2', type: 'file-upload' });
      const allFields = [fileField1, fileField2];
      const form = makeForm();
      const conversation = makeConversation();
      const { svc, identifyFileUploadTargetMock, fileUploadReminderMock } = makeService({});
      identifyFileUploadTargetMock.mockResolvedValueOnce({ confidence: 'high', targetFieldId: 'doc-0' });

      const result = await svc.processTurn(
        conversation,
        form,
        allFields,
        fileField1,
        { attachmentFileIds: ['file-uuid'] },
        FORM_NAME,
      );

      expect(fileUploadReminderMock).toHaveBeenCalledWith(fileField2, FORM_NAME, expect.any(Array));
      expect(result.currentFieldId).toBe('doc-1');
    });

    it('Hallucinated field ID: falls back to Outcome B when targetFieldId not in visibleFileUploadFields', async () => {
      const fileField = makeField({ id: 'doc-0', label: 'Document', type: 'file-upload' });
      const allFields = [fileField];
      const form = makeForm();
      const conversation = makeConversation();
      const { svc, identifyFileUploadTargetMock, fileUploadReminderMock, persistMock } = makeService({});
      identifyFileUploadTargetMock.mockResolvedValueOnce({ confidence: 'high', targetFieldId: 'nonexistent-field' });

      const result = await svc.processTurn(
        conversation,
        form,
        allFields,
        fileField,
        { attachmentFileIds: ['file-uuid'] },
        FORM_NAME,
      );

      expect(persistMock).not.toHaveBeenCalled();
      expect(form.values['doc-0']).toBeUndefined();
      expect(fileUploadReminderMock).toHaveBeenCalledWith(null, FORM_NAME, expect.any(Array), expect.any(Array));
      expect(result.currentFieldId).toBe('doc-0');
      expect(result.updatedValues).toEqual({});
    });
  });

  describe('null currentField (form already completed)', () => {
    it('returns formComplete reply with COMPLETED status', async () => {
      const form = makeForm({ 'name-0': 'John' });
      const conversation = makeConversation({ status: 'COMPLETED', currentFieldId: null });
      const { svc, formCompleteMock, classifyIntentMock } = makeService({});

      const result = await svc.processTurn(
        conversation,
        form,
        [],
        null,
        { message: 'hello' },
        FORM_NAME,
      );

      expect(classifyIntentMock).not.toHaveBeenCalled();
      expect(formCompleteMock).toHaveBeenCalled();
      expect(result.status).toBe('COMPLETED');
      expect(result.currentFieldId).toBeNull();
    });
  });

  describe('conversation messages', () => {
    it('appends user message and assistant reply to conversation.messages', async () => {
      const currentField = makeField({ id: 'name-0' });
      const form = makeForm();
      const conversation = makeConversation();
      const { svc } = makeService({
        classifyIntentResult: { intent: 'GIBBERISH' },
      });

      await svc.processTurn(
        conversation,
        form,
        [currentField],
        currentField,
        { message: 'some message' },
        FORM_NAME,
      );

      expect(conversation.messages).toHaveLength(2);
      expect(conversation.messages[0]).toMatchObject({ role: 'user', content: 'some message' });
      expect(conversation.messages[1]).toMatchObject({ role: 'assistant' });
      expect(typeof conversation.messages[0].timestamp).toBe('string');
    });

    it('calls conversationService.save after processing', async () => {
      const currentField = makeField({ id: 'name-0' });
      const form = makeForm();
      const conversation = makeConversation();
      const { svc, saveMock } = makeService({
        classifyIntentResult: { intent: 'GIBBERISH' },
      });

      await svc.processTurn(
        conversation,
        form,
        [currentField],
        currentField,
        { message: 'test' },
        FORM_NAME,
      );

      expect(saveMock).toHaveBeenCalledWith(conversation);
    });
  });

  describe('resolveSlotResult — firstAsk vs nextAsk dispatch', () => {
    it('fresh start — first_ask dispatched when conversation has no prior messages (empty history)', async () => {
      // AC-4: first turn → historyMessages is [] → firstAsk called, not nextAsk
      const currentField = makeField({ id: 'name-0', label: 'Full Name' });
      const nextField = makeField({ id: 'email-1', label: 'Email', required: true });
      const allFields = [currentField, nextField];
      const form = makeForm();
      const conversation = makeConversation({ messages: [] });
      const { svc, firstAskMock, nextAskMock } = makeService({
        classifyIntentResult: { intent: 'ANSWER' },
        extractValueResult: 'John Doe',
      });

      await svc.processTurn(conversation, form, allFields, currentField, { message: 'John Doe' }, FORM_NAME);

      expect(firstAskMock).toHaveBeenCalledWith(nextField, FORM_NAME, expect.any(Array));
      expect(nextAskMock).not.toHaveBeenCalled();
    });

    it('continuing conversation — next_ask dispatched when conversation has prior messages (non-empty history)', async () => {
      // AC-3: subsequent turn → historyMessages is non-empty → nextAsk called, not firstAsk
      const currentField = makeField({ id: 'email-1', label: 'Email' });
      const nextField = makeField({ id: 'dob-2', label: 'Date of Birth', required: false });
      const allFields = [currentField, nextField];
      const form = makeForm();
      // Seed with a prior exchange so historyMessages will be non-empty
      const conversation = makeConversation({
        messages: [
          { role: 'assistant', content: 'What is your name?', timestamp: new Date().toISOString() },
          { role: 'user', content: 'John Doe', timestamp: new Date().toISOString() },
        ],
      });
      const { svc, nextAskMock, firstAskMock } = makeService({
        classifyIntentResult: { intent: 'ANSWER' },
        extractValueResult: 'user@example.com',
      });

      await svc.processTurn(conversation, form, allFields, currentField, { message: 'user@example.com' }, FORM_NAME);

      expect(nextAskMock).toHaveBeenCalledWith(nextField, FORM_NAME, expect.any(Array));
      expect(firstAskMock).not.toHaveBeenCalled();
    });

    it('re-ask same field on validation error still calls firstAsk, not nextAsk', async () => {
      const currentField = makeField({ id: 'age-0', label: 'Age', type: 'number', required: true });
      const form = makeForm();
      // Non-empty history to confirm that the re-ask path ignores history length
      const conversation = makeConversation({
        messages: [
          { role: 'assistant', content: 'Please enter your age.', timestamp: new Date().toISOString() },
        ],
      });
      const { svc, validationErrorRepromptMock, nextAskMock } = makeService({
        classifyIntentResult: { intent: 'ANSWER' },
        extractValueResult: 'not-a-number',
      });

      await svc.processTurn(conversation, form, [currentField], currentField, { message: 'not-a-number' }, FORM_NAME);

      expect(validationErrorRepromptMock).toHaveBeenCalled();
      expect(nextAskMock).not.toHaveBeenCalled();
    });

    it('ANSWER_OTHER_FIELD re-ask still calls firstAsk for current field, not nextAsk', async () => {
      const currentField = makeField({ id: 'email-1', label: 'Email' });
      const targetField = makeField({ id: 'name-0', label: 'Full Name' });
      const form = makeForm();
      // Non-empty history
      const conversation = makeConversation({
        messages: [
          { role: 'assistant', content: 'What is your email?', timestamp: new Date().toISOString() },
        ],
      });
      const { svc, firstAskMock, nextAskMock } = makeService({
        classifyIntentResult: { intent: 'ANSWER_OTHER_FIELD', targetFieldId: 'name-0' },
        extractValueResult: null, // extraction fails → re-ask current field
      });

      await svc.processTurn(
        conversation,
        form,
        [targetField, currentField],
        currentField,
        { message: 'something ambiguous' },
        FORM_NAME,
      );

      expect(firstAskMock).toHaveBeenCalledWith(currentField, FORM_NAME, expect.any(Array));
      expect(nextAskMock).not.toHaveBeenCalled();
    });
  });
});

describe('FormChatFlowService.processSync()', () => {
  const FORM_NAME = 'Demo Form';

  it('fresh conversation — calls nlgService.welcome and nlgService.firstAsk in parallel, returns both messages (AC-10)', async () => {
    const field = makeField({ id: 'name-0', label: 'Full Name' });
    const allFields = [field];
    const form = makeForm();
    const conversation = makeConversation({ messages: [], currentFieldId: null });
    const welcomeMock = jest.fn().mockResolvedValue('Welcome to the form!');
    const { svc, firstAskMock, saveMock } = makeService({
      nlgOverrides: { welcome: welcomeMock },
    });

    const result = await svc.processSync(conversation, form, allFields, FORM_NAME);

    expect(welcomeMock).toHaveBeenCalledWith(FORM_NAME, []);
    expect(firstAskMock).toHaveBeenCalledWith(field, FORM_NAME, []);
    expect(result.messages).toEqual(['Welcome to the form!', 'Please tell me your email.']);
    expect(conversation.currentFieldId).toBe('name-0');
    expect(conversation.status).toBe('COLLECTING');
    expect(conversation.messages).toHaveLength(2);
    expect(conversation.messages[0]).toMatchObject({ role: 'assistant', content: 'Welcome to the form!' });
    expect(conversation.messages[1]).toMatchObject({ role: 'assistant', content: 'Please tell me your email.' });
    expect(saveMock).toHaveBeenCalledWith(conversation);
  });

  it('all fields complete — calls nlgService.formComplete and returns single message (AC-11)', async () => {
    const field = makeField({ id: 'name-0', label: 'Full Name' });
    const allFields = [field];
    const form = makeForm({ 'name-0': 'John Doe' });
    const conversation = makeConversation({
      messages: [
        { role: 'assistant', content: 'What is your name?', timestamp: new Date().toISOString() },
        { role: 'user', content: 'John Doe', timestamp: new Date().toISOString() },
      ],
      currentFieldId: 'name-0',
    });
    const { svc, formCompleteMock, saveMock } = makeService({});

    const result = await svc.processSync(conversation, form, allFields, FORM_NAME);

    expect(formCompleteMock).toHaveBeenCalledWith(FORM_NAME, expect.any(Array));
    expect(result.messages).toEqual(['Form complete!']);
    expect(conversation.status).toBe('COMPLETED');
    expect(saveMock).toHaveBeenCalledWith(conversation);
  });

  it('stale cursor — calls nlgService.stateChange when cursor is behind live slot, returns single message (AC-12)', async () => {
    const oldField = makeField({ id: 'name-0', label: 'Full Name' });
    const newField = makeField({ id: 'email-1', label: 'Email' });
    const allFields = [oldField, newField];
    const form = makeForm({ 'name-0': 'John Doe' });
    const conversation = makeConversation({
      messages: [
        { role: 'assistant', content: 'What is your name?', timestamp: new Date().toISOString() },
        { role: 'user', content: 'John Doe', timestamp: new Date().toISOString() },
      ],
      currentFieldId: 'name-0',
    });
    const { svc, stateChangeMock, saveMock } = makeService({});

    const result = await svc.processSync(conversation, form, allFields, FORM_NAME);

    expect(stateChangeMock).toHaveBeenCalledWith(newField, FORM_NAME, expect.any(Array));
    expect(result.messages).toEqual(['State change message.']);
    expect(conversation.currentFieldId).toBe('email-1');
    expect(conversation.status).toBe('COLLECTING');
    expect(saveMock).toHaveBeenCalledWith(conversation);
  });

  it('idempotency guard — returns empty messages without calling NLG or save when cursor matches live slot (AC-12)', async () => {
    const field = makeField({ id: 'name-0', label: 'Full Name' });
    const allFields = [field];
    const form = makeForm();
    const conversation = makeConversation({
      messages: [{ role: 'assistant', content: 'What is your name?', timestamp: new Date().toISOString() }],
      currentFieldId: 'name-0',
    });
    const { svc, firstAskMock, stateChangeMock, formCompleteMock, saveMock } = makeService({});

    const result = await svc.processSync(conversation, form, allFields, FORM_NAME);

    expect(result.messages).toEqual([]);
    expect(firstAskMock).not.toHaveBeenCalled();
    expect(stateChangeMock).not.toHaveBeenCalled();
    expect(formCompleteMock).not.toHaveBeenCalled();
    expect(saveMock).not.toHaveBeenCalled();
  });
});
