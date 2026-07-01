import { GameConfig } from "../game/GameConfig";

/**
 * Target.ts — 目标区域数据模型。
 *
 * 职责：
 *  1. 存储目标圆心坐标和半径。
 *  2. 提供 contains(bx, by) 判断小球是否进入目标区。
 *  3. 提供 drawTo(sp) 将自身绘制到已有 Sprite。
 */
export class Target {

    readonly x: number;
    readonly y: number;
    readonly radius: number;

    constructor(x: number, y: number, radius: number = GameConfig.TARGET_RADIUS) {
        this.x = x;
        this.y = y;
        this.radius = radius;
    }

    /**
     * 判断小球中心是否进入目标区。
     * 采用宽松判定（仅检测球心距离 < 目标半径），手感更友好。
     */
    contains(bx: number, by: number): boolean {
        const dx = bx - this.x;
        const dy = by - this.y;
        return Math.sqrt(dx * dx + dy * dy) < this.radius;
    }

    /**
     * 将目标绘制到 sp（sp 将被定位到 this.x, this.y）。
     * 绘制为两层同心圆：外圈轮廓 + 内圆心。
     */
    drawTo(sp: Laya.Sprite): void {
        sp.graphics.clear();
        // 外圈：半透明填充 + 实线边框
        sp.graphics.drawCircle(0, 0, this.radius, "#00cc6633", "#00ff88", 2);
        // 内圆心
        sp.graphics.drawCircle(0, 0, 8, "#00ff88");
        sp.pos(this.x, this.y);
    }
}
