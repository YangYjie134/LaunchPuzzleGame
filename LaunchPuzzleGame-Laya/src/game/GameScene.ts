import { GameConfig } from "./GameConfig";
import { Ball } from "../objects/Ball";
import { Target } from "../objects/Target";
import { Platform } from "../objects/Platform";
import { LevelData } from "../levels/LevelData";
import { LevelLoader } from "../levels/LevelLoader";
import { PhysicsEngine, RectBounds } from "../physics/PhysicsEngine";
import { AudioManager } from "../audio/AudioManager";
import { PauseUI } from "../ui/PauseUI";

export interface IGameSceneCallbacks {
    onReset: () => void;
    onComplete: () => void;
    onMainMenu: () => void;
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
    private _paused: boolean = false;
    private _pauseUI: PauseUI | null = null;
    private _pauseButton: Laya.Sprite;

    // ── 物理（R4.4：接入 PhysicsEngine） ──────────────────────────
    /** 固定步长累加器，由 _stepPhysics() 累加/消耗，PhysicsEngine 自身不持有此状态 */
    private _physicsAccumulator: number = 0;
    /** 平台碰撞包围盒缓存，_build() 时一次性收集，供 PhysicsEngine.step() 使用 */
    private _platformBounds: RectBounds[] = [];

    // ── 常量 ──────────────────────────────────────────────────────
    /** 鼠标点击必须在此半径内才能开始拖拽 */
    private static readonly CLICK_RADIUS = 42;
    /** Mobile keeps the visual BALL_RADIUS unchanged while easing touch acquisition. */
    private static readonly MOBILE_CLICK_RADIUS = 64;
    /** Mobile edge compensation uses Stage-space units, matching stage.mouseX/Y and game geometry. */
    private static readonly MOBILE_EDGE_MARGIN = 24;
    private static readonly MIN_MOBILE_FULL_POWER_RATIO = 0.70;
    private static readonly PAUSE_HIT_X = 652;
    private static readonly PAUSE_HIT_Y = 14;
    private static readonly PAUSE_HIT_W = 128;
    private static readonly PAUSE_HIT_H = 60;

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

        // 背景 —— 阳光清晨风格（副游戏视觉区分：主游戏 BallGame = 星空夜晚）
        const bg = new Laya.Sprite();
        const W = GameConfig.CANVAS_W;
        const H = GameConfig.CANVAS_H;

        // 1) 浅蓝天空底色（再压暗一档，提升左上角文字对比度、降低整体亮度）
        bg.graphics.drawRect(0, 0, W, H, "#acd6eb");

        // 2) 太阳（右上角，柔和暖黄，光晕由外到内叠加；位置移至 Reset 按钮左侧，避免被按钮遮挡）
        const sunX = W - 160;
        const sunY = 72;
        bg.graphics.drawCircle(sunX, sunY, 52, "rgba(255, 245, 200, 0.07)");
        bg.graphics.drawCircle(sunX, sunY, 36, "rgba(255, 235, 160, 0.15)");
        bg.graphics.drawCircle(sunX, sunY, 21, "#fff3b0", "#ffe27a", 2);

        // 3) 阳光射线（透明度进一步降低，避免抢视觉）
        const rayCount = 8;
        const rayLen   = 130;
        for (let i = 0; i < rayCount; i++) {
            const angle = (Math.PI * 2 / rayCount) * i;
            const x2 = sunX + Math.cos(angle) * rayLen;
            const y2 = sunY + Math.sin(angle) * rayLen;
            bg.graphics.drawLine(sunX, sunY, x2, y2, "rgba(255, 244, 190, 0.05)", 6);
        }

        // 4) 白云（2~3 朵，靠近顶部，避开左上 Level 文本与右上 Reset 按钮区域）
        const drawCloud = (cx: number, cy: number, scale: number) => {
            const a = "rgba(255, 255, 255, 0.85)";
            bg.graphics.drawCircle(cx,            cy,            18 * scale, a);
            bg.graphics.drawCircle(cx + 20 * scale, cy + 4 * scale, 14 * scale, a);
            bg.graphics.drawCircle(cx - 20 * scale, cy + 4 * scale, 14 * scale, a);
            bg.graphics.drawCircle(cx,            cy - 8 * scale, 14 * scale, a);
        };
        drawCloud(150, 110, 1.0);
        drawCloud(330, 150, 0.8);
        drawCloud(470, 90, 0.65);

