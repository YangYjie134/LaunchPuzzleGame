import { GameConfig } from "./GameConfig";
import { Ball } from "../objects/Ball";
import { Target } from "../objects/Target";
import { Platform } from "../objects/Platform";
import { LevelData } from "../levels/LevelData";
import { LevelLoader } from "../levels/LevelLoader";

export interface IGameSceneCallbacks {
    onReset: () => void;
    onComplete: () => void;
}

/**
 * 能量球状态机
 *  ready       — 在发射点，允许拖拽蓄力
 *  dragging    — 玩家正在反向拖拽充能
 *  flying      — 已发射，飞行中
 *  respawning  — 碰地失败，等待 1 秒重生
 *  completed   — 进入传送门，等待过关处理
 */
type OrbState = 'ready' | 'dragging' | 'flying' | 'respawning' | 'completed';

/**
 * GameScene.ts — 单关卡场景（阶段 2 修复版 v3）
 *
 * 核心玩法：反向拖拽蓄力发射能量球，使其弹射进入传送门。
 *
 * 发射公式（反向充能）：
 *   pullX = ball.x - mouse.x
 *   pullY = ball.y - mouse.y
 *   vx = (pullX / pullDist) * speed
 *   vy = (pullY / pullDist) * speed
 *
 * 物理规则：
 *   左 / 右 / 上墙 → 弹射
 *   下地面         → 失败，1 秒后重生
 */
export class GameScene {

    readonly container: Laya.Sprite;

    // ── 显示层 ────────────────────────────────────────────────────
    private _aimLayer: Laya.Sprite;      // 瞄准可视化（每帧刷新）
    private _ballSprite: Laya.Sprite;    // 能量球（只移位，不重绘）
    private _hintText: Laya.Text;        // 状态提示

    // ── 游戏对象 ──────────────────────────────────────────────────
    private _ball: Ball;
    private _target: Target;

    // ── 状态 ──────────────────────────────────────────────────────
    private _levelIndex: number;
    private _level: LevelData;
    private _callbacks: IGameSceneCallbacks;
    private _state: OrbState = 'ready';
    private _dragX: number = 0;
    private _dragY: number = 0;

    // ── 常量 ──────────────────────────────────────────────────────
    /** 鼠标点击必须在此半径内才能开始拖拽 */
    private static readonly CLICK_RADIUS = 42;

    // ─────────────────────────────────────────────────────────────
    constructor(levelIndex: number, callbacks: IGameSceneCallbacks) {
        this._levelIndex = levelIndex;
        this._level      = LevelLoader.get(levelIndex);
        this._callbacks  = callbacks;
        this.container   = new Laya.Sprite();
        this._build();
    }

    // ── 构建场景 ──────────────────────────────────────────────────
    private _build(): void {

        // 背景
        const bg = new Laya.Sprite();
        bg.graphics.drawRect(0, 0, GameConfig.CANVAS_W, GameConfig.CANVAS_H, "#0f0f23");
        bg.size(GameConfig.CANVAS_W, GameConfig.CANVAS_H);
        this.container.addChild(bg);

        // 失败线（底部红色地面）
        const ground = new Laya.Sprite();
        ground.graphics.drawRect(
            0, GameConfig.CANVAS_H - 6,
            GameConfig.CANVAS_W, 6,
            "#cc2222"
        );
        this.container.addChild(ground);

        // 地面标签
        const groundLabel = new Laya.Text();
        groundLabel.text     = "— DANGER ZONE —";
        groundLabel.color    = "#cc4444";
        groundLabel.fontSize = 11;
        groundLabel.pos(GameConfig.CANVAS_W / 2 - 52, GameConfig.CANVAS_H - 20);
        this.container.addChild(groundLabel);

        // 平台（关卡数据驱动，仅绘制外观，不接入碰撞 —— R4.3 范围内）
        const platformsLayer = new Laya.Sprite();
        for (const platformData of this._level.platforms) {
            const platform = new Platform(platformData);
            platform.drawTo(platformsLayer);
        }
        this.container.addChild(platformsLayer);

        // 传送门（目标，位置/半径来自关卡数据）
        this._target = new Target(
            this._level.target.x,
            this._level.target.y,
            this._level.target.radius ?? GameConfig.TARGET_RADIUS
        );
        const targetSp = new Laya.Sprite();
        this._target.drawTo(targetSp);
        this.container.addChild(targetSp);

        // 瞄准层（位于目标之上、能量球之下）
        this._aimLayer = new Laya.Sprite();
        this.container.addChild(this._aimLayer);

        // 能量球（发射点来自关卡数据）
        this._ball = new Ball(
            this._level.launchPoint.x, this._level.launchPoint.y, GameConfig.BALL_RADIUS
        );
        this._ballSprite = new Laya.Sprite();
        this._drawOrbGraphics();
        this._ballSprite.pos(this._ball.x, this._ball.y); // 立即同步初始位置
        this.container.addChild(this._ballSprite);

        // UI
        this._buildUI();

        // 鼠标事件（注册在 stage 确保全屏响应）
        Laya.stage.on(Laya.Event.MOUSE_DOWN, this, this._onMouseDown);
        Laya.stage.on(Laya.Event.MOUSE_MOVE, this, this._onMouseMove);
        Laya.stage.on(Laya.Event.MOUSE_UP,   this, this._onMouseUp);

        // 主游戏循环
        Laya.timer.frameLoop(1, this, this._update);
    }

