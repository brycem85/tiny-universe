export type BodyType = 'dust' | 'asteroid' | 'planet' | 'star';
export type Tool = 'select' | 'spawn' | 'launch' | 'delete';
export type Scenario = 'solar' | 'binary' | 'chaos';
export interface Vec { x: number; y: number }
export interface Body extends Vec { id: number; name: string; vx: number; vy: number; mass: number; radius: number; color: string; type: BodyType; trail: Vec[]; born: number }
export interface Particle extends Vec { vx: number; vy: number; life: number; maxLife: number; size: number; color: string }
export interface Settings { paused: boolean; speed: number; gravity: number; trails: boolean; trailLength: number; collision: 'merge' | 'bounce' }
export interface Camera extends Vec { zoom: number }
export interface LogEntry { id: number; time: number; text: string }
export interface Snapshot { bodies: number; mass: number; elapsed: number; fps: number; selected: Body | undefined; logs: LogEntry[]; seed: number }
