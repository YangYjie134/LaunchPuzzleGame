import { GameConfig } from "../game/GameConfig";
import { Ball } from "../objects/Ball";

/**
 * PhysicsEngine.ts — 纯逻辑物理步进引擎（阶段 3 R1.1）。
 *
 * 设计边界：
 *  - 不依赖 Laya.Sprite / Laya.Graphics / Laya.stage，只操作数值与 Ball。
 *  - 不持有任何跨帧状态（无内部计时器/计数器/累加器），每次 step() 都是
 *    纯函数：给定相同输入，输出结果一致，方便脱离引擎单测。
 *  - 不触发重生、不切关、不碰 UI、不做状态机判断——只把"发生了什么"
 *    通过 PhysicsStepResult 上报给调用方（GameScene/GameManager），
 *    由调用方决定下一步状态怎么走。
 *  - 平台只需要提供矩形 bounds（RectBounds），不要求是 Platform 实例，
 *    碰撞解算（最近点法 + 反射）全部在本文件内完成。
 *
 * 固定步长 / 累加器职责边界：
 *  - PhysicsEngine 只提供固定步长常量 FIXED_DT，并保证 step() 单次调用
 *    只做"一次"积分（重力 + 位移 + 碰撞），不在内部把 dt 拆成多份子步进循环。
 *  - 是否需要把一帧拆成多个 FIXED_DT、要拆几次，属于"跨帧累加器"的职责，
 *    累加器必须由调用方（GameScene）持有和维护，PhysicsEngine 不持有任何
 *    与时间推进节奏相关的场景状态。
 *  - R4 接入时的典型用法（仅作说明，不在本文件实现）：
 *      accumulator += frameDt;
 *      while (accumulator >= PhysicsEngine.FIXED_DT) {
 *          const result = PhysicsEngine.step(ball, platforms, PhysicsEngine.FIXED_DT, context);
 *          accumulator -= PhysicsEngine.FIXED_DT;
 *          if (result.shouldStopByPhysics) { /* GameScene 自行决定是否 break + 重生 *\/ }
 *      }
 *  - 如果调用方不走累加器、直接传入可变帧 dt 单次调用，也能工作（仍会做
 *    一次完整积分），但会失去固定步长带来的轨迹确定性和抗隧穿优势，不建议
 *    在平台密集的关卡中这样用。
 */

/** 平台（或任意矩形障碍物）的世界坐标包围盒 */
export interface RectBounds {
    x: number;
    y: number;
    w: number;
    h: number;
}

/** 目标传送门的圆形区域 */
export interface PhysicsTarget {
    x: number;
    y: number;
    radius: number;
}

/** 世界边界。groundY 缺省等于 height（调用方可传入更精确的地面线，例如 H - 6） */
export interface PhysicsWorldBounds {
    width: number;
    height: number;
    groundY?: number;
}

/** 调用方在每次 step() 时传入的上下文信息（全部可选） */
export interface PhysicsStepContext {
    /** 世界边界，缺省取 GameConfig.CANVAS_W / CANVAS_H */
    bounds?: PhysicsWorldBounds;
    /** 目标传送门，不传则 reachedTarget 恒为 false */
    target?: PhysicsTarget;
    /** 本次飞行已经累计的时间（秒），由调用方自行计时累加；不传则 isTimedOut 恒为 false */
    elapsedFlightTime?: number;
}

/** 单次 step() 的上报结果，调用方据此自行决定状态切换 */
export interface PhysicsStepResult {
    /** 本次是否撞到左/右/上边界 */
    hitWall: boolean;
    /** 本次是否撞到任意平台 */
    hitPlatform: boolean;
    /** 本次是否触碰地面线（失败信号，不在引擎内处理重生） */
    hitBottom: boolean;
    /** 本次球心是否进入目标区域（信号，不在引擎内处理切关） */
    reachedTarget: boolean;
    /** 本次结束时速度是否低于 GameConfig.STOP_SPEED（仅上报，不计数、不重生） */
    isLowSpeed: boolean;
    /** 本次传入的 elapsedFlightTime 是否已超过 FLIGHT_TIMEOUT_SECONDS（仅上报） */
    isTimedOut: boolean;
    /** 便捷聚合信号：hitBottom || isTimedOut，提示"物理认为这次飞行该结束了" */
    shouldStopByPhysics: boolean;
}

export class PhysicsEngine {

