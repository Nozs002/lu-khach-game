import { WORLD } from '../data/tiledWorld';
import manifest from '../../public/assets/manifest.json';
import dialogueFile from '../../../common/npcs/dialogues.json';
import type { WebSocketClient } from '../network/WebSocketClient';
import type { CanvasRenderer } from '../render/CanvasRenderer';

type Dialogue = { npcId: string; lines: string[] };
const dialogues: Record<string, Dialogue> = dialogueFile.dialogues;
const appearances: Record<string, { portrait: string }> = manifest.npcTypes;

/** Static, read-only dialogue; it grants no items, quests or other gameplay state. */
export class NpcInteractionController {
    private readonly canvas: HTMLCanvasElement;
    private readonly name: HTMLElement;
    private readonly portrait: HTMLImageElement;
    private readonly text: HTMLElement;
    private readonly progress: HTMLElement;
    private readonly next: HTMLButtonElement;
    private readonly dismiss: HTMLButtonElement;
    private lines: readonly string[] = [];
    private index = 0;
    private readonly handleClick = (event: MouseEvent) => this.onClick(event);
    private readonly handleNext = () => {
        if (!this.isOpen) return;
        if (this.index + 1 >= this.lines.length) this.close();
        else { this.index++; this.renderLine(); }
    };
    private readonly handleDismiss = () => this.close();
    private readonly handleClose = () => {
        if (this.dialog.open) return;
        this.lines = [];
        this.index = 0;
    };

    constructor(
        private readonly renderer: CanvasRenderer,
        private readonly net: WebSocketClient,
        private readonly dialog: HTMLDialogElement,
        private readonly notify: (message: string) => void,
        private readonly onStart: () => void
    ) {
        this.canvas = renderer.getCanvas();
        this.name = dialog.querySelector<HTMLElement>('[data-npc-name]')!;
        this.portrait = dialog.querySelector<HTMLImageElement>('[data-npc-portrait]')!;
        this.text = dialog.querySelector<HTMLElement>('[data-npc-line]')!;
        this.progress = dialog.querySelector<HTMLElement>('[data-npc-progress]')!;
        this.next = dialog.querySelector<HTMLButtonElement>('[data-npc-next]')!;
        this.dismiss = dialog.querySelector<HTMLButtonElement>('[data-npc-dismiss]')!;
        // Capture first so clicking an NPC never becomes a click-to-move command.
        this.canvas.addEventListener('click', this.handleClick, true);
        this.next.addEventListener('click', this.handleNext);
        this.dismiss.addEventListener('click', this.handleDismiss);
        dialog.addEventListener('close', this.handleClose);
    }

    get isOpen(): boolean { return this.dialog.open; }

    getNpcAtClientPosition(clientX: number, clientY: number): typeof WORLD.npcs[number] | undefined {
        if (!this.net.myId || !this.net.map) return undefined;
        const tile = this.renderer.getTileAtClientPosition(clientX, clientY);
        return tile ? WORLD.npcs.find(npc => npc.x === tile.x && npc.y === tile.y) : undefined;
    }

    private onClick(event: MouseEvent): void {
        if (this.isOpen) {
            event.preventDefault();
            event.stopImmediatePropagation();
            return;
        }
        const npc = this.getNpcAtClientPosition(event.clientX, event.clientY);
        if (!npc) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        const me = this.net.myId ? this.net.players.get(this.net.myId) : undefined;
        if (!me) return;
        if (Math.abs(me.x - npc.x) + Math.abs(me.y - npc.y) > npc.interactionRadius) {
            this.notify(`Hãy đến gần ${npc.displayName} (trong ${npc.interactionRadius} ô) để trò chuyện.`);
            return;
        }
        const dialogue = dialogues[npc.dialogueId];
        if (!dialogue || dialogue.npcId !== npc.npcId || !dialogue.lines.length) {
            this.notify('Nhân vật này chưa có lời thoại.');
            return;
        }
        // Cancel the previous route before opening the conversation.
        if (!this.net.sendMoveTo(me.x, me.y)) {
            this.notify('Chưa kết nối máy chủ.');
            return;
        }
        this.onStart();
        this.name.textContent = npc.displayName;
        const appearance = appearances[npc.characterId];
        this.portrait.hidden = !appearance;
        if (appearance) this.portrait.src = `/assets/${appearance.portrait}`;
        this.portrait.alt = npc.displayName;
        this.lines = dialogue.lines;
        this.index = 0;
        this.renderLine();
        this.dialog.showModal();
        this.next.focus();
    }

    private renderLine(): void {
        this.text.textContent = this.lines[this.index];
        this.progress.textContent = `${this.index + 1} / ${this.lines.length}`;
        this.next.textContent = this.index + 1 < this.lines.length ? 'Chuyển' : 'Kết thúc';
    }

    close(): void {
        if (this.dialog.open) this.dialog.close();
        this.handleClose();
    }

    destroy(): void {
        this.close();
        this.canvas.removeEventListener('click', this.handleClick, true);
        this.next.removeEventListener('click', this.handleNext);
        this.dismiss.removeEventListener('click', this.handleDismiss);
        this.dialog.removeEventListener('close', this.handleClose);
    }
}
