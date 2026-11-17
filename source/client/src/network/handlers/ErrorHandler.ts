import type { HandlerContext } from './HandlerContext';

export class ErrorHandler {
    constructor(private context: HandlerContext) {}

    handle(data: { payload?: string; message?: string }): void {
        this.context.onError(data.payload || data.message || 'Đã xảy ra lỗi máy chủ.');
        this.context.close();
    }
}