    // ─── 可调常量 ────────────────────────────────────────────────
    /** 固定步长（秒）。调用方累加器应以此为粒度推进物理。
     *  1/120s 时最大初速 800px/s 下单步位移 ≈6.7px，小于球半径(12px)和
     *  建议的最小平台厚度(16px)，是缓解隧穿的关键参数之一。 */
    static readonly FIXED_DT: number = 1 / 120;
    /** 单次 step() 调用的防御性 dt 上限（秒）。这不是"拆子步"的依据，
     *  只是兜底——即使调用方没有遵守累加器约定、传入了异常大的 dt，
     *  也不允许单次积分推进过大距离。 */
    static readonly MAX_STEP_DT: number = 0.05;
    /** 速度上限（像素/秒），每次积分后做钳制，防止长时间飞行速度无限增长导致隧穿 */
    static readonly MAX_SPEED: number = 2400;
    /** 飞行超时阈值（秒），仅用于和 elapsedFlightTime 比较后上报 isTimedOut */
    static readonly FLIGHT_TIMEOUT_SECONDS: number = 6;

    // ─── 对外主入口 ──────────────────────────────────────────────
    /**
     * 推进物理状态一次：重力 → 限速 → 位移积分 → 世界边界/平台碰撞 → 地面/目标判定。
     * 只做"一次"积分，不在内部拆分 dt；是否需要按 FIXED_DT 多次调用本方法，
     * 由调用方的累加器决定（见类注释）。直接修改传入的 ball，不返回新对象。
     */
    static step(
        ball: Ball,
        platforms: RectBounds[],
        dt: number,
        context: PhysicsStepContext = {}
    ): PhysicsStepResult {

        const bounds: PhysicsWorldBounds = context.bounds ?? {
            width: GameConfig.CANVAS_W,
            height: GameConfig.CANVAS_H,
        };
        const groundY = bounds.groundY ?? bounds.height;

        const result: PhysicsStepResult = {
            hitWall: false,
            hitPlatform: false,
            hitBottom: false,
            reachedTarget: false,
            isLowSpeed: false,
            isTimedOut: false,
            shouldStopByPhysics: false,
        };

        const clampedDt = Math.min(Math.max(dt, 0), PhysicsEngine.MAX_STEP_DT);

        PhysicsEngine._integrate(ball, clampedDt, bounds, groundY, platforms, context.target, result);

        // ── 低速 / 超时信号（只读比较，不计数、不修改状态机） ──
        const speed = Math.hypot(ball.vx, ball.vy);
        result.isLowSpeed = speed < GameConfig.STOP_SPEED;

        if (context.elapsedFlightTime !== undefined) {
            result.isTimedOut = context.elapsedFlightTime >= PhysicsEngine.FLIGHT_TIMEOUT_SECONDS;
        }

        result.shouldStopByPhysics = result.hitBottom || result.isTimedOut;

        return result;
    }

    // ─── 单次积分 ────────────────────────────────────────────────
    private static _integrate(
        ball: Ball,
        dt: number,
        bounds: PhysicsWorldBounds,
        groundY: number,
        platforms: RectBounds[],
        target: PhysicsTarget | undefined,
        result: PhysicsStepResult
    ): void {
        // 1. 重力
        ball.vy += GameConfig.GRAVITY * dt;

        // 2. 限速（防止长时间飞行速度无限增长，进一步缓解隧穿）
        const speed = Math.hypot(ball.vx, ball.vy);
        if (speed > PhysicsEngine.MAX_SPEED) {
            const scale = PhysicsEngine.MAX_SPEED / speed;
            ball.vx *= scale;
            ball.vy *= scale;
        }

        // 3. 位移积分
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;

        // 4. 世界边界（左/右/上墙反弹）
        if (PhysicsEngine._resolveWorldBounds(ball, bounds)) {
            result.hitWall = true;
        }

        // 5. 平台碰撞（最近点法，逐个平台检测+解算）
        for (let i = 0; i < platforms.length; i++) {
            if (PhysicsEngine._resolvePlatformCollision(ball, platforms[i])) {
                result.hitPlatform = true;
            }
        }

        // 6. 地面线判定（失败信号，不在此处理重生）
        if (ball.y + ball.radius >= groundY) {
            ball.y = groundY - ball.radius;
            result.hitBottom = true;
        }

        // 7. 目标命中判定（信号，不在此处理切关）
        if (target && !result.reachedTarget) {
            const dx = ball.x - target.x;
            const dy = ball.y - target.y;
            if (Math.sqrt(dx * dx + dy * dy) < target.radius) {
                result.reachedTarget = true;
            }
        }
    }

