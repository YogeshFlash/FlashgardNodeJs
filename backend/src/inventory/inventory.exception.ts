import { HttpException, HttpStatus } from '@nestjs/common';

export class InventoryException extends HttpException {
  constructor(errorCode: string, message: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super(
      {
        success: false,
        error_code: errorCode,
        message: message,
      },
      status,
    );
  }
}
