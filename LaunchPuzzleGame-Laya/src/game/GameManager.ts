import { AudioManager } from "../audio/AudioManager";
import { LevelLoader } from "../levels/LevelLoader";
import { HomeUI } from "../ui/HomeUI";
import { GameScene, IGameSceneCallbacks } from "./GameScene";
import { IWinSceneCallbacks, WinScene } from "./WinScene";

/** Authoritative outer product flow: Cover -> Menu -> Game -> Win. */
export class GameManager {

    private static _instance: GameManager;
    static get instance(): GameManager {
        if (!GameManager._instance) {
            GameManager._instance = new GameManager();
        }
        return GameManager._instance;
    }

    private _homeUI: HomeUI | null = null;
    private _currentScene: GameScene | null = null;
    private _currentWinScene: WinScene | null = null;
    private _currentLevel: number = 0;

    get currentLevel(): number { return this._currentLevel; }

    /** Application entry point. Gameplay no longer auto-starts. */
    init(): void {
        console.log(`[GameManager] init — ${LevelLoader.count} levels`);
        this.showCover();
    }

    showCover(): void {
        this._destroyAllPresentation();
        const home = new HomeUI({
            onCoverAccepted: () => this._acceptCover(),
            onPlay: () => this.startNewGame(),
        });
        this._homeUI = home;
        Laya.stage.addChild(home.container);
        AudioManager.playBgmOnce();
    }

    showMainMenu(): void {
        this._destroyAllPresentation();
        const home = new HomeUI({
            onCoverAccepted: () => this._acceptCover(),
            onPlay: () => this.startNewGame(),
        });
        this._homeUI = home;
        home.showMainMenu();
        Laya.stage.addChild(home.container);
    }

    /** Menu PLAY and Win PLAY AGAIN converge on the same fresh Level 1 state. */
    startNewGame(): void {
        this.startLevel(0);
    }

    /** Start one validated level after removing every previous product surface. */
    startLevel(index: number): void {
        console.log(`[GameManager] startLevel(${index})`);

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

        this._destroyAllPresentation();
        this._currentLevel = index;

        const callbacks: IGameSceneCallbacks = {
            onReset: () => this.restartCurrentLevel(),
            onComplete: () => this.nextLevel(),
            onMainMenu: () => this.returnToMainMenu(),
        };
        const scene = new GameScene(index, callbacks);
        this._currentScene = scene;
        Laya.stage.addChild(scene.container);
    }

    nextLevel(): void {
        const next = this._currentLevel + 1;
        if (next >= LevelLoader.count) {
            this._showWin();
        } else {
            this.startLevel(next);
        }
    }

    restartCurrentLevel(): void {
        this.startLevel(this._currentLevel);
    }

    returnToMainMenu(): void {
        this.showMainMenu();
    }

    private _acceptCover(): void {
        if (!this._homeUI) {
            return;
        }
        AudioManager.restartBgm();
        this._homeUI.showMainMenu();
    }

    private _showWin(): void {
        console.log("[GameManager] All levels cleared");

        this._destroyCurrentScene();
        this._destroyHomeUI();
        if (this._currentWinScene) {
            return;
        }

        const callbacks: IWinSceneCallbacks = {
            onPlayAgain: () => this._onWinPlayAgain(),
            onMainMenu: () => this.returnToMainMenu(),
        };
        const winScene = new WinScene(callbacks);
        this._currentWinScene = winScene;
        Laya.stage.addChild(winScene.container);
    }

    private _onWinPlayAgain(): void {
        if (!this._currentWinScene) {
            return;
        }
        this._destroyWinScene();
        this.startNewGame();
    }

    private _destroyAllPresentation(): void {
        this._destroyHomeUI();
        this._destroyCurrentScene();
        this._destroyWinScene();
    }

    private _destroyHomeUI(): void {
        if (!this._homeUI) {
            return;
        }
        this._homeUI.destroy();
        this._homeUI = null;
    }

    private _destroyCurrentScene(): void {
        if (!this._currentScene) {
            return;
        }
        this._currentScene.destroy();
        this._currentScene = null;
    }

    private _destroyWinScene(): void {
        if (!this._currentWinScene) {
            return;
        }
        this._currentWinScene.destroy();
        this._currentWinScene = null;
    }
}
