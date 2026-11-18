import type { HandlerContext } from './HandlerContext';

export class ErrorHandler {
    constructor(private context: HandlerContext) {}

    handle(data: { code?: string; payload?: string; message?: string }): void {
        this.context.onCommandError?.();
        if (data.code === 'BLOCKED_TILE' || data.code === 'NO_PATH' || data.code === 'INVALID_TARGET') {
            return;
        }
        this.context.onError(data.payload || data.message || 'Đã xảy ra lỗi máy chủ.');
    }
}