    /** 能量球外观（绘制一次，后续只移动 Sprite） */
    private _drawOrbGraphics(): void {
        const r = GameConfig.BALL_RADIUS;
        // 外光晕
        this._ballSprite.graphics.drawCircle(0, 0, r,       "#e94560", "#ff88aa", 2);
        // 内核高光
        this._ballSprite.graphics.drawCircle(0, 0, r * 0.4, "#ffccdd");
    }

    private _buildUI(): void {
        const levelLabel = new Laya.Text();
        levelLabel.text     = `Level ${this._levelIndex + 1}`;
        levelLabel.color    = "#ffffff";
        levelLabel.fontSize = 22;
        levelLabel.bold     = true;
        levelLabel.pos(20, 18);
        this.container.addChild(levelLabel);

        this._hintText = new Laya.Text();
        this._hintText.text     = this._level.hint ?? "Drag the energy orb to charge";
        this._hintText.color    = "#aaaacc";
        this._hintText.fontSize = 14;
        this._hintText.pos(20, 48);
        this.container.addChild(this._hintText);

        this._makeButton("Reset", GameConfig.CANVAS_W - 100, 16, () => {
            this._callbacks.onReset();
        });
    }

    private _makeButton(
        label: string, x: number, y: number, onClick: () => void
    ): void {
        const btn = new Laya.Sprite();
        btn.graphics.drawRect(0, 0, 84, 32, "#2a3a55", "#5566aa", 1);
        btn.size(84, 32);
        btn.mouseEnabled = true;
        btn.pos(x, y);

        const lbl = new Laya.Text();
        lbl.text     = label;
        lbl.color    = "#aaccee";
        lbl.fontSize = 15;
        lbl.bold     = true;
        lbl.width    = 84;
        lbl.align    = "center";
        lbl.pos(0, 7);
        btn.addChild(lbl);

        btn.on(Laya.Event.CLICK, onClick);
        this.container.addChild(btn);
    }

    // ── 鼠标事件 ──────────────────────────────────────────────────

    private _onMouseDown(): void {
        // 只有 ready 状态可以开始拖拽
        if (this._state !== 'ready') return;

        const mx = Laya.stage.mouseX;
        const my = Laya.stage.mouseY;
        const dx = mx - this._ball.x;
        const dy = my - this._ball.y;

        // 必须点在能量球附近
        if (Math.sqrt(dx * dx + dy * dy) > GameScene.CLICK_RADIUS) return;

        this._state = 'dragging';
        this._dragX = mx;
        this._dragY = my;
    }

    private _onMouseMove(): void {
        if (this._state !== 'dragging') return;
        this._dragX = Laya.stage.mouseX;
        this._dragY = Laya.stage.mouseY;
    }

    private _onMouseUp(): void {
        if (this._state !== 'dragging') return;
        this._launch();
    }

