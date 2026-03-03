import {
  Controller, Get, Post, Patch, Delete, Param, Body, UploadedFile,
  UseInterceptors, Query, HttpCode, HttpStatus, ParseUUIDPipe, BadRequestException,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FormService }         from './form.service';
import { FilePipelineService } from '../file-storage/file-pipeline.service';
import { QuarantineDiskEngine } from '../file-storage/quarantine-disk.engine';
import { FileMeta }            from '@formrig/sdk';
import { CreateFormSchema }    from './dto/create-form.dto';
import { FormTypeDto }         from './dto/form-type.dto';
import { randomUUID }          from 'crypto';

@Controller('forms')
export class FormsController {
  constructor(
    private readonly formService: FormService,
    private readonly filePipeline: FilePipelineService,
  ) {}

  /** POST /forms — create a new form record */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: unknown) {
    const parsed = CreateFormSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.formService.createForm(parsed.data);
  }

  /** GET /forms — list all form summaries */
  @Get()
  async list() {
    return this.formService.listForms();
  }

  /** GET /forms/types — list all loaded form-type plugins (AC-1, AC-2, AC-3) */
  @Get('types')
  getTypes(): FormTypeDto[] {
    return this.formService.getFormTypes();
  }

  /** POST /forms/:id/submit — validate and submit a form */
  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  submitForm(@Param('id', ParseUUIDPipe) id: string) {
    return this.formService.submitForm(id);
  }

  /** GET /forms/:id — get merged form detail */
  @Get(':id')
  async getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.formService.getForm(id);
  }

  /** PATCH /forms/:id — autosave one field or batch update values */
  @Patch(':id')
  async patch(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown) {
    return this.formService.patchForm(id, body);
  }

  /** DELETE /forms/:id — delete a form and all its associated data */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteForm(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.formService.deleteForm(id);
  }

  /** POST /forms/:id/files — upload a file field */
  @Post(':id/files')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', {
    storage: new QuarantineDiskEngine(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const ALLOWED_MIMES = new Set([
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/msword',
        'application/vnd.ms-excel',
        'application/vnd.ms-powerpoint',
        'text/plain',
        'text/csv',
      ]);
      if (ALLOWED_MIMES.has(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException(`File type "${file.mimetype}" is not allowed`), false);
      }
    },
  }))
  async uploadFile(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('fieldId') fieldId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!fieldId) throw new BadRequestException('fieldId query parameter is required');
    if (!file) throw new BadRequestException('file is required');

    const storageKey = `forms/${id}/${randomUUID()}/${randomUUID()}`;
    const meta: FileMeta = {
      mimeType:     file.mimetype,
      size:         file.size,
      originalName: file.originalname,
    };

    await this.filePipeline.process(file.path, meta, storageKey);
    return this.formService.createFileRecord(id, fieldId, storageKey, meta);
  }

  /** GET /forms/:id/files/:fileId/download — proxy-stream a file through the backend */
  @Get(':id/files/:fileId/download')
  async downloadFile(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('fileId', ParseUUIDPipe) fileId: string,
  ): Promise<StreamableFile> {
    const { stream, mimeType, filename } = await this.formService.getFileStream(id, fileId);
    return new StreamableFile(stream, {
      type: mimeType,
      disposition: `attachment; filename="${filename}"`,
    });
  }

  /** DELETE /forms/:id/files/:fileId — delete a file record and its stored object */
  @Delete(':id/files/:fileId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFile(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('fileId', ParseUUIDPipe) fileId: string,
  ): Promise<void> {
    return this.formService.deleteFileRecord(id, fileId);
  }
}
