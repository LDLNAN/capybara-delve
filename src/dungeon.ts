// Procedural floor layout: rooms on a jittered grid joined by wide corridors.
import { RNG } from './rng';

export const TILE = 64;
export const VOID = 0,
  FLOOR = 1,
  WALL = 2;

export type RoomKind = 'start' | 'monster' | 'treasure' | 'armory' | 'gauntlet' | 'recruit' | 'spring' | 'exit' | 'boss' | 'junction';

export interface Room {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
  kind: RoomKind;
  gx: number;
  gy: number;
  dist: number; // graph distance from start
  cleared: boolean;
  visited: boolean;
}

export interface Dungeon {
  w: number;
  h: number;
  tiles: Uint8Array;
  rooms: Room[];
  roomAt: Int16Array;
  start: Room;
  exit: Room;
  boss: boolean;
  edges: [number, number][];
}

export function generateDungeon(depth: number, boss: boolean, r: RNG): Dungeon {
  let gc: number, gr: number;
  if (boss) [gc, gr] = [3, 2];
  else if (depth <= 1) [gc, gr] = [3, 2];
  else if (depth <= 2) [gc, gr] = [4, 2];
  else if (depth <= 5) [gc, gr] = r.chance(0.5) ? [4, 3] : [3, 3];
  else [gc, gr] = r.chance(0.5) ? [4, 3] : [5, 3];
  const cw = boss ? 19 : 17,
    ch = boss ? 16 : 15;
  const w = gc * cw + 4,
    h = gr * ch + 4;
  const tiles = new Uint8Array(w * h);
  const roomAt = new Int16Array(w * h).fill(-1);

  const rooms: Room[] = [];
  const cellRoom: number[][] = [];
  for (let gy = 0; gy < gr; gy++) {
    cellRoom.push([]);
    for (let gx = 0; gx < gc; gx++) {
      const ox = 2 + gx * cw,
        oy = 2 + gy * ch;
      const junction = !boss && gc * gr > 6 && r.chance(0.18);
      let rw: number, rh: number;
      if (junction) {
        rw = 3;
        rh = 3;
      } else {
        rw = r.int(8, cw - 4);
        rh = r.int(7, ch - 4);
      }
      const x = ox + r.int(1, cw - rw - 2);
      const y = oy + r.int(1, ch - rh - 2);
      const room: Room = {
        id: rooms.length, x, y, w: rw, h: rh, cx: Math.floor(x + rw / 2), cy: Math.floor(y + rh / 2),
        kind: junction ? 'junction' : 'monster', gx, gy, dist: 0, cleared: false, visited: false,
      };
      cellRoom[gy].push(room.id);
      rooms.push(room);
    }
  }

  // spanning tree over grid (randomised DFS) + some extra loops
  const edges: [number, number][] = [];
  const seen = new Set<number>();
  const stack = [rooms[r.int(0, rooms.length - 1)].id];
  seen.add(stack[0]);
  while (stack.length) {
    const cur = stack[stack.length - 1];
    const cr = rooms[cur];
    const nbrs: number[] = [];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cr.gx + dx,
        ny = cr.gy + dy;
      if (nx < 0 || ny < 0 || nx >= gc || ny >= gr) continue;
      const nid = cellRoom[ny][nx];
      if (!seen.has(nid)) nbrs.push(nid);
    }
    if (!nbrs.length) {
      stack.pop();
      continue;
    }
    const n = r.pick(nbrs);
    seen.add(n);
    edges.push([cur, n]);
    stack.push(n);
  }
  const extra = boss ? 0 : Math.floor(rooms.length / 4);
  for (let i = 0; i < extra; i++) {
    const a = r.pick(rooms);
    const dirs = [[1, 0], [0, 1]];
    const [dx, dy] = r.pick(dirs);
    const nx = a.gx + dx,
      ny = a.gy + dy;
    if (nx >= gc || ny >= gr) continue;
    const b = cellRoom[ny][nx];
    if (!edges.some(([p, q]) => (p === a.id && q === b) || (p === b && q === a.id))) edges.push([a.id, b]);
  }

  const carve = (x: number, y: number, room = -1) => {
    if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) return;
    tiles[y * w + x] = FLOOR;
    if (room >= 0) roomAt[y * w + x] = room;
  };
  for (const rm of rooms) for (let y = rm.y; y < rm.y + rm.h; y++) for (let x = rm.x; x < rm.x + rm.w; x++) carve(x, y, rm.id);

  const cwid = 3;
  for (const [ai, bi] of edges) {
    const a = rooms[ai],
      b = rooms[bi];
    const ax = a.cx,
      ay = a.cy,
      bx = b.cx,
      by = b.cy;
    const horizFirst = r.chance(0.5);
    const hline = (x0: number, x1: number, y: number) => {
      for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) for (let k = 0; k < cwid; k++) carve(x, y - 1 + k);
    };
    const vline = (y0: number, y1: number, x: number) => {
      for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let k = 0; k < cwid; k++) carve(x - 1 + k, y);
    };
    if (horizFirst) {
      hline(ax, bx, ay);
      vline(ay, by, bx);
    } else {
      vline(ay, by, ax);
      hline(ax, bx, by);
    }
  }

  // pillars in larger rooms break up sight lines and give cover
  for (const rm of rooms) {
    if (rm.kind === 'junction' || rm.w < 10 || rm.h < 8 || !r.chance(boss ? 1 : 0.45)) continue;
    const ix = rm.w >= 13 ? 3 : 2,
      iy = rm.h >= 11 ? 3 : 2;
    const big = rm.w >= 14 && rm.h >= 11 && r.chance(0.5);
    for (const [px, py] of [[rm.x + ix, rm.y + iy], [rm.x + rm.w - 1 - ix, rm.y + iy], [rm.x + ix, rm.y + rm.h - 1 - iy], [rm.x + rm.w - 1 - ix, rm.y + rm.h - 1 - iy]]) {
      for (let dy = 0; dy < (big ? 2 : 1); dy++)
        for (let dx = 0; dx < (big ? 2 : 1); dx++) {
          const qx = px + (px > rm.cx ? -dx : dx),
            qy = py + (py > rm.cy ? -dy : dy);
          tiles[qy * w + qx] = WALL;
          roomAt[qy * w + qx] = -1;
        }
    }
  }

  // walls around floor
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (tiles[y * w + x] !== VOID) continue;
      let near = false;
      for (let dy = -1; dy <= 1 && !near; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx,
            ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < w && ny < h && tiles[ny * w + nx] === FLOOR) {
            near = true;
            break;
          }
        }
      if (near) tiles[y * w + x] = WALL;
    }

  // graph distances
  const real = rooms.filter((q) => q.kind !== 'junction');
  const startPool = real.filter((q) => (q.gx === 0 || q.gx === gc - 1) && q.w * q.h < 150).concat(real.filter((q) => q.gx === 0));
  const start = r.pick(startPool.length ? startPool : real);
  start.kind = 'start';
  const adj = new Map<number, number[]>();
  for (const [a, b] of edges) {
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a)!.push(b);
    adj.get(b)!.push(a);
  }
  for (const q of rooms) q.dist = -1;
  start.dist = 0;
  const queue = [start.id];
  while (queue.length) {
    const c = queue.shift()!;
    for (const n of adj.get(c) ?? []) {
      if (rooms[n].dist < 0) {
        rooms[n].dist = rooms[c].dist + 1;
        queue.push(n);
      }
    }
  }
  let exit = start;
  for (const q of real) if (q.dist > exit.dist || (q.dist === exit.dist && q.w * q.h > exit.w * exit.h)) exit = q;

  if (boss) {
    // grow exit room to fill its cell for an arena
    const ox = 2 + exit.gx * cw,
      oy = 2 + exit.gy * ch;
    exit.x = ox + 1;
    exit.y = oy + 1;
    exit.w = cw - 2;
    exit.h = ch - 2;
    exit.cx = Math.floor(exit.x + exit.w / 2);
    exit.cy = Math.floor(exit.y + exit.h / 2);
    for (let y = exit.y - 1; y <= exit.y + exit.h; y++)
      for (let x = exit.x - 1; x <= exit.x + exit.w; x++) {
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const inside = x >= exit.x && x < exit.x + exit.w && y >= exit.y && y < exit.y + exit.h;
        if (inside) {
          tiles[y * w + x] = FLOOR;
          roomAt[y * w + x] = exit.id;
        } else if (tiles[y * w + x] === VOID) tiles[y * w + x] = WALL;
      }
    // re-wall around
    for (let y = exit.y - 2; y <= exit.y + exit.h + 1; y++)
      for (let x = exit.x - 2; x <= exit.x + exit.w + 1; x++) {
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        if (tiles[y * w + x] !== VOID) continue;
        let near = false;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx,
              ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < w && ny < h && tiles[ny * w + nx] === FLOOR) near = true;
          }
        if (near) tiles[y * w + x] = WALL;
      }
    // four stone pillars to duck behind
    for (const [px, py] of [[exit.x + 4, exit.y + 3], [exit.x + exit.w - 5, exit.y + 3], [exit.x + 4, exit.y + exit.h - 4], [exit.x + exit.w - 5, exit.y + exit.h - 4]]) {
      tiles[py * w + px] = WALL;
      roomAt[py * w + px] = -1;
    }
    exit.kind = 'boss';
  } else exit.kind = 'exit';

  // special rooms
  const candidates = real.filter((q) => q.kind === 'monster');
  r.shuffle(candidates);
  const near = candidates.filter((q) => q.dist >= 1 && q.dist <= 2);
  const recruit = near[0] ?? candidates[0];
  if (recruit) recruit.kind = 'recruit';
  const rest = candidates.filter((q) => q.kind === 'monster');
  const treasureCount = rooms.length >= 10 ? 2 : 1;
  for (let i = 0; i < treasureCount && rest.length > 1; i++) rest.pop()!.kind = 'treasure';
  if (rest.length > 2 && r.chance(0.55)) rest.pop()!.kind = 'spring';
  // Keep the early floor simple; deeper floors gain a focused gear stop and a risky reward.
  if (depth >= 2 && rest.length > 2 && r.chance(0.7)) rest.pop()!.kind = 'armory';
  if (depth >= 4 && rest.length > 2 && r.chance(0.55)) rest.pop()!.kind = 'gauntlet';

  return { w, h, tiles, rooms, roomAt, start, exit, boss, edges };
}

export function isSolid(d: Dungeon, tx: number, ty: number): boolean {
  if (tx < 0 || ty < 0 || tx >= d.w || ty >= d.h) return true;
  return d.tiles[ty * d.w + tx] !== FLOOR;
}
