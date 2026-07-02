/**
 * GameConfig.ts
 * 全局常量，所有魔法数字集中在此处，调参只改这一个文件。
 */
export class GameConfig {
    /** 画布宽度 */
    static readonly CANVAS_W: number = 800;
    /** 画布高度 */
    static readonly CANVAS_H: number = 600;

    /** 重力加速度（像素/秒²） */
    static readonly GRAVITY: number = 980;
    /** 弹力系数（0~1，越大越弹） */
    static readonly BOUNCE: number = 0.65;
    /** 速度衰减系数（每帧乘以此值，模拟摩擦） */
    static readonly FRICTION: number = 0.995;

    /** 小球半径（像素） */
    static readonly BALL_RADIUS: number = 12;
    /** 最大蓄力拖拽距离（像素） */
    static readonly MAX_DRAG: number = 150;
    /** 最大蓄力时的初速度（像素/秒）。MAX_DRAG 拉满时等于此值 */
    static readonly LAUNCH_SPEED_MAX: number = Math.hypot(GameConfig.CANVAS_W, GameConfig.CANVAS_H);
    /** 目标区域半径（像素） */
    static readonly TARGET_RADIUS: number = 28;

    /** 速度低于此值（像素/秒）且贴近地面时，判定小球停止 */
    static readonly STOP_SPEED: number = 20;

    /** 关卡总数 */
    static readonly TOTAL_LEVELS: number = 3;
}
