/** Move the live minimap into a modal so both views share discovery state. */
export class ExpandedMap {
    private readonly placeholder = document.createComment('minimap-home');
    private readonly closeButton: HTMLButtonElement;
    private readonly content: HTMLElement;
    private sidebarScrollTop = 0;
    private readonly handleResize = () => { if (this.isOpen) this.sizeMap(); };
    private previousFocus: HTMLElement | null = null;
    private readonly handleClose = () => {
        if (this.dialog.open) return;
        this.placeholder.parentNode?.insertBefore(this.panel, this.placeholder.nextSibling);
        this.scroller.scrollTop = this.sidebarScrollTop;
        this.onModeChange(false);
        this.previousFocus?.focus();
    };
    private readonly handleCloseClick = () => this.dialog.close();
    private readonly handleBackdropClick = (event: MouseEvent) => {
        if (event.target === this.dialog) this.dialog.close();
    };

    private get scroller(): HTMLElement { return this.panel.querySelector<HTMLElement>('.minimap-scroll')!; }

    constructor(private readonly panel: HTMLElement, private readonly dialog: HTMLDialogElement,
        private readonly getPlayerY: () => number = () => 0.5,
        private readonly onModeChange: (expanded: boolean) => void = () => {}) {
        panel.before(this.placeholder);
        this.closeButton = dialog.querySelector<HTMLButtonElement>('[data-close-map]')!;
        this.content = dialog.querySelector<HTMLElement>('[data-map-content]')!;
        this.closeButton.addEventListener('click', this.handleCloseClick);
        dialog.addEventListener('close', this.handleClose);
        dialog.addEventListener('click', this.handleBackdropClick);
        window.addEventListener('resize', this.handleResize);
    }

    get isOpen(): boolean { return this.dialog.open; }

    toggle(): void {
        if (this.dialog.open) {
            this.dialog.close();
            return;
        }
        this.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        this.sidebarScrollTop = this.scroller.scrollTop;
        this.content.appendChild(this.panel);
        this.onModeChange(true);
        this.dialog.showModal();
        this.closeButton.focus();
        this.sizeMap();
        this.scroller.scrollTop = this.getPlayerY() * this.scroller.scrollHeight - this.scroller.clientHeight / 2;
    }

    private sizeMap(): void {
        const canvas = this.panel.querySelector<HTMLCanvasElement>('canvas')!;
        const aspect = canvas.width / canvas.height;
        const maxHeight = Math.min(window.innerHeight * 0.62, 650);
        const width = Math.min(1000, window.innerWidth - 24, maxHeight * 3 * aspect + 42);
        this.dialog.style.width = `${width}px`;
        // The full map keeps its natural aspect ratio; the window shows one third.
        const mapWidth = canvas.clientWidth;
        this.dialog.style.setProperty('--map-view-height', `${Math.min(maxHeight, mapWidth / aspect / 3)}px`);
    }

    destroy(): void {
        if (this.dialog.open) this.dialog.close();
        this.handleClose();
        this.placeholder.remove();
        this.closeButton.removeEventListener('click', this.handleCloseClick);
        this.dialog.removeEventListener('close', this.handleClose);
        this.dialog.removeEventListener('click', this.handleBackdropClick);
        window.removeEventListener('resize', this.handleResize);
    }
}