    // ─── 世界边界碰撞（左/右/上，轴对齐半平面反弹） ─────────────
    private static _resolveWorldBounds(ball: Ball, bounds: PhysicsWorldBounds): boolean {
        const r = ball.radius;
        let hit = false;

        if (ball.x - r < 0) {
            ball.x = r;
            ball.vx = Math.abs(ball.vx) * GameConfig.BOUNCE;
            hit = true;
        }
        if (ball.x + r > bounds.width) {
            ball.x = bounds.width - r;
            ball.vx = -Math.abs(ball.vx) * GameConfig.BOUNCE;
            hit = true;
        }
        if (ball.y - r < 0) {
            ball.y = r;
            ball.vy = Math.abs(ball.vy) * GameConfig.BOUNCE;
            hit = true;
        }
        return hit;
    }

    // ─── 圆-矩形碰撞（最近点法）+ 反射 + 恢复系数 ───────────────
    /**
     * 最近点法：
     *  1. 把球心 (ball.x, ball.y) 在矩形 rect 上做 clamp，得到矩形上离球心最近的点 closest。
     *  2. 球心到 closest 的向量 (dx, dy)，其长度 dist 即球心到矩形的最短距离。
     *  3. 若 dist >= 球半径，说明没有重叠，不发生碰撞。
     *  4. 若 dist > 0（球心在矩形外部），归一化 (dx, dy) 得到碰撞法线 (nx, ny)，
     *     推出量 penetration = radius - dist。
     *  5. 沿法线方向反射速度，并乘以恢复系数 GameConfig.BOUNCE（非完全弹性）。
     *
     * 退化情况（球心落在矩形内部，或恰好在边界上，dist ≈ 0）：
     *  此时 closest point 退化为球心本身，(dx,dy) 无法归一化出法线。改为
     *  计算球心到矩形四条边的距离 leftDist/rightDist/topDist/bottomDist，
     *  取最小值对应的边作为推出方向（法线指向矩形外部），并且推出量必须是
     *  "球心到该边的距离 + 球半径"，而不是只用球半径——否则只会把球心推到
     *  矩形边界上，球体本身仍有一半埋在平台里，导致边缘卡死/抖动/重复反弹。
     */
    private static _resolvePlatformCollision(ball: Ball, rect: RectBounds): boolean {
        const r = ball.radius;
        const closestX = Math.min(Math.max(ball.x, rect.x), rect.x + rect.w);
        const closestY = Math.min(Math.max(ball.y, rect.y), rect.y + rect.h);

        const dx = ball.x - closestX;
        const dy = ball.y - closestY;
        const distSq = dx * dx + dy * dy;

        if (distSq >= r * r) return false; // 未重叠

        const dist = Math.sqrt(distSq);
        let nx: number;
        let ny: number;
        let penetration: number;

        if (dist > 1e-6) {
            // 球心在矩形外部：最近点有效，法线 = (dx,dy) 归一化
            nx = dx / dist;
            ny = dy / dist;
            penetration = r - dist;
        } else {
            // 球心落在矩形内部（或恰好在边界上）：用到四条边的距离选最近边兜底
            const leftDist = ball.x - rect.x;
            const rightDist = (rect.x + rect.w) - ball.x;
            const topDist = ball.y - rect.y;
            const bottomDist = (rect.y + rect.h) - ball.y;
            const minDist = Math.min(leftDist, rightDist, topDist, bottomDist);

            if (minDist === leftDist) { nx = -1; ny = 0; penetration = leftDist + r; }
            else if (minDist === rightDist) { nx = 1; ny = 0; penetration = rightDist + r; }
            else if (minDist === topDist) { nx = 0; ny = -1; penetration = topDist + r; }
            else { nx = 0; ny = 1; penetration = bottomDist + r; }
        }

        // 推出重叠部分，避免下一次仍处于穿透状态
        ball.x += nx * penetration;
        ball.y += ny * penetration;

        // 沿法线反射速度分量，恢复系数 GameConfig.BOUNCE（0.65，非完全弹性）
        const vDotN = ball.vx * nx + ball.vy * ny;
        if (vDotN < 0) {
            // 只有当球正朝向平台运动时才需要反射，避免已分离后重复增能
            // normalImpulseScale = 1 + BOUNCE：标准反射公式里施加在法线方向上的
            // 冲量系数，不是恢复系数本身（恢复系数就是 GameConfig.BOUNCE）
            const normalImpulseScale = 1 + GameConfig.BOUNCE;
            ball.vx -= normalImpulseScale * vDotN * nx;
            ball.vy -= normalImpulseScale * vDotN * ny;
        }

        return true;
    }
}
