import { Injectable, NotFoundException, BadRequestException, UnprocessableEntityException, ConflictException } from '@nestjs/common';
import type { Readable } from 'stream';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, EntityManager } from '@mikro-orm/core';
import { PluginService }           from '../plugin/plugin.service';
import { FormEventContext, FileMeta } from '@formrig/sdk';
import { BaseField, FieldDto, StepDto, getEffectiveRules, evaluateRuntimeConditionTree } from '@formrig/shared';
import { User }        from '../dev-auth/entities/user.entity';
import { Form }       from './entities/form.entity';
import { FileRecord } from './entities/file-record.entity';
import { StoragePluginService } from '../file-storage/storage-plugin.service';
import { generateFilename }   from '../common/filename.util';
import { CreateFormDto }      from './dto/create-form.dto';
import { UpdateFormValuesSchema, STRUCTURAL_FIELDS } from './dto/update-form-values.dto';
import { hardValidate }        from './hard-validate.util';
import { FormSummaryDto }     from './dto/form-summary.dto';
import { FormDetailDto }      from './dto/form-detail.dto';
import { FileRecordDto }      from './dto/file-record.dto';
import { FormTypeDto }        from './dto/form-type.dto';

@Injectable()
export class FormService {
  constructor(
    @InjectRepository(Form)       private readonly formRepo: EntityRepository<Form>,
    @InjectRepository(FileRecord) private readonly fileRepo: EntityRepository<FileRecord>,
    private readonly em:          EntityManager,
    private readonly pluginSvc:   PluginService,
    private readonly fileStorage: StoragePluginService,
  ) {}

  /** Generates a URL-safe slug from a field label, suffixed with the field index for guaranteed uniqueness. */
  private static fieldSlug(label: string, index: number): string {
    const base = label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return base + '-' + index;
  }

  // ── Ownership ────────────────────────────────────────────────────────────

