import { GameConfig } from "../game/GameConfig";

export interface IHomeUICallbacks {
    onCoverAccepted: () => void;
    onPlay: () => void;
    onUiFeedback: () => void;
}

type HomeScreen = "cover" | "menu" | "howToPlay";

/**
 * Lightweight presentation owner for the cover, main menu, and instructions.
 * Product-flow decisions stay in GameManager and arrive here as callbacks.
 */
export class HomeUI {

    readonly container: Laya.Sprite;

    private readonly _callbacks: IHomeUICallbacks;
    private readonly _interactiveTargets: Laya.Sprite[] = [];
    private _screen: HomeScreen = "cover";
    private _actionLocked: boolean = false;

    constructor(callbacks: IHomeUICallbacks) {
        this._callbacks = callbacks;
        this.container = new Laya.Sprite();
        this.container.size(GameConfig.CANVAS_W, GameConfig.CANVAS_H);
        this.container.mouseEnabled = true;
        this.showCover();
    }

    showCover(): void {
        this._screen = "cover";
        this._resetScreen();
        this._buildSunnyBackground();

        const topRule = new Laya.Sprite();
        topRule.graphics.drawRoundRect(
            54, 48, 692, 4,
            2, 2, 2, 2,
            "rgba(255,255,255,0.72)"
        );
        topRule.graphics.drawRoundRect(
            54, 548, 692, 4,
            2, 2, 2, 2,
            "rgba(255,255,255,0.58)"
        );
        this.container.addChild(topRule);

        const eyebrow = this._makeText("A SUNNY LAUNCH PUZZLE", 14, "#3b7c73", true, 720);
        eyebrow.align = "center";
        eyebrow.pos(40, 66);
        this.container.addChild(eyebrow);

        const title = this._makeText("LAUNCH PUZZLE", 64, "#2a3a55", true, 720);
        title.align = "center";
        title.pos(40, 92);
        this.container.addChild(title);

        const tagline = this._makeText(
            "AIM • BOUNCE • REACH THE PORTAL",
            19,
            "#e96b5a",
            true,
            720
        );
        tagline.align = "center";
        tagline.pos(40, 172);
        this.container.addChild(tagline);

        this._addGameplayMotif(82, 212, 636, 190);

        const flow = this._makeText(
            "AIM   →   LAUNCH   →   BOUNCE   →   PORTAL",
            17,
            "#2f6471",
            true,
            720
        );
        flow.align = "center";
        flow.pos(40, 420);
        this.container.addChild(flow);

        const promptBacking = new Laya.Sprite();
        promptBacking.graphics.drawRoundRect(
            0, 0, 352, 58,
            20, 20, 20, 20,
            "rgba(255, 252, 242, 0.92)", "rgba(255,255,255,0.92)", 2
        );
        promptBacking.pos(224, 470);
        this.container.addChild(promptBacking);

        const prompt = this._makeText("TAP / CLICK TO START", 18, "#52657d", true, 352);
        prompt.align = "center";
        prompt.height = 58;
        prompt.valign = "middle";
        prompt.pos(224, 470);
        this.container.addChild(prompt);

        this.container.on(Laya.Event.CLICK, this, this._acceptCover);
        this._interactiveTargets.push(this.container);
    }

    showMainMenu(): void {
        this._screen = "menu";
        this._resetScreen();
        this._buildSunnyBackground();

        const panel = this._makePanel(130, 48, 540, 504);
        this.container.addChild(panel);

        const title = this._makeText("LAUNCH PUZZLE", 43, "#2a3a55", true, 540);
        title.align = "center";
        title.pos(130, 82);
        this.container.addChild(title);

        const tagline = this._makeText(
            "AIM • BOUNCE • REACH THE PORTAL",
            15,
            "#e96b5a",
            true,
            540
        );
        tagline.align = "center";
        tagline.pos(130, 137);
        this.container.addChild(tagline);

        this._addGameplayMotif(205, 172, 390, 126);

        const flow = this._makeText("AIM  →  LAUNCH  →  BOUNCE  →  PORTAL", 13, "#2f6471", true, 480);
        flow.align = "center";
        flow.pos(160, 307);
        this.container.addChild(flow);

        const play = this._makeButton("PLAY", 270, 348, 260, 58, true, () => {
            this._activateUiOnce(this._callbacks.onPlay);
        });
        this.container.addChild(play);

        const howToPlay = this._makeButton("HOW TO PLAY", 270, 424, 260, 52, false, () => {
            this._activateUiOnce(() => this._showHowToPlay());
        });
        this.container.addChild(howToPlay);

        const note = this._makeText("3 sunny launch puzzles", 14, "#70839a", false, 540);
        note.align = "center";
        note.pos(130, 506);
        this.container.addChild(note);
    }