        // 5) 底部淡绿远山 / 地平线（留在红色失败线之上，不遮挡失败线 H-6）
        const failLineY = H - 6;
        const horizonY   = failLineY - 20; // 与失败线保持安全间距
        // 淡绿地平线色块（从 horizonY 填到失败线上方为止，不覆盖失败线）
        bg.graphics.drawRect(0, horizonY, W, failLineY - horizonY, "#dff5e1");
        // 远山剪影（更淡的绿色，起伏由几段折线拼接模拟，底边贴合地平线色块，不越过失败线）
        bg.graphics.drawPoly(0, 0, [
            0, horizonY,
            90, horizonY - 22,
            190, horizonY,
            300, horizonY - 30,
            420, horizonY,
            540, horizonY - 20,
            660, horizonY,
            760, horizonY - 26,
            W, horizonY,
            W, failLineY,
            0, failLineY,
        ], "rgba(178, 224, 186, 0.55)");

        bg.size(W, H);
        this.container.addChild(bg);

        // 失败线（底部红色地面）
        const ground = new Laya.Sprite();
        const dangerEdgeY = GameConfig.CANVAS_H - 6;
        const thornColors = ["#c94f49", "#d95f54", "#bf4643"];
        for (let x = 0, cluster = 0; x < GameConfig.CANVAS_W; x += 24, cluster++) {
            const highTip = cluster % 3 === 0 ? 13 : cluster % 3 === 1 ? 10 : 8;
            ground.graphics.drawPoly(0, 0, [
                x, dangerEdgeY,
                x + 4, dangerEdgeY - 6,
                x + 8, dangerEdgeY - 3,
                x + 12, dangerEdgeY - highTip,
                x + 16, dangerEdgeY - 4,
                x + 21, dangerEdgeY - 8,
                x + 24, dangerEdgeY,
            ], thornColors[cluster % thornColors.length]);
        }
        ground.graphics.drawRect(
            0, GameConfig.CANVAS_H - 6,
            GameConfig.CANVAS_W, 6,
            "#cc2222"
        );
        this.container.addChild(ground);

        // 平台装饰层只读取现有矩形数据，不参与碰撞或改变平台 bounds。
        const platformDecorLayer = new Laya.Sprite();
        for (const platformData of this._level.platforms) {
            this._drawPlatformPresentation(
                platformDecorLayer,
                platformData.x,
                platformData.y,
                platformData.w,
                platformData.h
            );
        }
        this.container.addChild(platformDecorLayer);

        // 平台（关卡数据驱动；R4.4 起同时收集 bounds 供 PhysicsEngine 碰撞检测）
        const platformsLayer = new Laya.Sprite();
        for (const platformData of this._level.platforms) {
            const platform = new Platform(platformData);
            platform.drawTo(platformsLayer);
            this._platformBounds.push(platform.getBounds());
        }
        this.container.addChild(platformsLayer);

        // 传送门（目标，位置/半径来自关卡数据）
        this._target = new Target(
            this._level.target.x,
            this._level.target.y,
            this._level.target.radius ?? GameConfig.TARGET_RADIUS
        );
        const targetDecor = new Laya.Sprite();
        const targetR = this._target.radius;
        targetDecor.graphics.drawCircle(0, 4, targetR + 13, "rgba(53,76,96,0.10)");
        targetDecor.graphics.drawCircle(0, 0, targetR + 18, "rgba(93,218,164,0.08)");
        targetDecor.graphics.drawCircle(
            0, 0, targetR + 10,
            "rgba(0,0,0,0)", "rgba(59,155,122,0.26)", 4
        );
        targetDecor.pos(this._target.x, this._target.y);
        this.container.addChild(targetDecor);

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

        // 键盘事件：R 键触发重置（替代原右上角 Reset 按钮，复用同一 onReset 回调）
        Laya.stage.on(Laya.Event.KEY_DOWN, this, this._onKeyDown);

