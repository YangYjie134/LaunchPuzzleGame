/**
 * Ball.ts — 小球数据模型（位置、速度、状态）。
 *
 * 不含任何绘制逻辑；绘制由 GameScene 持有的 Laya.Sprite 负责。
 * 分离数据与视图，便于阶段 3 的 PhysicsEngine 直接操作此对象。
 */
export class Ball {

    x: number;
    y: number;
    vx: number = 0;
    vy: number = 0;
    readonly radius: number;

    /** true = 已发射，不再允许拖拽蓄力 */
    isLaunched: boolean = false;

    /** true = 运动停止，等待玩家按重置 */
    isStopped: boolean = false;

    private readonly _startX: number;
    private readonly _startY: number;

    constructor(x: number, y: number, radius: number) {
        this.x = x;
        this.y = y;
        this._startX = x;
        this._startY = y;
        this.radius = radius;
    }

    /** 重置回初始位置和状态（重置按钮 / 关卡重载时调用） */
    reset(): void {
        this.x = this._startX;
        this.y = this._startY;
        this.vx = 0;
        this.vy = 0;
        this.isLaunched = false;
        this.isStopped = false;
    }
}