    // ── 发射（反向充能） ──────────────────────────────────────────
    /**
     * 拖拽方向 = 鼠标相对球的偏移
     * 发射方向 = 拖拽方向的反方向（球 → 鼠标的反向）
     *
     * pullX = ball.x - mouse.x   （已指向反方向）
     * pullY = ball.y - mouse.y
     * vx    = (pullX / pullDist) * speed
     * vy    = (pullY / pullDist) * speed
     */
    private _launch(): void {
        const pullX    = this._ball.x - this._dragX;
        const pullY    = this._ball.y - this._dragY;
        const pullDist = Math.sqrt(pullX * pullX + pullY * pullY);

        if (pullDist < 6) {
            this._state = 'ready'; // 拖拽太短，取消发射
            return;
        }

        const capped = Math.min(pullDist, GameConfig.MAX_DRAG);
        const speed  = (capped / GameConfig.MAX_DRAG) * GameConfig.LAUNCH_SPEED_MAX;

        this._ball.vx = (pullX / pullDist) * speed;
        this._ball.vy = (pullY / pullDist) * speed;
        this._state   = 'flying';
    }

    // ── 主循环（每帧） ────────────────────────────────────────────
    private _update(): void {
        const dt = Math.min(Laya.timer.delta / 1000, 0.05);

        // 瞄准可视化（仅 dragging 状态）
        this._aimLayer.graphics.clear();
        if (this._state === 'dragging') {
            this._drawAimVisualization();
        } else if (this._state === 'ready') {
            // ready 状态：在球周围画一个淡环，提示"可点击"
            this._aimLayer.graphics.drawCircle(
                this._ball.x, this._ball.y,
                GameScene.CLICK_RADIUS,
                "rgba(0,0,0,0)", "rgba(255,255,255,0.12)", 1
            );
        }

        // 物理（仅 flying 状态）
        if (this._state === 'flying') {
            this._stepPhysics(dt);
        }

        // 同步能量球 Sprite 位置（每帧强制更新）
        this._ballSprite.pos(this._ball.x, this._ball.y);

        // 进入传送门检测
        if (
            this._state === 'flying' &&
            this._target.contains(this._ball.x, this._ball.y)
        ) {
            this._onPortalReached();
            return;
        }

        // 提示文字
        this._updateHint();
    }

    // ── 蓄力可视化 ────────────────────────────────────────────────
    /**
     * 绘制两层辅助视觉：
     *  1. 拉伸线：从球心到鼠标方向（表示反向蓄力方向，红色）
     *  2. 轨迹点：按反向速度 + 重力模拟 0.65s，最多 10 个点（青色）
     */
    private _drawAimVisualization(): void {
        const bx = this._ball.x;
        const by = this._ball.y;

        // 反向拉伸向量
        const pullX    = bx - this._dragX;
        const pullY    = by - this._dragY;
        const pullDist = Math.sqrt(pullX * pullX + pullY * pullY);
        if (pullDist < 3) return;

        const capped = Math.min(pullDist, GameConfig.MAX_DRAG);
        const ratio  = capped / pullDist;

        // 1. 拉伸线（从球心朝鼠标方向，表示"充能拉伸"）
        const strX = bx - pullX * ratio; // 鼠标方向上的终点
        const strY = by - pullY * ratio;
        this._aimLayer.graphics.drawLine(
            bx, by, strX, strY,
            "rgba(255, 80, 80, 0.5)", 1.5
        );
        this._aimLayer.graphics.drawCircle(
            strX, strY, 4, "rgba(255, 80, 80, 0.55)"
        );

        // 2. 预测轨迹（反向速度 + 重力，最多 10 个点，0.65s）
        const speed = (capped / GameConfig.MAX_DRAG) * GameConfig.LAUNCH_SPEED_MAX;
        const vx    = (pullX / pullDist) * speed;
        const vy    = (pullY / pullDist) * speed;
        const g     = GameConfig.GRAVITY;

        const SIM_DT  = 0.05;  // 每步 50ms → 4 步 = 0.20s
        const MAX_DOT = 4;
        const W = GameConfig.CANVAS_W;
        const H = GameConfig.CANVAS_H;

        for (let i = 1; i <= MAX_DOT; i++) {
            const t  = i * SIM_DT;
            const tx = bx + vx * t;
            const ty = by + vy * t + 0.5 * g * t * t;

            // 飞出屏幕则停止
            if (tx < 0 || tx > W || ty > H) break;

            // 越远越淡越小
            const opacity = ((MAX_DOT - i + 1) / (MAX_DOT + 1)) * 0.85;
            const dotR    = Math.max(1.5, 3.5 - i * 0.25);
            this._aimLayer.graphics.drawCircle(
                tx, ty, dotR,
                `rgba(100, 220, 255, ${opacity.toFixed(2)})`
            );
        }

        // 更新力度提示
        const pct = Math.round((capped / GameConfig.MAX_DRAG) * 100);
        this._hintText.text  = `Release to launch  [${pct}%]`;
        this._hintText.color = "#ffffff";
    }