        // 主游戏循环
        Laya.timer.frameLoop(1, this, this._update);
    }

    /** R restarts the level; P toggles Pause/Resume only where valid. */
    private _onKeyDown(e: Laya.Event): void {
        if (e.keyCode === Laya.Keyboard.P) {
            if (this._paused) {
                this._resumeFromPause();
            } else {
                this._enterPause();
            }
            return;
        }
        if (e.keyCode === Laya.Keyboard.R) {
            if (this._paused) {
                return;
            }
            this._callbacks.onReset();
        }
    }

    /** 能量球外观（绘制一次，后续只移动 Sprite） */
    private _drawOrbGraphics(): void {
        const r = GameConfig.BALL_RADIUS;
        // Decorative halo and shadow expand only the presentation, never BALL_RADIUS.
        this._ballSprite.graphics.drawCircle(0, 5, r + 5, "rgba(53,76,96,0.16)");
        this._ballSprite.graphics.drawCircle(
            0, 0, r + 9,
            "rgba(233,69,96,0.10)", "rgba(255,255,255,0.56)", 2
        );
        this._ballSprite.graphics.drawCircle(0, 0, r, "#e94560", "#fff0f4", 3);
        this._ballSprite.graphics.drawCircle(-r * 0.28, -r * 0.32, r * 0.34, "#ffd5df");
    }

    private _drawPlatformPresentation(
        layer: Laya.Sprite,
        x: number,
        y: number,
        width: number,
        height: number
    ): void {
        const corner = Math.min(7, Math.max(4, Math.min(width, height) * 0.24));
        layer.graphics.drawRoundRect(
            x + 4, y + 6, width, height,
            corner, corner, corner, corner,
            "rgba(53,76,96,0.18)"
        );
        layer.graphics.drawRoundRect(
            x - 3, y - 3, width + 6, height + 6,
            corner + 2, corner + 2, corner + 2, corner + 2,
            "rgba(255,255,255,0.22)", "rgba(255,255,255,0.58)", 2
        );
        layer.graphics.drawLine(
            x + Math.min(9, width * 0.18),
            y - 1,
            x + width - Math.min(9, width * 0.18),
            y - 1,
            "rgba(255,255,255,0.72)",
            2
        );
    }

    private _buildUI(): void {
        const hud = new Laya.Sprite();
        hud.graphics.drawRoundRect(
            0, 5, 260, 68,
            18, 18, 18, 18,
            "rgba(53,76,96,0.16)"
        );
        hud.graphics.drawRoundRect(
            0, 0, 260, 68,
            18, 18, 18, 18,
            "rgba(255,250,239,0.96)", "rgba(255,255,255,0.92)", 2
        );

        // Cover-style energy-orb emblem and small portal cue keep the HUD in-family.
        hud.graphics.drawCircle(28, 25, 15, "rgba(233,107,90,0.12)");
        hud.graphics.drawCircle(28, 25, 11, "rgba(0,0,0,0)", "rgba(233,107,90,0.42)", 2);
        hud.graphics.drawCircle(28, 25, 7, "#e96b5a", "#fff0ea", 2);
        hud.graphics.drawCircle(26, 23, 2.5, "#ffd8cf");
        hud.graphics.drawCircle(232, 22, 8, "rgba(102,201,161,0.10)", "#66c9a1", 2);
        hud.graphics.drawCircle(232, 22, 3, "#66c9a1");

        hud.graphics.drawRoundRect(
            50, 38, 192, 22,
            8, 8, 8, 8,
            "rgba(47,100,113,0.92)"
        );
        hud.graphics.drawCircle(52, 22, 2.5, "#f4b65f");
        hud.graphics.drawCircle(59, 19, 2, "#f4b65f");
        hud.graphics.drawCircle(66, 18, 1.5, "#66c9a1");
        hud.size(260, 73);
        hud.pos(14, 10);
        this.container.addChild(hud);

        const levelLabel = new Laya.Text();
        levelLabel.text     = `Level ${this._levelIndex + 1}`;
        levelLabel.color    = "#2a3a55";
        levelLabel.fontSize = 19;
        levelLabel.bold     = true;
        levelLabel.width    = 171;
        levelLabel.pos(71, 17);
        this.container.addChild(levelLabel);

        this._hintText = new Laya.Text();
        this._hintText.text     = this._level.hint ?? "Drag the energy orb to charge";
        this._hintText.color    = "#fff8e8";
        this._hintText.fontSize = 13;
        this._hintText.width    = 171;
        this._hintText.height   = 18;
        this._hintText.overflow = "shrink";
        this._hintText.pos(71, 50);
        this.container.addChild(this._hintText);

        this._buildPauseButton();
    }

    private _buildPauseButton(): void {
        const hit = new Laya.Sprite();
        hit.graphics.drawRect(
            0, 0,
            GameScene.PAUSE_HIT_W, GameScene.PAUSE_HIT_H,
            "rgba(0,0,0,0)"
        );
        hit.size(GameScene.PAUSE_HIT_W, GameScene.PAUSE_HIT_H);
        hit.pos(GameScene.PAUSE_HIT_X, GameScene.PAUSE_HIT_Y);
        hit.mouseEnabled = true;

        const shadow = new Laya.Sprite();
        shadow.graphics.drawRoundRect(
            0, 0, 54, 48,
            17, 17, 17, 17,
            "rgba(53,76,96,0.18)"
        );
        shadow.pos(38, 10);
        shadow.size(54, 48);
        hit.addChild(shadow);

        const face = new Laya.Sprite();
        face.pos(37, 6);
        face.size(54, 48);
        hit.addChild(face);

        const label = new Laya.Text();
        label.text = "Ⅱ";
        label.color = "#294d55";
        label.fontSize = 23;
        label.bold = true;
        label.width = 54;
        label.height = 48;
        label.align = "center";
        label.valign = "middle";
        face.addChild(label);

        const paint = (fill: string): void => {
            face.graphics.clear();
            face.graphics.drawRoundRect(
                0, 0, 54, 48,
                17, 17, 17, 17,
                fill, "rgba(255,255,255,0.56)", 2
            );
            face.graphics.drawLine(12, 6, 42, 6, "rgba(255,255,255,0.32)", 1);
        };
        paint("rgba(199,234,219,0.48)");

        hit.on(Laya.Event.MOUSE_OVER, this, () => paint("rgba(218,242,231,0.62)"));
        hit.on(Laya.Event.MOUSE_OUT, this, () => paint("rgba(199,234,219,0.48)"));
        hit.on(Laya.Event.MOUSE_DOWN, this, (event: Laya.Event) => {
            event.stopPropagation();
            paint("rgba(169,216,197,0.72)");
        });
        hit.on(Laya.Event.MOUSE_UP, this, (event: Laya.Event) => {
            event.stopPropagation();
            paint("rgba(218,242,231,0.62)");
        });
        hit.on(Laya.Event.CLICK, this, this._onPauseButtonClick);

        this._pauseButton = hit;
        this.container.addChild(hit);
        this._syncPauseButtonVisibility();
    }

    private _onPauseButtonClick(event: Laya.Event): void {
        event.stopPropagation();
        this._enterPause();
    }

    private _isInsidePauseHitRegion(x: number, y: number): boolean {
        return x >= GameScene.PAUSE_HIT_X &&
            x <= GameScene.PAUSE_HIT_X + GameScene.PAUSE_HIT_W &&
            y >= GameScene.PAUSE_HIT_Y &&
            y <= GameScene.PAUSE_HIT_Y + GameScene.PAUSE_HIT_H;
    }

    private _isPausableState(): boolean {
        return this._state === 'ready' || this._state === 'dragging' || this._state === 'flying';
    }

    private _enterPause(): void {
        if (this._paused || !this._isPausableState()) {
            return;
        }

        if (this._state === 'dragging') {
            this._state = 'ready';
            this._aimLayer.graphics.clear();
        }

        this._paused = true;
        this._syncPauseButtonVisibility();
        const pauseUI = new PauseUI({
            onResume: () => this._resumeFromPause(),
            onRestart: () => this._callbacks.onReset(),
            onMainMenu: () => this._callbacks.onMainMenu(),
            onToggleMute: () => AudioManager.toggleMute(),
            isMuted: () => AudioManager.isMuted(),
        });
        this._pauseUI = pauseUI;
        this.container.addChild(pauseUI.container);
    }

    private _resumeFromPause(): void {
        if (!this._paused) {
            return;
        }
        this._paused = false;
        this._destroyPauseUI();
        this._syncPauseButtonVisibility();
    }

    private _destroyPauseUI(): void {
        if (!this._pauseUI) {
            return;
        }
        this._pauseUI.destroy();
        this._pauseUI = null;
    }

    private _syncPauseButtonVisibility(): void {
        if (!this._pauseButton) {
            return;
        }
        this._pauseButton.visible = !this._paused && this._isPausableState();
    }

    // ── 鼠标事件 ──────────────────────────────────────────────────

    private _onMouseDown(): void {
        if (this._paused) return;

        const mx = Laya.stage.mouseX;
        const my = Laya.stage.mouseY;

        // Defensive stage-level isolation in addition to button propagation stop.
        if (this._isInsidePauseHitRegion(mx, my)) return;

        // 只有 ready 状态可以开始拖拽
        if (this._state !== 'ready') return;

        const dx = mx - this._ball.x;
        const dy = my - this._ball.y;

        // 必须点在能量球附近
        const acquisitionRadius = Laya.Browser.onMobile
            ? GameScene.MOBILE_CLICK_RADIUS
            : GameScene.CLICK_RADIUS;
        if (Math.sqrt(dx * dx + dy * dy) > acquisitionRadius) return;

        // 首次真实玩家交互（拖拽蓄力开始）：启动 BGM。playBgmOnce() 内部有
        // _bgmStarted 标记短路，切关/Restart 后再次触发本函数不会重复播放。
        AudioManager.playBgmOnce();

        this._state = 'dragging';
        this._dragX = mx;
        this._dragY = my;
    }

    private _onMouseMove(): void {
        if (this._paused) return;
        if (this._state !== 'dragging') return;
        this._dragX = Laya.stage.mouseX;
        this._dragY = Laya.stage.mouseY;
    }

    private _onMouseUp(): void {
        if (this._paused) return;
        if (this._state !== 'dragging') return;
        this._launch();

        // 有效发射后播放 launch SFX（短拖拽取消时 state 仍为 ready，不播放）
        if ((this._state as OrbState) === 'flying') {
            AudioManager.playLaunchSfx();
        }
    }

    // ── 发射（反向充能） ──────────────────────────────────────────
    private _getMobileUsableEdgeDistance(pullX: number, pullY: number, pullDist: number): number {
        // pull points toward launch; the finger moves in the opposite drag direction.
        const dragDirX = -pullX / pullDist;
        const dragDirY = -pullY / pullDist;
        const minX = GameScene.MOBILE_EDGE_MARGIN;
        const maxX = GameConfig.CANVAS_W - GameScene.MOBILE_EDGE_MARGIN;
        const minY = GameScene.MOBILE_EDGE_MARGIN;
        const maxY = GameConfig.CANVAS_H - GameScene.MOBILE_EDGE_MARGIN;
        let edgeDistance = Number.POSITIVE_INFINITY;

        if (dragDirX > 0) {
            edgeDistance = Math.min(edgeDistance, (maxX - this._ball.x) / dragDirX);
        } else if (dragDirX < 0) {
            edgeDistance = Math.min(edgeDistance, (minX - this._ball.x) / dragDirX);
        }
        if (dragDirY > 0) {
            edgeDistance = Math.min(edgeDistance, (maxY - this._ball.y) / dragDirY);
        } else if (dragDirY < 0) {
            edgeDistance = Math.min(edgeDistance, (minY - this._ball.y) / dragDirY);
        }

        return Math.max(0, edgeDistance);
    }

    private _getEffectiveLaunchPower(
        pullX: number,
        pullY: number,
        pullDist: number,
        cappedDragDistance: number
    ): number {
        const desktopPower = cappedDragDistance / GameConfig.MAX_DRAG;
        if (!Laya.Browser.onMobile) {
            return desktopPower;
        }

        const usableEdgeDistance = this._getMobileUsableEdgeDistance(pullX, pullY, pullDist);
        const minimumFullPowerDistance = GameConfig.MAX_DRAG * GameScene.MIN_MOBILE_FULL_POWER_RATIO;
        const effectiveFullPowerDistance = Math.min(
            GameConfig.MAX_DRAG,
            Math.max(minimumFullPowerDistance, usableEdgeDistance)
        );
        return Math.max(0, Math.min(pullDist / effectiveFullPowerDistance, 1));
    }

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
        const powerRatio = this._getEffectiveLaunchPower(pullX, pullY, pullDist, capped);
        const speed  = powerRatio * GameConfig.LAUNCH_SPEED_MAX;

        this._ball.vx = (pullX / pullDist) * speed;
        this._ball.vy = (pullY / pullDist) * speed;
        this._state   = 'flying';
    }

    // ── 主循环（每帧） ────────────────────────────────────────────
    private _update(): void {
        if (this._paused) return;

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
            AudioManager.playPortalSfx();
            this._syncPauseButtonVisibility();
            return;
        }

        // 提示文字
        this._updateHint();
        this._syncPauseButtonVisibility();
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
        const powerRatio = this._getEffectiveLaunchPower(pullX, pullY, pullDist, capped);

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
        const speed = powerRatio * GameConfig.LAUNCH_SPEED_MAX;
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

            // 越远越淡越小（不透明度/半径的计算逻辑不变，仅调整颜色与描边以提升在浅色天空背景下的对比度）
            const opacity = ((MAX_DOT - i + 1) / (MAX_DOT + 1)) * 0.85;
            const dotR    = Math.max(2, 4.5 - i * 0.25);
            this._aimLayer.graphics.drawCircle(
                tx, ty, dotR,
                `rgba(255, 209, 102, ${opacity.toFixed(2)})`,
                `rgba(42, 58, 85, ${opacity.toFixed(2)})`,
                1.5
            );
        }

        // 更新力度提示
        const pct = Math.round(powerRatio * 100);
        this._hintText.text  = `Release to launch  [${pct}%]`;
        this._hintText.color = "#ffffff";
    }

    // ── 物理步进（R4.4：接入 PhysicsEngine，固定步长 accumulator） ──
    /**
     * 不再手写重力积分/位移积分/墙体反弹/触底判断——全部交给 PhysicsEngine.step()。
     * 本函数只负责：
     *  1. 把当前帧的可变 dt 累加进 _physicsAccumulator；
     *  2. 按 PhysicsEngine.FIXED_DT 定步长消耗 accumulator，每消耗一步就调用
     *     一次 PhysicsEngine.step()（同一帧可能因此多次调用，避免大 dt 隧穿，
     *     accumulator 本身由本函数持有/维护，PhysicsEngine 不持有跨帧状态）；
     *  3. 显式传入 context.bounds.groundY = GameConfig.CANVAS_H - 6，对齐阶段 2
     *     原有的地面判定线（不能用 PhysicsEngine 默认的 groundY=height，否则
     *     失败线会悄悄下移 6px，出现手感回归）；
     *  4. 命中 shouldStopByPhysics 或 hitBottom 时调用 _onFail()（阶段 2 状态和
     *     计时逻辑保持不变，仅增加失败音效）并立即 break——避免同一帧对已失败的球继续步进，
     *     也避免 _onFail() 在同一帧被重复调用导致重复注册重生计时器。
     * 目标传送门检测不在这里处理，reachedTarget 信号本轮不消费，仍由
     * _update() 里现有的 this._target.contains(...) 负责（阶段 2 行为不变）。
     * isLowSpeed / isTimedOut 本轮同样不消费，不接入低速/超时失败。
     */
    private _stepPhysics(frameDt: number): void {
        this._physicsAccumulator += frameDt;

        while (this._physicsAccumulator >= PhysicsEngine.FIXED_DT) {
            const result = PhysicsEngine.step(
                this._ball,
                this._platformBounds,
                PhysicsEngine.FIXED_DT,
                {
                    bounds: {
                        width:   GameConfig.CANVAS_W,
                        height:  GameConfig.CANVAS_H,
                        groundY: GameConfig.CANVAS_H - 6,
                    },
                }
            );
            this._physicsAccumulator -= PhysicsEngine.FIXED_DT;

            if (result.shouldStopByPhysics || result.hitBottom) {
                this._onFail();
                AudioManager.playFailSfx();
                this._physicsAccumulator = 0; // 丢弃剩余零头，避免失败后继续步进
                break;
            }

            // 只消费 PhysicsEngine 已上报的墙体/平台信号，不修改碰撞解算；
            // AudioManager 内部冷却避免固定步长连续触发造成音效刷屏。
            if (result.hitWall || result.hitPlatform) {
                AudioManager.playCollisionSfx();
            }
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
        this._destroyPauseUI();
        this._pauseButton.offAllCaller(this);
        Laya.stage.off(Laya.Event.MOUSE_DOWN, this, this._onMouseDown);
        Laya.stage.off(Laya.Event.MOUSE_MOVE, this, this._onMouseMove);
        Laya.stage.off(Laya.Event.MOUSE_UP,   this, this._onMouseUp);
        Laya.stage.off(Laya.Event.KEY_DOWN,   this, this._onKeyDown);
        this.container.removeSelf();
    }
}
