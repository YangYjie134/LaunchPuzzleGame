import { LevelData, LevelPlatform, LevelTarget, Point2D } from "./LevelData";

/**
 * LevelLoader.ts — 关卡数据访问入口（阶段 3 R2）。
 *
 * 职责边界：
 *  - 只负责"根据 index 返回 LevelData"，不做关卡切换、不做游戏状态判断。
 *  - 关卡数量、关卡内容的唯一真源（GameManager 后续应改为引用
 *    LevelLoader.count，而不是另外维护一份关卡总数常量；本轮不接入，
 *    留给 R4）。
 *  - 不依赖 Laya.*，不依赖 GameScene/GameManager/PhysicsEngine/Platform。
 *
 * 关卡设计说明（画布 800×600，球半径 12，传送门默认半径 28）：
 *  - L1：零平台，发射点/目标与阶段 2 现有硬编码完全一致，作为回归基线。
 *  - L2：1 个平台（厚度 20px），目标挪到右上角，引导玩家利用平台做一次
 *    反弹改变弹道方向，而不是无脑直线发射。
 *  - L3：3 个平台（厚度均 20px）组合出一条多次反弹路线，目标藏在左上角，
 *    需要先后借助下方横板、中部竖直挡板改变弹道才能绕过去。
 *  - 所有平台厚度均 ≥20px，高于 PhysicsEngine 设计文档里建议的 16px 下限，
 *    进一步降低高速小球隧穿薄平台的风险。
 *  - 没有平台被设计成"可停留的二次发射点"——平台只用于改变弹道方向，
 *    阶段 2 的核心规则（固定发射点 + 底部失败线）完全没有变化。
 */

const LEVEL_1: LevelData = {
    name: "Level 1",
    launchPoint: { x: 120, y: 470 },
    target: { x: 650, y: 420, radius: 28 },
    platforms: [],
    hint: "Drag the energy orb to charge",
};

const LEVEL_2: LevelData = {
    name: "Level 2",
    launchPoint: { x: 120, y: 470 },
    target: { x: 680, y: 150, radius: 26 },
    platforms: [
        // 中部横板：挡在直线弹道上，引导玩家借助反弹把球送往右上角目标
        { x: 420, y: 300, w: 180, h: 20, color: "#2244aa" },
    ],
    hint: "Bank the orb off the platform",
};

const LEVEL_3: LevelData = {
    name: "Level 3",
    launchPoint: { x: 120, y: 470 },
    target: { x: 440, y: 320, radius: 24 },
    platforms: [
        { x: 180, y: 420, w: 260, h: 20, color: "#2244aa" },
        { x: 480, y: 250, w: 20, h: 180, color: "#2244aa" },
        { x: 150, y: 180, w: 220, h: 20, color: "#2244aa" },
    ],
    hint: "Chain multiple bounces to reach the portal",
};

export class LevelLoader {

    private static readonly LEVELS: LevelData[] = [LEVEL_1, LEVEL_2, LEVEL_3];

    /** 关卡总数（GameManager 后续应以此为准，而不是另外硬编码） */
    static get count(): number {
        return LevelLoader.LEVELS.length;
    }

    /** 判断 index 是否落在合法关卡范围内 */
    static isValidIndex(index: number): boolean {
        return Number.isInteger(index) && index >= 0 && index < LevelLoader.LEVELS.length;
    }

    /**
     * 按下标取关卡数据（返回浅拷贝出的独立副本，消费方改 platforms/target/
     * launchPoint 不会污染本文件内的原始关卡数据）。
     *
     * index 越界时显式抛出 RangeError，不再静默回退到第 0 关——越界通常
     * 意味着调用方（GameManager/GameScene）的关卡切换逻辑有 bug，静默兜底
     * 只会把这个 bug 藏起来。不确定 index 是否合法时，请先用 isValidIndex()
     * 判断，或改用 tryGet()。
     */
    static get(index: number): LevelData {
        if (!LevelLoader.isValidIndex(index)) {
            throw new RangeError(
                `[LevelLoader] level index out of range: ${index} (valid: 0..${LevelLoader.LEVELS.length - 1})`
            );
        }
        return LevelLoader._clone(LevelLoader.LEVELS[index]);
    }

    /** get() 的非抛异常版本：越界时返回 undefined，调用方自行判断 */
    static tryGet(index: number): LevelData | undefined {
        if (!LevelLoader.isValidIndex(index)) return undefined;
        return LevelLoader._clone(LevelLoader.LEVELS[index]);
    }

    /**
     * 浅拷贝一份关卡数据：launchPoint/target 各自是新对象，platforms 是
     * 新数组且数组内每个平台也是新对象，原始 LEVELS 常量永远不会被外部改动影响。
     */
    private static _clone(level: LevelData): LevelData {
        const launchPoint: Point2D = { x: level.launchPoint.x, y: level.launchPoint.y };
        const target: LevelTarget = {
            x: level.target.x,
            y: level.target.y,
            radius: level.target.radius,
        };
        const platforms: LevelPlatform[] = level.platforms.map((p) => ({
            x: p.x,
            y: p.y,
            w: p.w,
            h: p.h,
            color: p.color,
        }));

        return {
            name: level.name,
            launchPoint,
            target,
            platforms,
            hint: level.hint,
        };
    }
}
