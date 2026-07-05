import { GameScene, IGameSceneCallbacks } from "./GameScene";
import { WinScene } from "./WinScene";
import { LevelLoader } from "../levels/LevelLoader";

/**
 * GameManager.ts
 * 全局状态机单例。管理关卡流程：启动关卡、切换下一关、重置当前关。
 * 由 Main.ts 的 onStart() 调用 GameManager.instance.init() 启动。
 *
 * R4.2：关卡总数改为以 LevelLoader.count 为唯一真源（不再依赖
 * GameConfig.TOTAL_LEVELS），通关界面改为接入真正的 WinScene。
 */
export class GameManager {

    // ─── 单例 ────────────────────────────────────────────────────
    private static _instance: GameManager;
    static get instance(): GameManager {
        if (!GameManager._instance) {
            GameManager._instance = new GameManager();
        }
        return GameManager._instance;
    }

    // ─── 状态 ────────────────────────────────────────────────────
    private _currentScene: GameScene | null = null;
    private _currentWinScene: WinScene | null = null;
    private _currentLevel: number = 0;

    get currentLevel(): number { return this._currentLevel; }

    // ─── 公共接口 ─────────────────────────────────────────────────
    /** 游戏初始化入口，由 Main.ts 调用一次 */
    init(): void {
        console.log(`[GameManager] init — 共 ${LevelLoader.count} 关`);
        this.startLevel(0);
    }

    /** 启动指定关卡 */
    startLevel(index: number): void {
        console.log(`[GameManager] startLevel(${index})`);

        // 关卡索引合法性校验：绝不让越界 index 在半清理状态下
        // 直接把 LevelLoader.get() 的 RangeError 炸出来。
        if (!LevelLoader.isValidIndex(index)) {
            console.error(
                `[GameManager] startLevel: invalid level index ${index} ` +
                `(valid: 0..${LevelLoader.count - 1})`
            );
            if (index !== 0 && LevelLoader.isValidIndex(0)) {
                console.error("[GameManager] startLevel: falling back to level 0.");
                this.startLevel(0);
            } else {
                console.error("[GameManager] startLevel: no valid level available, aborting.");
            }
            return;
        }

        // 销毁旧场景
        if (this._currentScene) {
            this._currentScene.destroy();
            this._currentScene = null;
        }

        // 销毁旧通关界面（避免两个胜利界面同时存在）
        if (this._currentWinScene) {
            this._currentWinScene.destroy();
            this._currentWinScene = null;
        }

        this._currentLevel = index;

        const callbacks: IGameSceneCallbacks = {
            onReset:    () => this.restartLevel(),
            onComplete: () => this.nextLevel(),
        };
        const scene = new GameScene(index, callbacks);
        this._currentScene = scene;
        Laya.stage.addChild(scene.container);
    }

    /** 进入下一关（关卡数量以 LevelLoader.count 为准） */
    nextLevel(): void {
        const next = this._currentLevel + 1;
        if (next >= LevelLoader.count) {
            this._showWin();
        } else {
            this.startLevel(next);
        }
    }

    /** 重置当前关卡 */
    restartLevel(): void {
        this.startLevel(this._currentLevel);
    }

    // ─── 内部 ─────────────────────────────────────────────────────
    /** 显示通关界面：接入真正的 WinScene，不再手写内联 UI */
    private _showWin(): void {
        console.log("[GameManager] You Win!");

        if (this._currentScene) {
            this._currentScene.destroy();
            this._currentScene = null;
        }

        // 已存在一个通关界面时不重复创建，避免两个胜利界面同时存在
        if (this._currentWinScene) {
            return;
        }

        const winScene = new WinScene(() => this._onWinRestart());
        this._currentWinScene = winScene;
        Laya.stage.addChild(winScene.container);
    }

    /**
     * WinScene 的 Restart 回调：切关逻辑完全由 GameManager 决定，
     * WinScene 本身不知道、也不负责切关。
     * 先判空再销毁+置 null，防止 Restart 被重复点击时二次触发
     * startLevel（第二次点击进来时 _currentWinScene 已经是 null）。
     */
    private _onWinRestart(): void {
        if (!this._currentWinScene) {
            return;
        }
        this._currentWinScene.destroy();
        this._currentWinScene = null;
        this.startLevel(0);
    }
}