    // ── 物理步进 ──────────────────────────────────────────────────
    private _stepPhysics(dt: number): void {
        const b = this._ball;
        const r = b.radius;
        const W = GameConfig.CANVAS_W;
        const H = GameConfig.CANVAS_H;

        // 重力
        b.vy += GameConfig.GRAVITY * dt;

        // 位移
        b.x += b.vx * dt;
        b.y += b.vy * dt;

        // 左墙（弹射）
        if (b.x - r < 0) {
            b.x  = r;
            b.vx = Math.abs(b.vx) * GameConfig.BOUNCE;
        }
        // 右墙（弹射）
        if (b.x + r > W) {
            b.x  = W - r;
            b.vx = -Math.abs(b.vx) * GameConfig.BOUNCE;
        }
        // 天花板（弹射）
        if (b.y - r < 0) {
            b.y  = r;
            b.vy = Math.abs(b.vy) * GameConfig.BOUNCE;
        }
        // 底部地面 → 失败（不弹射）
        if (b.y + r >= H - 6) {
            this._onFail();
        }
    }

    // ── 失败 / 重生 ────────────────────────────────────────────────
    private _onFail(): void {
        this._state   = 'respawning';
        this._ball.vx = 0;
        this._ball.vy = 0;
        this._ballSprite.visible = false; // 隐藏能量球，等待重生

        // 1 秒后重生
        Laya.timer.once(1000, this, this._respawn);
    }

    private _respawn(): void {
        this._ball.reset();                                      // 重置到发射点
        this._ballSprite.pos(this._ball.x, this._ball.y);       // 立即同步位置
        this._ballSprite.visible = true;                         // 显示能量球
        this._state = 'ready';
    }

    // ── 进入传送门 ────────────────────────────────────────────────
    private _onPortalReached(): void {
        this._state   = 'completed';
        this._ball.vx = 0;
        this._ball.vy = 0;

        // 1 秒后通知 GameManager 切换下一关
        Laya.timer.once(1000, this, () => {
            this._callbacks.onComplete();
        });
    }

    // ── 提示文字状态机 ────────────────────────────────────────────
    private _updateHint(): void {
        // dragging 时由 _drawAimVisualization 直接写入提示，此处跳过
        if (this._state === 'dragging') return;

        switch (this._state) {
            case 'ready':
                this._hintText.text  = this._level.hint ?? "Drag the energy orb to charge";
                this._hintText.color = "#aaaacc";
                break;
            case 'flying':
                this._hintText.text  = "Orb flying...";
                this._hintText.color = "#88aacc";
                break;
            case 'respawning':
                this._hintText.text  = "Failed! Respawning...";
                this._hintText.color = "#ff6644";
                break;
            case 'completed':
                this._hintText.text  = "Portal reached!";
                this._hintText.color = "#ffd700";
                break;
        }
    }

    // ── 销毁 ──────────────────────────────────────────────────────
    destroy(): void {
        Laya.timer.clearAll(this);
        Laya.stage.off(Laya.Event.MOUSE_DOWN, this, this._onMouseDown);
        Laya.stage.off(Laya.Event.MOUSE_MOVE, this, this._onMouseMove);
        Laya.stage.off(Laya.Event.MOUSE_UP,   this, this._onMouseUp);
        this.container.removeSelf();
    }
}
