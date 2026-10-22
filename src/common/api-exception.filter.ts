import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

function readMessage(body: unknown, fallback: string): string {
  if (typeof body === 'string' && body) {
    return body;
  }
  if (!body || typeof body !== 'object' || !('message' in body)) {
    return fallback;
  }
  const message = (body as { message?: unknown }).message;
  if (typeof message === 'string' && message) {
    return message;
  }
  if (
    Array.isArray(message) &&
    message.every((item) => typeof item === 'string')
  ) {
    return message.join(' ');
  }
  return fallback;
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    if (response.headersSent) {
      return;
    }
    if (exception instanceof HttpException) {
      response.status(exception.getStatus()).json({
        message: readMessage(exception.getResponse(), exception.message),
      });
      return;
    }
    console.error(exception);
    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: 'Something went wrong' });
  }
}
