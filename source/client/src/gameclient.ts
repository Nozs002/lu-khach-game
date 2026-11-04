/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. https://mozilla.org/MPL/2.0/
 * TypeScript port of BrowserQuest client/js/gameclient.js, Little Workshop.
 * Keeps the AMD constructor API for the modules awaiting migration. */

type EntityId = number;
interface LegacyEntity {
  id: EntityId;
  name: string;
  weaponName?: string;
  spriteName?: string;
  wasDropped?: boolean;
  playersInvolved?: number[];
}
interface LocalPlayer extends LegacyEntity {
  getSpriteName(): string;
  getWeaponName(): string;
}
interface EntityFactoryApi { createEntity(kind: number, id: number, name?: string): LegacyEntity }
declare const Types: {
  isItem(kind: number): boolean; isChest(kind: number): boolean;
  isPlayer(kind: number): boolean; isMob(kind: number): boolean;
  getKindAsString(kind: number): string; getKindFromString(name: string): number;
};
declare function define(dependencies: string[], factory: (Player: new (...args: unknown[]) => LegacyEntity, factory: EntityFactoryApi) => unknown): void;

define(['player', 'entityfactory'], (Player, EntityFactory) => {
  enum Message {
    HELLO, WELCOME, SPAWN, DESPAWN, MOVE, LOOTMOVE, AGGRO, ATTACK, HIT, HURT,
    HEALTH, CHAT, LOOT, EQUIP, DROP, TELEPORT, DAMAGE, POPULATION, KILL, LIST,
    WHO, ZONE, DESTROY, HP, BLINK, OPEN, CHECK
  }
  type Packet = unknown[];
  interface Callbacks {
    connected: () => void;
    dispatched: (host: string, port: number) => void;
    disconnected: (reason: string) => void;
    welcome: (id: number, name: string, x: number, y: number, hp: number) => void;
    spawnCharacter: (entity: LegacyEntity, x: number, y: number, orientation?: number, target?: number) => void;
    spawnItem: (entity: LegacyEntity, x: number, y: number) => void;
    spawnChest: (entity: LegacyEntity, x: number, y: number) => void;
    despawn: (id: number) => void;
    move: (id: number, x: number, y: number) => void;
    attack: (id: number, target: number) => void;
    health: (hp: number, regen: boolean) => void;
    equip: (id: number, kind: number) => void;
    lootMove: (id: number, item: number) => void;
    teleport: (id: number, x: number, y: number) => void;
    chat: (id: number, text: string) => void;
    drop: (item: LegacyEntity, mobId: number) => void;
    damage: (id: number, points: number) => void;
    kill: (kind: number) => void;
    population: (world: number, total: number) => void;
    list: (ids: number[]) => void;
    destroy: (id: number) => void;
    hp: (points: number) => void;
    blink: (id: number) => void;
  }
  const number = (packet: Packet, index: number): number => {
    const value = packet[index];
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Expected finite number');
    return value;
  };
  const text = (packet: Packet, index: number): string => {
    const value = packet[index];
    if (typeof value !== 'string') throw new Error('Expected string');
    return value;
  };

  class GameClient {
    connection: WebSocket | null = null;
    isListening = true;
    awaitingWelcome = false;
    isTimeout = false;
    private callbacks: Partial<Callbacks> = {};
    constructor(public host: string, public port: number) {}
    enable() { this.isListening = true; }
    disable() { this.isListening = false; }
    connect(dispatcherMode = false) {
      if (dispatcherMode) throw new Error('Dispatcher is not used by the Java server');
      const override = new URLSearchParams(location.search).get('server');
      const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
      const socket = this.connection = new WebSocket(override ?? `${protocol}://${this.host}:${this.port}/`);
      socket.onmessage = event => {
        if (event.data === 'go') { this.callbacks.connected?.(); return; }
        if (event.data === 'timeout') { this.isTimeout = true; return; }
        try { this.receiveMessage(event.data); }
        catch (error) { console.error('Invalid BrowserQuest packet', error); socket.close(1002, 'Invalid game packet'); }
      };
      socket.onerror = () => console.error('Cannot connect to Java game server');
      socket.onclose = () => {
        document.getElementById('container')?.classList.add('error');
        this.callbacks.disconnected?.(this.isTimeout ? 'Bạn bị ngắt kết nối vì không thao tác quá lâu.' : 'Đã mất kết nối với server Java.');
      };
    }
    sendMessage(packet: Packet) {
      if (this.connection?.readyState === WebSocket.OPEN) this.connection.send(JSON.stringify(packet));
    }
    receiveMessage(raw: string) {
      if (!this.isListening) return;
      const value: unknown = JSON.parse(raw);
      if (!Array.isArray(value)) throw new Error('Expected packet array');
      if (Array.isArray(value[0])) {
        for (const packet of value) {
          if (!Array.isArray(packet)) throw new Error('Expected batch packet');
          this.receiveAction(packet);
        }
      } else this.receiveAction(value);
    }
    receiveAction(packet: Packet) {
      const action = number(packet, 0), c = this.callbacks;
      if (this.awaitingWelcome && action !== Message.WELCOME) return;
      switch (action) {
        case Message.WELCOME:
          this.awaitingWelcome = false;
          c.welcome?.(number(packet, 1), text(packet, 2), number(packet, 3), number(packet, 4), number(packet, 5)); break;
        case Message.SPAWN: this.receiveSpawn(packet); break;
        case Message.DESPAWN: c.despawn?.(number(packet, 1)); break;
        case Message.MOVE: c.move?.(number(packet, 1), number(packet, 2), number(packet, 3)); break;
        case Message.LOOTMOVE: c.lootMove?.(number(packet, 1), number(packet, 2)); break;
        case Message.ATTACK: c.attack?.(number(packet, 1), number(packet, 2)); break;
        case Message.HEALTH: c.health?.(number(packet, 1), packet[2] === 1); break;
        case Message.CHAT: c.chat?.(number(packet, 1), text(packet, 2)); break;
        case Message.EQUIP: c.equip?.(number(packet, 1), number(packet, 2)); break;
        case Message.DROP: {
          const item = EntityFactory.createEntity(number(packet, 3), number(packet, 2));
          item.wasDropped = true;
          item.playersInvolved = Array.isArray(packet[4]) ? packet[4].filter((id): id is number => typeof id === 'number') : [];
          c.drop?.(item, number(packet, 1)); break;
        }
        case Message.TELEPORT: c.teleport?.(number(packet, 1), number(packet, 2), number(packet, 3)); break;
        case Message.DAMAGE: c.damage?.(number(packet, 1), number(packet, 2)); break;
        case Message.POPULATION: c.population?.(number(packet, 1), number(packet, 2)); break;
        case Message.KILL: c.kill?.(number(packet, 1)); break;
        case Message.LIST: c.list?.(packet.slice(1).map((_, index) => number(packet, index + 1))); break;
        case Message.DESTROY: c.destroy?.(number(packet, 1)); break;
        case Message.HP: c.hp?.(number(packet, 1)); break;
        case Message.BLINK: c.blink?.(number(packet, 1)); break;
        default: console.warn('Unsupported packet', action);
      }
    }
    private receiveSpawn(packet: Packet) {
      const id = number(packet, 1), kind = number(packet, 2), x = number(packet, 3), y = number(packet, 4);
      const name = Types.isPlayer(kind) ? text(packet, 5) : undefined;
      const entity = EntityFactory.createEntity(kind, id, name);
      if (Types.isItem(kind)) this.callbacks.spawnItem?.(entity, x, y);
      else if (Types.isChest(kind)) this.callbacks.spawnChest?.(entity, x, y);
      else {
        let orientation: number | undefined, target: number | undefined;
        if (Types.isPlayer(kind)) {
          orientation = number(packet, 6);
          if (entity instanceof Player) {
            entity.spriteName = Types.getKindAsString(number(packet, 7));
            entity.weaponName = Types.getKindAsString(number(packet, 8));
          }
          if (packet.length > 9) target = number(packet, 9);
        } else if (Types.isMob(kind)) {
          orientation = number(packet, 5);
          if (packet.length > 6) target = number(packet, 6);
        }
        this.callbacks.spawnCharacter?.(entity, x, y, orientation, target);
      }
    }
    onConnected(callback: Callbacks['connected']) { this.callbacks.connected = callback; }
    onDispatched(callback: Callbacks['dispatched']) { this.callbacks.dispatched = callback; }
    onDisconnected(callback: Callbacks['disconnected']) { this.callbacks.disconnected = callback; }
    onWelcome(callback: Callbacks['welcome']) { this.callbacks.welcome = callback; }
    onSpawnCharacter(callback: Callbacks['spawnCharacter']) { this.callbacks.spawnCharacter = callback; }
    onSpawnItem(callback: Callbacks['spawnItem']) { this.callbacks.spawnItem = callback; }
    onSpawnChest(callback: Callbacks['spawnChest']) { this.callbacks.spawnChest = callback; }
    onDespawnEntity(callback: Callbacks['despawn']) { this.callbacks.despawn = callback; }
    onEntityMove(callback: Callbacks['move']) { this.callbacks.move = callback; }
    onEntityAttack(callback: Callbacks['attack']) { this.callbacks.attack = callback; }
    onPlayerChangeHealth(callback: Callbacks['health']) { this.callbacks.health = callback; }
    onPlayerEquipItem(callback: Callbacks['equip']) { this.callbacks.equip = callback; }
    onPlayerMoveToItem(callback: Callbacks['lootMove']) { this.callbacks.lootMove = callback; }
    onPlayerTeleport(callback: Callbacks['teleport']) { this.callbacks.teleport = callback; }
    onChatMessage(callback: Callbacks['chat']) { this.callbacks.chat = callback; }
    onDropItem(callback: Callbacks['drop']) { this.callbacks.drop = callback; }
    onPlayerDamageMob(callback: Callbacks['damage']) { this.callbacks.damage = callback; }
    onPlayerKillMob(callback: Callbacks['kill']) { this.callbacks.kill = callback; }
    onPopulationChange(callback: Callbacks['population']) { this.callbacks.population = callback; }
    onEntityList(callback: Callbacks['list']) { this.callbacks.list = callback; }
    onEntityDestroy(callback: Callbacks['destroy']) { this.callbacks.destroy = callback; }
    onPlayerChangeMaxHitPoints(callback: Callbacks['hp']) { this.callbacks.hp = callback; }
    onItemBlink(callback: Callbacks['blink']) { this.callbacks.blink = callback; }
    sendHello(player: LocalPlayer) {
      this.awaitingWelcome = true;
      this.sendMessage([Message.HELLO, player.name, Types.getKindFromString(player.getSpriteName()), Types.getKindFromString(player.getWeaponName())]);
    }
    sendMove(x: number, y: number) { this.sendMessage([Message.MOVE, x, y]); }
    sendLootMove(item: LegacyEntity, x: number, y: number) { this.sendMessage([Message.LOOTMOVE, x, y, item.id]); }
    sendAggro(mob: LegacyEntity) { this.sendMessage([Message.AGGRO, mob.id]); }
    sendAttack(mob: LegacyEntity) { this.sendMessage([Message.ATTACK, mob.id]); }
    sendHit(mob: LegacyEntity) { this.sendMessage([Message.HIT, mob.id]); }
    sendHurt(mob: LegacyEntity) { this.sendMessage([Message.HURT, mob.id]); }
    sendChat(message: string) { this.sendMessage([Message.CHAT, message]); }
    sendLoot(item: LegacyEntity) { this.sendMessage([Message.LOOT, item.id]); }
    sendTeleport(x: number, y: number) { this.sendMessage([Message.TELEPORT, x, y]); }
    sendWho(ids: number[]) { this.sendMessage([Message.WHO, ...ids]); }
    sendZone() { this.sendMessage([Message.ZONE]); }
    sendOpen(chest: LegacyEntity) { this.sendMessage([Message.OPEN, chest.id]); }
    sendCheck(id: number) { this.sendMessage([Message.CHECK, id]); }
  }
  return GameClient;
});
