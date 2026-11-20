import type { HandlerContext } from './HandlerContext';

const SILENT_MOVE_ERRORS = new Set(['BLOCKED_TILE', 'NO_PATH', 'INVALID_TARGET']);

export class ErrorHandler {
    constructor(private context: HandlerContext) {}

    handle(data: { code?: string; payload?: string; message?: string }): void {
        const msg = data.payload || data.message || 'Đã xảy ra lỗi máy chủ.';
        this.context.onCommandError?.();
        this.context.events?.onErrorCode?.(data.code, msg);
        if (data.code && SILENT_MOVE_ERRORS.has(data.code)) {
            return;
        }
        this.context.onError(msg);
    }
}
