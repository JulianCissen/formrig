import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import type { Readable } from 'stream';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, EntityManager } from '@mikro-orm/core';
import { PluginService }           from '../plugin/plugin.service';
import { FormEventContext, FileMeta } from '@formrig/sdk';
import { BaseField }               from '@formrig/shared';
import { FieldDto, StepDto } from './dto/form-definition.dto';
import { Form }       from './entities/form.entity';
import { FileRecord } from './entities/file-record.entity';
import { StoragePluginService } from '../file-storage/storage-plugin.service';
import { generateFilename }   from '../common/filename.util';
import { CreateFormDto }      from './dto/create-form.dto';
import { UpdateFormValuesSchema, STRUCTURAL_FIELDS } from './dto/update-form-values.dto';
import { FormSummaryDto }     from './dto/form-summary.dto';
import { FormDetailDto }      from './dto/form-detail.dto';
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

  // ── CRUD ─────────────────────────────────────────────────────────────────

  /**
   * Returns metadata for all currently loaded form-type plugins.
   * Returns an empty array when no plugins are loaded (AC-3).
   */
  getFormTypes(): FormTypeDto[] {
    return this.pluginSvc.getAll().map(({ manifest }) => ({
      name:        manifest.name,
      description: String((manifest as unknown as Record<string, unknown>)['description'] ?? ''),
      version:     manifest.version,
    }));
  }

  async createForm(dto: CreateFormDto): Promise<FormSummaryDto> {
    // Verify plugin exists
    const plugin = this.pluginSvc.find(dto.pluginId);
    if (!plugin) {
      throw new NotFoundException(`Plugin "${dto.pluginId}" is not loaded`);
    }

    const form = this.formRepo.create({ pluginId: dto.pluginId, values: {}, createdAt: new Date(), updatedAt: new Date() });
    this.em.persist(form);
    await this.em.flush();

    return this.toSummary(form);
  }

  async listForms(): Promise<FormSummaryDto[]> {
    const forms = await this.formRepo.findAll({ orderBy: { createdAt: 'DESC' } });
    return forms
      .filter(f => this.pluginSvc.find(f.pluginId) !== undefined)
      .map(f => this.toSummary(f));
  }

  async deleteForm(id: string): Promise<void> {
    const form = await this.formRepo.findOne(id);
    if (!form) throw new NotFoundException(`Form "${id}" not found`);

    // Clean up stored files from object storage (best-effort; DB cascade removes the rows)
    const fileRecords = await this.fileRepo.find({ form: { id } });
    for (const record of fileRecords) {
      await this.fileStorage.delete(record.storageKey).catch(() => {/* best-effort */});
    }

    this.em.remove(form);
    await this.em.flush();
  }

  async getForm(id: string): Promise<FormDetailDto> {
    const form = await this.formRepo.findOne(id);
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

    return {
      formId:    form.id,
      pluginId:  form.pluginId,
      title:     loaded.manifest.name,
      createdAt: form.createdAt.toISOString(),
      updatedAt: form.updatedAt.toISOString(),
      id:        definition.id,
      fields:    flatFieldDtos,
      ...(stepDtos !== undefined ? { steps: stepDtos } : {}),
    };
  }

  async patchForm(id: string, body: unknown): Promise<FormSummaryDto> {
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

    const form = await this.formRepo.findOne(id);
    if (!form) throw new NotFoundException(`Form "${id}" not found`);

    // Shallow-merge values
    if ('fieldId' in dto) {
      form.values = { ...form.values, [dto.fieldId]: dto.value };
    } else {
      form.values = { ...form.values, ...dto.values };
    }

    await this.em.flush();
    return this.toSummary(form);
  }

  async createFileRecord(
    formId: string,
    fieldId: string,
    storageKey: string,
    meta: FileMeta,
  ): Promise<{ id: string; fieldId: string; filename: string; mimeType: string; size: number; url: string }> {
    const form = await this.formRepo.findOne(formId);
    if (!form) throw new NotFoundException(`Form "${formId}" not found`);

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

  async getFileStream(formId: string, fileId: string): Promise<{ stream: Readable; mimeType: string; filename: string }> {
    const record = await this.fileRepo.findOne({ id: fileId, form: { id: formId } });
    if (!record) throw new NotFoundException(`File "${fileId}" not found`);

    const stream = await this.fileStorage.getStream(record.storageKey);
    return { stream, mimeType: record.mimeType, filename: record.filename };
  }

  async deleteFileRecord(formId: string, fileId: string): Promise<void> {
    const record = await this.fileRepo.findOne({ id: fileId, form: { id: formId } });
    if (!record) throw new NotFoundException(`File "${fileId}" not found`);

    await this.fileStorage.delete(record.storageKey);
    this.em.remove(record);
    await this.em.flush();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private toSummary(form: Form): FormSummaryDto {
    return {
      id:        form.id,
      title:     this.pluginSvc.find(form.pluginId)?.manifest.name ?? form.pluginId,
      pluginId:  form.pluginId,
      createdAt: form.createdAt.toISOString(),
      updatedAt: form.updatedAt.toISOString(),
    };
  }

  private serialiseField(f: BaseField, index: number): FieldDto {
    return {
      id:       FormService.fieldSlug(f.label, index),
      type:     f.type,
      label:    f.label,
      required: f.required,
      disabled: f.disabled,
      ...('value'        in f ? { value:        (f as Record<string, unknown>)['value'] as string | boolean } : {}),
      ...('options'      in f ? { options:      (f as Record<string, unknown>)['options'] as string[] }      : {}),
      ...('multiple'     in f ? { multiple:     (f as Record<string, unknown>)['multiple'] as boolean }      : {}),
      ...('rows'         in f ? { rows:         (f as Record<string, unknown>)['rows'] as number }           : {}),
      ...('autocomplete' in f ? { autocomplete: (f as Record<string, unknown>)['autocomplete'] as boolean }  : {}),
      ...('accept'       in f ? { accept:       (f as Record<string, unknown>)['accept'] as string }         : {}),
      ...('maxFiles'     in f ? { maxFiles:     (f as Record<string, unknown>)['maxFiles'] as number }       : {}),
      ...('maxSizeBytes' in f ? { maxSizeBytes: (f as Record<string, unknown>)['maxSizeBytes'] as number }   : {}),
    };
  }
}