  async findOwnedForm(id: string, owner: User): Promise<Form> {
    const form = await this.formRepo.findOne({ id, owner: { id: owner.id } });
    if (!form) throw new NotFoundException(`Form "${id}" not found`);
    return form;
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────

  /**
   * Returns metadata for all currently loaded form-type plugins.
   * Returns an empty array when no plugins are loaded (AC-3).
   */
  getFormTypes(): FormTypeDto[] {
    return this.pluginSvc.getAll().map(({ manifest, plugin }) => ({
      identifier:  manifest.name,
      title:       plugin.definition.title ?? manifest.name,
      description: plugin.definition.description ?? '',
      version:     manifest.version,
    }));
  }

  async createForm(dto: CreateFormDto, owner: User): Promise<FormSummaryDto> {
    // Verify plugin exists
    const plugin = this.pluginSvc.find(dto.pluginId);
    if (!plugin) {
      throw new NotFoundException(`Plugin "${dto.pluginId}" is not loaded`);
    }

    const form = this.formRepo.create({ pluginId: dto.pluginId, values: {}, owner, createdAt: new Date(), updatedAt: new Date() });
    this.em.persist(form);
    await this.em.flush();

    return this.toSummary(form);
  }

  async listForms(owner: User): Promise<FormSummaryDto[]> {
    const forms = await this.formRepo.findAll({ where: { owner: { id: owner.id } }, orderBy: { createdAt: 'DESC' } });
    return forms
      .filter(f => this.pluginSvc.find(f.pluginId) !== undefined)
      .map(f => this.toSummary(f));
  }

  async deleteForm(id: string, owner: User): Promise<void> {
    const form = await this.findOwnedForm(id, owner);

    // Clean up stored files from object storage (best-effort; DB cascade removes the rows)
    const fileRecords = await this.fileRepo.find({ form: { id } });
    for (const record of fileRecords) {
      await this.fileStorage.delete(record.storageKey).catch(() => {/* best-effort */});
    }

    this.em.remove(form);
    await this.em.flush();
  }

  async getForm(id: string, owner: User): Promise<FormDetailDto> {
    const form = await this.formRepo.findOne({ id, owner: { id: owner.id } }, { populate: ['fileRecords'] });
    if (!form) throw new NotFoundException(`Form "${id}" not found`);

    const loaded = this.pluginSvc.find(form.pluginId);
    if (!loaded) throw new NotFoundException(`Plugin "${form.pluginId}" is not loaded`);

    const { plugin } = loaded;
    const definition = plugin.definition;

    const hasSteps  = (definition.steps?.length  ?? 0) > 0;
    const hasFields = (definition.fields?.length ?? 0) > 0;

    const sourceFields = hasSteps
      ? definition.steps!.flatMap((s) => s.fields)
      : (definition.fields ?? []);

    const clonedFields = sourceFields.map(
      (f) => Object.assign(Object.create(Object.getPrototypeOf(f)), f),
    );

    const ctx: FormEventContext = { fields: clonedFields };
    await plugin.events.created(ctx);

    // Merge stored values into fields
    ctx.fields.forEach((field, index) => {
      const fieldId = FormService.fieldSlug(field.label, index);
      const stored = form.values[fieldId];
      if (stored !== undefined && 'value' in field) {
        (field as Record<string, unknown>)['value'] = stored;
      }
    });

    // Serialise using existing flat-field logic
    const flatFieldDtos = ctx.fields.map((f, index) => this.serialiseField(f, index));

    let stepDtos: StepDto[] | undefined;
    if (hasSteps) {
      let offset = 0;
      stepDtos = definition.steps!.map((step) => {
        const count = step.fields.length;
        const stepFieldDtos = flatFieldDtos.slice(offset, offset + count);
        offset += count;
        return {
          label: step.label,
          ...(step.description !== undefined ? { description: step.description } : {}),
          fields: stepFieldDtos,
        };
      });
    }

    const fileRecordDtos: FileRecordDto[] = form.fileRecords.getItems().map(record => ({
      fileId:   record.id,
      fieldId:  record.fieldId,
      filename: record.filename,
      mimeType: record.mimeType,
      size:     record.size,
      url:      `/api/forms/${id}/files/${record.id}/download`,
    }));

    return {
      formId:      form.id,
      pluginId:    form.pluginId,
      title:       plugin.definition.title ?? loaded.manifest.name,
      createdAt:   form.createdAt.toISOString(),
      updatedAt:   form.updatedAt.toISOString(),
      submittedAt: form.submittedAt?.toISOString() ?? null,
      id:          definition.id,
      fields:      flatFieldDtos,
      fileRecords: fileRecordDtos,
      ...(stepDtos !== undefined ? { steps: stepDtos } : {}),
    };
  }

  async patchForm(id: string, body: unknown, owner: User): Promise<FormSummaryDto> {
    // Validate shape
    const parsed = UpdateFormValuesSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const dto = parsed.data;

    // Defence-in-depth: reject structural field keys
    if ('fieldId' in dto) {
      if (STRUCTURAL_FIELDS.has(dto.fieldId as string)) {
        throw new BadRequestException(`Field "${dto.fieldId}" is structural and cannot be patched`);
      }
    } else {
      // batch mode
      for (const key of Object.keys(dto.values)) {
        if (STRUCTURAL_FIELDS.has(key)) {
          throw new BadRequestException(`Field "${key}" is structural and cannot be patched`);
        }
      }
    }

    // Ownership check — throws 404 if form not found or wrong owner.
    // Pass the verified entity to buildFlatFieldDtos to avoid a second unscoped DB fetch.
    const ownedForm = await this.findOwnedForm(id, owner);
    if (ownedForm.submittedAt !== null) throw new ConflictException('Form has already been submitted.');

    // Hard validation — resolve live field definitions and enforce type/constraint caps.
    const { fieldMap, form } = await this.buildFlatFieldDtos(id, ownedForm);

    if ('fieldId' in dto) {
      const fieldDto = fieldMap.get(dto.fieldId);
      if (!fieldDto) {
        throw new BadRequestException(`Field "${dto.fieldId}" does not exist on this form`);
      }
      if (fieldDto.type === 'file-upload') {
        // File-upload values are managed exclusively via the upload endpoint — silently ignore.
        return this.toSummary(form);
      }
      hardValidate(fieldDto, dto.value);
    } else {
      for (const [slug, value] of Object.entries(dto.values)) {
        const fieldDto = fieldMap.get(slug);
        if (!fieldDto) {
          throw new BadRequestException(`Field "${slug}" does not exist on this form`);
        }
        if (fieldDto.type === 'file-upload') continue; // silently skip
        hardValidate(fieldDto, value);
      }
    }

    // Shallow-merge values (skip file-upload fields — managed via upload endpoint)
    if ('fieldId' in dto) {
      // single-field: file-upload case already returned early above
      form.values = { ...form.values, [dto.fieldId]: dto.value };
    } else {
      const filteredValues = Object.fromEntries(
        Object.entries(dto.values).filter(([slug]) => fieldMap.get(slug)?.type !== 'file-upload'),
      );
      form.values = { ...form.values, ...filteredValues };
    }

    await this.em.flush();
    return this.toSummary(form);
  }

  async submitForm(id: string, owner: User): Promise<{ submittedAt: string }> {
    // Ownership check — throws 404 if form not found or wrong owner.
    // Pass the verified entity to buildFlatFieldDtos to avoid a second unscoped DB fetch.
    const ownedForm = await this.findOwnedForm(id, owner);
    const { fieldMap, form } = await this.buildFlatFieldDtos(id, ownedForm);

    if (form.submittedAt !== null) {
      throw new ConflictException('Form has already been submitted.');
    }

    // Build allValues map: slug → current value (used for cross-field rule evaluation)
    const allValues: Record<string, unknown> = {};
    for (const [slug, fieldDto] of fieldMap.entries()) {
      allValues[slug] = (fieldDto as Record<string, unknown>)['value'];
    }

    const violationsMap = new Map<string, string[]>();

    for (const [, fieldDto] of fieldMap.entries()) {
      if (fieldDto.type === 'file-upload') continue;

      // Skip soft validation for fields hidden by a visibility condition
      const visibleWhen = (fieldDto as unknown as BaseField).visibleWhen;
      if (visibleWhen !== undefined && !evaluateRuntimeConditionTree(visibleWhen, allValues)) {
        continue;
      }

      const rules = getEffectiveRules(fieldDto, allValues);
      for (const rule of rules) {
        const fieldValue = (fieldDto as Record<string, unknown>)['value'];
        if (!rule.matches(fieldValue, allValues)) {
          const existing = violationsMap.get(fieldDto.id) ?? [];
          existing.push(rule.errorMessage());
          violationsMap.set(fieldDto.id, existing);
        }
      }
    }

    const errors = [...violationsMap.entries()].map(([fieldId, violations]) => ({ fieldId, violations }));
    if (errors.length > 0) {
      throw new UnprocessableEntityException({ message: 'Soft validation failed', errors });
    }

    form.submittedAt = new Date();
    await this.em.flush();

    return { submittedAt: form.submittedAt.toISOString() };
  }

  async createFileRecord(
    formId: string,
    fieldId: string,
    storageKey: string,
    meta: FileMeta,
    owner: User,
  ): Promise<{ id: string; fieldId: string; filename: string; mimeType: string; size: number; url: string }> {
    const form = await this.findOwnedForm(formId, owner);
    if (form.submittedAt !== null) throw new ConflictException('Form has already been submitted.');

    const filename = generateFilename(meta.originalName, 0);

    const record = this.fileRepo.create({
      form,
      fieldId,
      filename,
      storageKey,
      mimeType:   meta.mimeType,
      size:       meta.size,
      createdAt:  new Date(),
      updatedAt:  new Date(),
    });
    this.em.persist(record);
    await this.em.flush();

    const url = `/api/forms/${formId}/files/${record.id}/download`;
    return {
      id:       record.id,
      fieldId:  record.fieldId,
      filename: record.filename,
      mimeType: record.mimeType,
      size:     record.size,
      url,
    };
  }

  async getFileStream(formId: string, fileId: string, owner: User): Promise<{ stream: Readable; mimeType: string; filename: string }> {
    // Two-step: findOwnedForm enforces form ownership (404 for absent/wrong-owner);
    // file lookup is then scoped to that form. Security-equivalent to a single combined query.
    await this.findOwnedForm(formId, owner);
    const record = await this.fileRepo.findOne({ id: fileId, form: { id: formId } });
    if (!record) throw new NotFoundException(`File "${fileId}" not found`);

    const stream = await this.fileStorage.getStream(record.storageKey);
    return { stream, mimeType: record.mimeType, filename: record.filename };
  }

  async deleteFileRecord(formId: string, fileId: string, owner: User): Promise<void> {
    // Two-step: findOwnedForm enforces form ownership (404 for absent/wrong-owner);
    // file lookup is then scoped to that form. Security-equivalent to a single combined query.
    const form = await this.findOwnedForm(formId, owner);
    if (form.submittedAt !== null) throw new ConflictException('Form has already been submitted.');
    const record = await this.fileRepo.findOne({ id: fileId, form: { id: formId } });
    if (!record) throw new NotFoundException(`File "${fileId}" not found`);

    await this.fileStorage.delete(record.storageKey);
    this.em.remove(record);
    await this.em.flush();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Loads the form and its plugin definition, fires the `created` event, merges
   * stored values into each field, then returns a slug → FieldDto map together
   * with the already-loaded Form entity so callers avoid a second DB round-trip.
   *
   * Used by `patchForm` and `submitForm`.
   */
  private async buildFlatFieldDtos(formId: string, preloadedForm?: Form): Promise<{ fieldMap: Map<string, FieldDto>; form: Form }> {
    const form = preloadedForm ?? await this.formRepo.findOne(formId);
    if (!form) throw new NotFoundException(`Form "${formId}" not found`);

    const loaded = this.pluginSvc.find(form.pluginId);
    if (!loaded) throw new NotFoundException(`Plugin "${form.pluginId}" is not loaded`);

    const { plugin } = loaded;
    const definition = plugin.definition;

    const sourceFields =
      (definition.steps?.length ?? 0) > 0
        ? definition.steps!.flatMap((s) => s.fields)
        : (definition.fields ?? []);

    const clonedFields = sourceFields.map(
      (f) => Object.assign(Object.create(Object.getPrototypeOf(f)), f),
    );

    const ctx: FormEventContext = { fields: clonedFields };
    await plugin.events.created(ctx);

    // Merge stored values into cloned fields
    ctx.fields.forEach((field, index) => {
      const slug = FormService.fieldSlug(field.label, index);
      const stored = form.values[slug];
      if (stored !== undefined && 'value' in field) {
        (field as Record<string, unknown>)['value'] = stored;
      }
    });

    // Build slug → FieldDto map
    const fieldMap = new Map<string, FieldDto>();
    ctx.fields.forEach((f, index) => {
      const slug = FormService.fieldSlug(f.label, index);
      fieldMap.set(slug, this.serialiseField(f, index));
    });

    return { fieldMap, form };
  }

  /** Derives the human-readable display title for a plugin. */
  private pluginDisplayTitle(pluginId: string): string {
    const loaded = this.pluginSvc.find(pluginId);
    return loaded?.plugin.definition.title ?? loaded?.manifest.name ?? pluginId;
  }

  private toSummary(form: Form): FormSummaryDto {
    return {
      id:        form.id,
      title:     this.pluginDisplayTitle(form.pluginId),
      pluginId:  form.pluginId,
      createdAt: form.createdAt.toISOString(),
      updatedAt: form.updatedAt.toISOString(),
    };
  }

  private serialiseField(f: BaseField, index: number): FieldDto {
    return ({  // cast needed: spread-built object does not narrow to discriminated union member
      id:       FormService.fieldSlug(f.label, index),
      type:     f.type,
      label:    f.label,
      required: f.required,
      disabled: f.disabled,
      ...('value'        in f ? { value:        (f as Record<string, unknown>)['value'] as string | boolean | string[] } : {}),
      ...('options'      in f ? { options:      (f as Record<string, unknown>)['options'] as string[] }      : {}),
      ...('multiple'     in f ? { multiple:     (f as Record<string, unknown>)['multiple'] as boolean }      : {}),
      ...('rows'         in f ? { rows:         (f as Record<string, unknown>)['rows'] as number }           : {}),
      ...('autocomplete' in f ? { autocomplete: (f as Record<string, unknown>)['autocomplete'] as boolean }  : {}),
      ...('accept'       in f ? { accept:       (f as Record<string, unknown>)['accept'] as string }         : {}),
      ...('maxFiles'     in f ? { maxFiles:     (f as Record<string, unknown>)['maxFiles'] as number }       : {}),
      ...('maxSizeBytes' in f ? { maxSizeBytes: (f as Record<string, unknown>)['maxSizeBytes'] as number }   : {}),
      ...('placeholder'   in f ? { placeholder:   (f as Record<string, unknown>)['placeholder'] as string }    : {}),
      ...('rules'         in f ? { rules:         (f as unknown as Record<string, unknown>)['rules'] }         : {}),
      ...('visibleWhen'   in f ? { visibleWhen:   (f as unknown as Record<string, unknown>)['visibleWhen'] }   : {}),
      ...('maxCharacters' in f ? { maxCharacters: (f as Record<string, unknown>)['maxCharacters'] as number }   : {}),
      ...('minCharacters' in f ? { minCharacters: (f as Record<string, unknown>)['minCharacters'] as number }   : {}),
      ...('pattern'       in f ? { pattern:       (f as Record<string, unknown>)['pattern'] as string }         : {}),
      ...('minSelected'   in f ? { minSelected:   (f as Record<string, unknown>)['minSelected'] as number }     : {}),
      ...('maxSelected'   in f ? { maxSelected:   (f as Record<string, unknown>)['maxSelected'] as number }     : {}),
      ...('hint'          in f ? { hint:          (f as unknown as Record<string, unknown>)['hint'] as string }             : {}),
      ...('info'          in f ? { info:          (f as unknown as Record<string, unknown>)['info'] as string }             : {}),
    }) as FieldDto;
  }
}