    private _showHowToPlay(): void {
        this._screen = "howToPlay";
        this._resetScreen();
        this._buildSunnyBackground();

        const panel = this._makePanel(105, 52, 590, 496);
        this.container.addChild(panel);

        const title = this._makeText("HOW TO PLAY", 36, "#2a3a55", true, 590);
        title.align = "center";
        title.pos(105, 87);
        this.container.addChild(title);

        const instructions = [
            "1. Drag the orb backward.",
            "2. Aim the predicted path.",
            "3. Release to launch.",
            "4. Bounce off platforms and walls.",
            "5. Reach the portal.",
            "6. Avoid the red danger zone.",
        ];
        const body = this._makeText(instructions.join("\n"), 18, "#3f526a", false, 480);
        body.leading = 10;
        body.pos(160, 150);
        this.container.addChild(body);

        const desktop = this._makeText(
            "DESKTOP   R — Restart Level     P — Pause",
            16,
            "#e96b5a",
            true,
            500
        );
        desktop.align = "center";
        desktop.pos(150, 365);
        this.container.addChild(desktop);

        const mobile = this._makeText("MOBILE   DRAG • AIM • RELEASE", 16, "#3b9b7a", true, 500);
        mobile.align = "center";
        mobile.pos(150, 398);
        this.container.addChild(mobile);

        const back = this._makeButton("BACK", 300, 462, 200, 48, false, () => {
            this._activateUiOnce(() => this.showMainMenu());
        });
        this.container.addChild(back);
    }

    private _acceptCover(): void {
        if (this._screen !== "cover") {
            return;
        }
        this._activateOnce(this._callbacks.onCoverAccepted);
    }

    private _activateOnce(action: () => void): void {
        if (this._actionLocked) {
            return;
        }
        this._actionLocked = true;
        action();
    }

    /** UI audio is best-effort; the original action always runs synchronously and independently. */
    private _activateUiOnce(action: () => void): void {
        if (this._actionLocked) {
            return;
        }
        this._actionLocked = true;
        try {
            this._callbacks.onUiFeedback();
        } catch (e) {
            console.warn("[HomeUI] UI feedback failed; continuing action:", e);
        }
        action();
    }

    private _resetScreen(): void {
        this._clearInteractiveTargets();
        this.container.removeChildren();
        this._actionLocked = false;
    }

    private _buildSunnyBackground(): void {
        const W = GameConfig.CANVAS_W;
        const H = GameConfig.CANVAS_H;
        const bg = new Laya.Sprite();
        bg.graphics.drawRect(0, 0, W, H, "#acd6eb");
        bg.graphics.drawCircle(W - 115, 85, 54, "rgba(255, 245, 200, 0.25)");
        bg.graphics.drawCircle(W - 115, 85, 28, "#fff3b0", "#ffe27a", 2);

        const cloud = (x: number, y: number, scale: number): void => {
            const color = "rgba(255,255,255,0.78)";
            bg.graphics.drawCircle(x, y, 18 * scale, color);
            bg.graphics.drawCircle(x + 22 * scale, y + 4 * scale, 14 * scale, color);
            bg.graphics.drawCircle(x - 22 * scale, y + 4 * scale, 14 * scale, color);
        };
        cloud(120, 90, 1);
        cloud(660, 180, 0.8);
        bg.graphics.drawPoly(0, 0, [
            0, H - 60, 120, H - 90, 245, H - 60,
            390, H - 105, 535, H - 60, 680, H - 88,
            W, H - 60, W, H, 0, H,
        ], "#c5e7cb");
        bg.size(W, H);
        this.container.addChild(bg);
    }

