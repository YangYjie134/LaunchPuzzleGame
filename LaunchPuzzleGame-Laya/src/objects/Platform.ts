/**
 * Platform.ts — 平台 / 障碍物数据模型。
 *
 * 职责边界（阶段 3 R4.1）：
 *  - 只保存数据 + 提供绘制接口 + 对外暴露矩形 bounds。
 *  - 不做碰撞解算、不算反弹、不算法线/penetration/vDotN、不判断小球状态。
 *    这些都是 PhysicsEngine 的职责（见 PhysicsEngine._resolvePlatformCollision），
 *    Platform 只负责"我是一个长这样的矩形"，碰撞怎么处理与 Platform 无关。
 */

export interface PlatformData {
    x: number;
    y: number;
    w: number;
    h: number;
    color?: string;
}

/**
 * 纯矩形包围盒，结构上与 PhysicsEngine.RectBounds（{x,y,w,h}）兼容，
 * 但本文件不导入 PhysicsEngine，避免 Platform 和物理引擎产生编译期耦合，
 * 靠 TypeScript 结构化类型即可让 PhysicsEngine 直接接收本接口的返回值。
 */
export interface PlatformBounds {
    x: number;
    y: number;
    w: number;
    h: number;
}

export class Platform {

    readonly data: PlatformData;

    constructor(data: PlatformData) {
        this.data = data;
    }

    /**
     * 将平台以世界坐标绘制到容器 Sprite。
     * 使用 container.graphics，坐标为 container 本地空间（与 stage 对齐）。
     */
    drawTo(container: Laya.Sprite): void {
        const { x, y, w, h, color } = this.data;
        container.graphics.drawRect(x, y, w, h, color ?? "#2244aa", "#4466cc", 1);
    }

    /**
     * 导出矩形 bounds 供 PhysicsEngine 做碰撞检测使用。
     * 返回独立的新对象（而非 this.data 的引用），调用方改动返回值不会影响
     * 这个 Platform 自身的数据。不包含 color，因为碰撞解算不需要颜色。
     */
    getBounds(): PlatformBounds {
        const { x, y, w, h } = this.data;
        return { x, y, w, h };
    }
}
