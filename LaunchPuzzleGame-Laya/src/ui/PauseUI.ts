import { GameConfig } from "../game/GameConfig";

export interface IPauseUICallbacks {
    onResume: () => void;
    onRestart: () => void;
    onMainMenu: () => void;
    onToggleMute: () => boolean;
    isMuted: () => boolean;
}

/** Presentation-only modal shown while GameScene owns a paused runtime state. */
export class PauseUI {

    readonly container: Laya.Sprite;

    private readonly _callbacks: IPauseUICallbacks;
    private readonly _interactiveTargets: Laya.Sprite[] = [];
    private _muteLabel: Laya.Text;
    private _actionLocked: boolean = false;

    constructor(callbacks: IPauseUICallbacks) {
        this._callbacks = callbacks;
        this.container = new Laya.Sprite();
        this.container.size(GameConfig.CANVAS_W, GameConfig.CANVAS_H);
        this.container.mouseEnabled = true;
        this.container.zOrder = 1000;
        this._build();
    }

    private _build(): void {
        const W = GameConfig.CANVAS_W;
        const H = GameConfig.CANVAS_H;

        const shade = new Laya.Sprite();
        shade.graphics.drawRect(0, 0, W, H, "rgba(42, 58, 85, 0.42)");
        shade.size(W, H);
        this.container.addChild(shade);

        const panel = new Laya.Sprite();
        panel.graphics.drawRoundRect(
            0, 0, 390, 470,
            26, 26, 26, 26,
            "#fffaf0", "rgba(255,255,255,0.9)", 2
        );
        panel.size(390, 470);
        panel.pos(205, 65);
        this.container.addChild(panel);

        const title = this._makeText("PAUSED", 42, "#2a3a55", true, 390);
        title.align = "center";
        title.pos(205, 105);
        this.container.addChild(title);

        const sub = this._makeText("Take a breath. Your launch is frozen.", 15, "#6f8195", false, 390);
        sub.align = "center";
        sub.pos(205, 163);
        this.container.addChild(sub);

        this.container.addChild(this._makeButton("RESUME", 275, 220, 250, 56, true, () => {
            this._activateOnce(this._callbacks.onResume);
        }));
        this.container.addChild(this._makeButton("RESTART", 275, 294, 250, 50, false, () => {
            this._activateOnce(this._callbacks.onRestart);
        }));
        this.container.addChild(this._makeButton("MAIN MENU", 275, 360, 250, 50, false, () => {
            this._activateOnce(this._callbacks.onMainMenu);
        }));

        const muteButton = this._makeButton("", 300, 440, 200, 46, false, () => {
            this._callbacks.onToggleMute();
            this._refreshMuteLabel();
        });
        this._muteLabel = muteButton.getChildAt(0) as Laya.Text;
        this._refreshMuteLabel();
        this.container.addChild(muteButton);

        // A modal-level propagation stop blocks all overlay pointer events from
        // reaching GameScene's stage listeners, including clicks outside buttons.
        this.container.on(Laya.Event.MOUSE_DOWN, this, this._stopPropagation);
        this.container.on(Laya.Event.MOUSE_MOVE, this, this._stopPropagation);
        this.container.on(Laya.Event.MOUSE_UP, this, this._stopPropagation);
        this.container.on(Laya.Event.CLICK, this, this._stopPropagation);
        this._interactiveTargets.push(this.container);
    }

    private _stopPropagation(event: Laya.Event): void {
        event.stopPropagation();
    }

    private _activateOnce(action: () => void): void {
        if (this._actionLocked) {
            return;
        }
        this._actionLocked = true;
        action();
    }

    private _refreshMuteLabel(): void {
        this._muteLabel.text = this._callbacks.isMuted() ? "MUTE: ON" : "MUTE: OFF";
    }

    private _makeText(
        text: string,
        fontSize: number,
        color: string,
        bold: boolean,
        width: number
    ): Laya.Text {
        const label = new Laya.Text();
        label.text = text;
        label.fontSize = fontSize;
        label.color = color;
        label.bold = bold;
        label.width = width;
        return label;
    }

    private _makeButton(
        label: string,
        x: number,
        y: number,
        width: number,
        height: number,
        primary: boolean,
        onClick: () => void
    ): Laya.Sprite {
        const button = new Laya.Sprite();
        button.size(width, height);
        button.pos(x, y);
        button.mouseEnabled = true;

        const text = this._makeText(label, 19, primary ? "#ffffff" : "#2f4d57", true, width);
        text.align = "center";
        text.height = height;
        text.valign = "middle";
        button.addChild(text);

        const paint = (state: "normal" | "hover" | "pressed"): void => {
            const fill = primary
                ? (state === "pressed" ? "#d85849" : state === "hover" ? "#f27b68" : "#e96b5a")
                : (state === "pressed" ? "#a9d8c5" : state === "hover" ? "#d2efe2" : "#bfe5d4");
            button.graphics.clear();
            button.graphics.drawRoundRect(0, 0, width, height, 14, 14, 14, 14, fill);
        };

        paint("normal");
        button.on(Laya.Event.MOUSE_OVER, this, () => paint("hover"));
        button.on(Laya.Event.MOUSE_OUT, this, () => paint("normal"));
        button.on(Laya.Event.MOUSE_DOWN, this, () => paint("pressed"));
        button.on(Laya.Event.MOUSE_UP, this, () => paint("hover"));
        button.on(Laya.Event.CLICK, this, onClick);
        this._interactiveTargets.push(button);
        return button;
    }

    destroy(): void {
        for (const target of this._interactiveTargets) {
            target.offAllCaller(this);
        }
        this._interactiveTargets.length = 0;
        this.container.removeChildren();
        this.container.removeSelf();
    }
}
