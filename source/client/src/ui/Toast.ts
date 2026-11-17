export type ToastType = 'error' | 'success' | 'info';

const titles: Record<ToastType, string> = {
    error: 'Lỗi',
    success: 'Thành công',
    info: 'Thông tin'
};

export function showToast(message: string, type: ToastType = 'info', duration = 4000): void {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast.setAttribute('aria-atomic', 'true');

    const content = document.createElement('div');
    content.className = 'toast-content';
    const title = document.createElement('strong');
    title.textContent = titles[type];
    const text = document.createElement('p');
    text.textContent = message;
    content.append(title, text);

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'toast-close';
    close.textContent = '×';
    close.setAttribute('aria-label', 'Đóng thông báo');

    let timer: number | undefined;
    const dismiss = () => {
        window.clearTimeout(timer);
        toast.remove();
    };
    const scheduleDismiss = () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(dismiss, duration);
    };
    close.addEventListener('click', dismiss);
    toast.addEventListener('mouseenter', () => window.clearTimeout(timer));
    toast.addEventListener('mouseleave', () => {
        if (!toast.contains(document.activeElement)) scheduleDismiss();
    });
    toast.addEventListener('focusin', () => window.clearTimeout(timer));
    toast.addEventListener('focusout', () => {
        if (!toast.matches(':hover')) scheduleDismiss();
    });

    toast.append(content, close);
    container.appendChild(toast);
    scheduleDismiss();
}

export function showError(message: string): void {
    showToast(message, 'error');
}

export function showSuccess(message: string): void {
    showToast(message, 'success');
}

export function showInfo(message: string): void {
    showToast(message, 'info');
}
