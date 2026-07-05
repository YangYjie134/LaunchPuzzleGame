import { GameConfig } from "./GameConfig";

/**
 * WinScene.ts — 通关界面（阶段 3 R3，从 GameManager._showWin() 抽出）。
 *
 * 职责边界：
 *  - 只负责渲染"You Win!"画面 + 一个 Restart 按钮，纯展示层。
 *  - 不导入、不引用 GameManager，不直接切关，不写任何状态机逻辑。
 *  - 构造时接收 onRestart 回调；用户点击 Restart 按钮时只调用这个回调，
 *    具体"点了之后要做什么"（销毁自己、回到第几关等）完全交给调用方决定。
 *  - 本轮（R3）只创建类，不在任何地方实例化/接入，由 R4 负责接线。
 */
export class WinScene {

    readonly container: Laya.Sprite;

    private readonly _onRestart: () => void;
    private _restartBtn: Laya.Sprite;

    constructor(onRestart: () => void) {
        this._onRestart = onRestart;
        this.container = new Laya.Sprite();
        this._build();
    }

    // ── 构建界面 ──────────────────────────────────────────────────
    private _build(): void {
        const W = GameConfig.CANVAS_W;
        const H = GameConfig.CANVAS_H;

        // 背景
        const bg = new Laya.Sprite();
        bg.graphics.drawRect(0, 0, W, H, "#0d0d1a");
        bg.size(W, H);
        this.container.addChild(bg);

        // "You Win!" 主标题
        const title = new Laya.Text();
        title.text     = "You Win!";
        title.color    = "#ffd700";
        title.fontSize = 64;
        title.bold     = true;
        title.width    = W;
        title.align    = "center";
        title.pos(0, 180);
        this.container.addChild(title);

        // 副提示
        const sub = new Laya.Text();
        sub.text     = "Congratulations! All levels cleared.";
        sub.color    = "#aaaacc";
        sub.fontSize = 20;
        sub.width    = W;
        sub.align    = "center";
        sub.pos(0, 270);
        this.container.addChild(sub);

        // Restart 按钮
        const btn = new Laya.Sprite();
        const btnW = 180;
        const btnH = 48;
        btn.graphics.drawRect(0, 0, btnW, btnH, "#334466", "#5566aa", 2);
        btn.size(btnW, btnH);
        btn.mouseEnabled = true;
        btn.pos((W - btnW) / 2, 340);

        const btnLbl = new Laya.Text();
        btnLbl.text     = "Restart";
        btnLbl.color    = "#ccddff";
        btnLbl.fontSize = 22;
        btnLbl.bold     = true;
        btnLbl.width    = btnW;
        btnLbl.align    = "center";
        btnLbl.pos(0, 11);
        btn.addChild(btnLbl);

        btn.on(Laya.Event.CLICK, this, this._onRestartClick);
        this.container.addChild(btn);
        this._restartBtn = btn;

        // 提示文字
        const hint = new Laya.Text();
        hint.text     = "Click Restart to play again";
        hint.color    = "#666688";
        hint.fontSize = 14;
        hint.width    = W;
        hint.align    = "center";
        hint.pos(0, 406);
        this.container.addChild(hint);
    }

    // ── 事件 ──────────────────────────────────────────────────────
    private _onRestartClick(): void {
        this._onRestart();
    }

    // ── 销毁 ──────────────────────────────────────────────────────
    /** 清理按钮监听并从父节点移除；调用方（R4 的 GameManager）决定何时调用 */
    destroy(): void {
        this._restartBtn.off(Laya.Event.CLICK, this, this._onRestartClick);
        this.container.removeSelf();
    }
}
