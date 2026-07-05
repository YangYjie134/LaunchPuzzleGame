/**
 * LevelData.ts — 关卡数据接口定义（阶段 3 R2）。
 *
 * 只放纯数据类型，不放任何运行逻辑：
 *  - 不依赖 Laya.*，不依赖 GameScene/GameManager/PhysicsEngine。
 *  - 不包含绘制方法、碰撞方法，纯描述"一关长什么样"。
 *  - 平台沿用 PhysicsEngine.RectBounds 同形状的 {x,y,w,h}，但本文件
 *    不导入 PhysicsEngine/Platform，避免数据层与运行时层耦合；
 *    后续（R4）由 GameScene 读取这份数据后自行构造 Platform/Ball 等运行时对象。
 */

/** 平面坐标点 */
export interface Point2D {
    x: number;
    y: number;
}

/** 关卡内的一块平台（纯矩形数据 + 可选颜色，不含碰撞/绘制逻辑） */
export interface LevelPlatform {
    x: number;
    y: number;
    w: number;
    h: number;
    /** 可选自定义颜色，缺省由消费方（GameScene/Platform）决定默认色 */
    color?: string;
}

/** 关卡目标传送门 */
export interface LevelTarget {
    x: number;
    y: number;
    /** 可选半径，缺省由消费方决定默认值（沿用 GameConfig.TARGET_RADIUS） */
    radius?: number;
}

/** 单关完整数据 */
export interface LevelData {
    /** 关卡显示名称，用于 UI（例如替代当前 GameScene 里写死的 "Level N"） */
    name: string;
    /** 固定发射点（阶段 2 规则：只有在这个点的 ready 状态才允许拖拽发射） */
    launchPoint: Point2D;
    /** 目标传送门 */
    target: LevelTarget;
    /** 平台数组，可以为空数组（例如 L1 零平台基线关） */
    platforms: LevelPlatform[];
    /** 可选关卡提示文案，缺省由消费方决定默认提示语 */
    hint?: string;
}