    /** Static UI illustration only; it does not create or reference gameplay objects. */
    private _addGameplayMotif(
        x: number,
        y: number,
        width: number,
        height: number
    ): void {
        const motif = new Laya.Sprite();
        motif.size(width, height);
        motif.pos(x, y);

        motif.graphics.drawRoundRect(
            0, 0, width, height,
            24, 24, 24, 24,
            "rgba(255,255,255,0.30)", "rgba(255,255,255,0.64)", 2
        );

        const orbX = width * 0.12;
        const orbY = height * 0.70;
        const orbR = Math.max(10, height * 0.075);
        motif.graphics.drawCircle(orbX, orbY + 5, orbR + 5, "rgba(58,72,96,0.12)");
        motif.graphics.drawCircle(orbX, orbY, orbR + 10, "rgba(0,0,0,0)", "rgba(233,107,90,0.28)", 3);
        motif.graphics.drawCircle(orbX, orbY, orbR, "#e96b5a", "#fff0ea", 3);
        motif.graphics.drawCircle(orbX - orbR * 0.28, orbY - orbR * 0.32, orbR * 0.30, "#ffd9cf");

        const cueStartX = orbX - orbR * 2.8;
        motif.graphics.drawLine(cueStartX, orbY, orbX - orbR * 1.2, orbY, "rgba(47,100,113,0.72)", 3);
        motif.graphics.drawPoly(0, 0, [
            cueStartX, orbY,
            cueStartX + 10, orbY - 6,
            cueStartX + 10, orbY + 6,
        ], "rgba(47,100,113,0.72)");

        const platformX = width * 0.43;
        const platformY = height * 0.68;
        const platformW = width * 0.20;
        const platformH = Math.max(12, height * 0.10);
        motif.graphics.drawRoundRect(
            platformX + 4, platformY + 6, platformW, platformH,
            6, 6, 6, 6,
            "rgba(58,72,96,0.16)"
        );
        motif.graphics.drawRoundRect(
            platformX, platformY, platformW, platformH,
            6, 6, 6, 6,
            "#5c78c9", "#d9e5ff", 2
        );
        motif.graphics.drawLine(
            platformX + 9, platformY + 4,
            platformX + platformW - 9, platformY + 4,
            "rgba(255,255,255,0.62)", 2
        );

        const portalX = width * 0.88;
        const portalY = height * 0.27;
        const portalR = Math.max(14, height * 0.12);
        motif.graphics.drawCircle(portalX, portalY, portalR + 12, "rgba(102,209,161,0.10)");
        motif.graphics.drawCircle(portalX, portalY, portalR + 6, "rgba(0,0,0,0)", "rgba(72,183,135,0.34)", 4);
        motif.graphics.drawCircle(portalX, portalY, portalR, "rgba(255,255,255,0.18)", "#3b9b7a", 4);
        motif.graphics.drawCircle(portalX, portalY, portalR * 0.34, "#7ce0b5");

        const trajectory: Array<[number, number]> = [
            [0.20, 0.61], [0.29, 0.50], [0.38, 0.47], [0.47, 0.54], [0.52, 0.62],
            [0.60, 0.51], [0.69, 0.39], [0.78, 0.30], [0.84, 0.27],
        ];
        trajectory.forEach(([px, py], index) => {
            const dotR = Math.max(2.5, 4.5 - index * 0.18);
            motif.graphics.drawCircle(
                width * px,
                height * py,
                dotR,
                index < 5 ? "#f4b65f" : "#66c9a1",
                "rgba(255,255,255,0.78)",
                1
            );
        });

        this.container.addChild(motif);
    }

    private _makePanel(x: number, y: number, width: number, height: number): Laya.Sprite {
        const panel = new Laya.Sprite();
        panel.graphics.drawRoundRect(
            0, 0, width, height,
            28, 28, 28, 28,
            "rgba(255, 252, 242, 0.96)", "rgba(255,255,255,0.92)", 2
        );
        panel.size(width, height);
        panel.pos(x, y);
        return panel;
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

        // The outer button owns the unchanged hitbox. Only this child visual moves on press.
        const visual = new Laya.Sprite();
        visual.size(width, height);
        visual.mouseEnabled = false;
        button.addChild(visual);

        const text = this._makeText(label, 20, primary ? "#ffffff" : "#2f4d57", true, width);
        text.align = "center";
        text.height = height;
        text.valign = "middle";
        visual.addChild(text);

        const paint = (state: "normal" | "hover" | "pressed"): void => {
            const fill = primary
                ? (state === "pressed" ? "#d85849" : state === "hover" ? "#f27b68" : "#e96b5a")
                : (state === "pressed" ? "#a9d8c5" : state === "hover" ? "#d2efe2" : "#bfe5d4");
            const shadowOffset = state === "pressed" ? 1 : 4;
            const shadow = primary ? "rgba(125,55,49,0.24)" : "rgba(47,77,87,0.20)";
            visual.pos(0, state === "pressed" ? 3 : 0);
            visual.graphics.clear();
            visual.graphics.drawRoundRect(0, shadowOffset, width, height, 16, 16, 16, 16, shadow);
            visual.graphics.drawRoundRect(0, 0, width, height, 16, 16, 16, 16, fill);
        };

        paint("normal");
        button.on(Laya.Event.MOUSE_OVER, this, () => paint("hover"));
        button.on(Laya.Event.MOUSE_OUT, this, () => paint("normal"));
        button.on(Laya.Event.MOUSE_DOWN, this, () => paint("pressed"));
        button.on(Laya.Event.MOUSE_UP, this, () => paint(Laya.Browser.onMobile ? "normal" : "hover"));
        button.on(Laya.Event.CLICK, this, onClick);
        this._interactiveTargets.push(button);
        return button;
    }

    private _clearInteractiveTargets(): void {
        for (const target of this._interactiveTargets) {
            target.offAllCaller(this);
        }
        this._interactiveTargets.length = 0;
    }

    destroy(): void {
        this._clearInteractiveTargets();
        this.container.removeChildren();
        this.container.removeSelf();
    }
}
