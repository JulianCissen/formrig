import { Logger } from '@nestjs/common';
import type { Logger as ILogger, LoggerNamespace, LogContext } from '@mikro-orm/core';

export class MikroOrmLogger implements ILogger {
  private readonly logger = new Logger('MikroORM');
  private debugMode: boolean | LoggerNamespace[] = false;

  constructor(debugMode: boolean | LoggerNamespace[] = false) {
    this.debugMode = debugMode;
  }

  log(namespace: LoggerNamespace | string, message: string, _context?: LogContext): void {
    this.logger.debug(`[${namespace}] ${message}`);
  }

  warn(namespace: LoggerNamespace | string, message: string, _context?: LogContext): void {
    this.logger.warn(`[${namespace}] ${message}`);
  }

  error(namespace: LoggerNamespace | string, message: string, _context?: LogContext): void {
    this.logger.error(`[${namespace}] ${message}`);
  }

  logQuery(context: LogContext): void {
    const query = context.label ? `(${context.label}) ${context.query}` : context.query;
    this.logger.debug(`[query] ${query}`);
  }

  isEnabled(namespace: LoggerNamespace, _context?: LogContext): boolean {
    if (this.debugMode === false) return false;
    if (this.debugMode === true) return true;
    return (this.debugMode as LoggerNamespace[]).includes(namespace);
  }

  setDebugMode(debugMode: boolean | LoggerNamespace[]): void {
    this.debugMode = debugMode;
  }
}
