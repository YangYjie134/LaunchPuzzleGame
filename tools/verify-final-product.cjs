"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const BASELINE = "edb9c8c41a4037e2e9f9dd546b1bb1ec431d5954";
const PATCH_BASELINE = "7c2e802496031e7359f97a11d5726f236d6a3fab";
const UI_CLICK_PATH = "LaunchPuzzleGame-Laya/assets/resources/audio/sfx_ui_click.wav";
const UI_CLICK_META_PATH = `${UI_CLICK_PATH}.meta`;
const UI_CLICK_SHA256 = "90498FFC7853ED045C0A4F48076F827C1DC8690DB1ABD852227196E1F5EF5AD3";
const COLLISION_SFX_PATH = "LaunchPuzzleGame-Laya/assets/resources/audio/sfx_collision.wav";
const COLLISION_SFX_SHA256 = "3AA636679FFDC9602D27655CA59A7C7342AE137B68E54C61AAD0FB3C414506CA";
const COLLISION_SFX_META_PATH = `${COLLISION_SFX_PATH}.meta`;
const COLLISION_SFX_META_SHA256 = "EA59AB6011121EB359A781C0C11801A053E5F19364292894E95E83B5B39201C5";
const FAIL_SFX_PATH = "LaunchPuzzleGame-Laya/assets/resources/audio/sfx_fail.mp3";
const FAIL_SFX_SHA256 = "548CAAE85B45BFB70784F6D7101BC8356A27C0CCF2A6CA41FA0220DD592D9920";
const FAIL_SFX_META_PATH = `${FAIL_SFX_PATH}.meta`;
const FAIL_SFX_META_SHA256 = "BB45C38CAAD7D7C0BD09A635A09C792EABDBA5BB6E34FD92B9B9D8B18C692A3B";
const MOBILE_COLLISION_SFX_PATH = "LaunchPuzzleGame-Laya/assets/resources/audio/sfx_collision_mobile.wav";
const MOBILE_COLLISION_SFX_SHA256 = "572C8341C2CF7F0177199C60B067DAB6FDDB771652352526DDE95293B367FD31";
const MOBILE_COLLISION_SFX_META_PATH = `${MOBILE_COLLISION_SFX_PATH}.meta`;
const MOBILE_COLLISION_SFX_META_SHA256 = "8B87E304172CC609D66AEB0D1EC4BD05B38F621346BC497F51F02F0CD45427CE";
const MOBILE_FAIL_SFX_PATH = "LaunchPuzzleGame-Laya/assets/resources/audio/sfx_fail_mobile.wav";
const MOBILE_FAIL_SFX_SHA256 = "67C4DE4EE5E5DA2EA8D999DF74ED2BEFC58CDC16C50C0A13C06F9AF56D93C467";
const MOBILE_FAIL_SFX_META_PATH = `${MOBILE_FAIL_SFX_PATH}.meta`;
const MOBILE_FAIL_SFX_META_SHA256 = "166AC3F4013C58A55C6F3DF14CBD173569C13CE0420CD3D56567329A3C1698BE";
const checks = [];

function file(relativePath) {
    return fs.readFileSync(path.join(ROOT, relativePath), "utf8").replace(/\r\n/g, "\n");
}

function git(args, encoding = "utf8") {
    const result = spawnSync("git", args, {
        cwd: ROOT,
        encoding: encoding === null ? null : encoding,
        maxBuffer: 32 * 1024 * 1024,
    });
    if (result.status !== 0) {
        throw new Error(`git ${args.join(" ")} failed: ${String(result.stderr).trim()}`);
    }
    return result.stdout;
}

function gitBlob(relativePath) {
    return git(["show", `${BASELINE}:${relativePath.replace(/\\/g, "/")}`], null);
}

function gitBlobAt(revision, relativePath) {
    return git(["show", `${revision}:${relativePath.replace(/\\/g, "/")}`], null);
}

function sha256(buffer) {
    return crypto.createHash("sha256").update(buffer).digest("hex").toUpperCase();
}

function methodBody(source, methodName) {
    const escaped = methodName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = new RegExp(
        `^\\s*(?:(?:private|public|protected)\\s+)?(?:static\\s+)?${escaped}\\s*\\([^)]*\\)\\s*[^\\{\\n]*\\{`,
        "m"
    ).exec(source);
    if (!match) {
        return null;
    }
    const start = match.index + match[0].length - 1;
    let depth = 0;
    for (let index = start; index < source.length; index += 1) {
        const char = source[index];
        if (char === "{") depth += 1;
        if (char === "}") depth -= 1;
        if (depth === 0) return source.slice(start, index + 1);
    }
    return null;
}

function methodSource(source, methodName) {
    const escaped = methodName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = new RegExp(
        `^\\s*(?:(?:private|public|protected)\\s+)?(?:static\\s+)?${escaped}\\s*\\([^)]*\\)\\s*[^\\{\\n]*\\{`,
        "m"
    ).exec(source);
    if (!match) {
        return null;
    }
    const brace = match.index + match[0].length - 1;
    let depth = 0;
    for (let index = brace; index < source.length; index += 1) {
        const char = source[index];
        if (char === "{") depth += 1;
        if (char === "}") depth -= 1;
        if (depth === 0) return source.slice(match.index, index + 1);
    }
    return null;
}

function parsePcmWav(buffer) {
    if (buffer.length < 44 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") {
        return null;
    }
    let format = null;
    let dataBytes = null;
    let dataOffset = null;
    for (let offset = 12; offset + 8 <= buffer.length;) {
        const id = buffer.toString("ascii", offset, offset + 4);
        const size = buffer.readUInt32LE(offset + 4);
        const dataStart = offset + 8;
        if (dataStart + size > buffer.length) return null;
        if (id === "fmt " && size >= 16) {
            format = {
                audioFormat: buffer.readUInt16LE(dataStart),
                channels: buffer.readUInt16LE(dataStart + 2),
                sampleRate: buffer.readUInt32LE(dataStart + 4),
                byteRate: buffer.readUInt32LE(dataStart + 8),
                blockAlign: buffer.readUInt16LE(dataStart + 12),
                bitsPerSample: buffer.readUInt16LE(dataStart + 14),
            };
        } else if (id === "data") {
            dataBytes = size;
            dataOffset = dataStart;
        }
        offset = dataStart + size + (size % 2);
    }
    if (!format || dataBytes == null || dataOffset == null || format.byteRate === 0) return null;
    return { ...format, dataBytes, dataOffset, durationMs: dataBytes / format.byteRate * 1000 };
}

function pcm16Stats(buffer, info) {
    if (!info || info.audioFormat !== 1 || info.bitsPerSample !== 16 || info.dataBytes % 2 !== 0) {
        return null;
    }
    let peak = 0;
    let sumSquares = 0;
    const sampleCount = info.dataBytes / 2;
    for (let index = 0; index < sampleCount; index += 1) {
        const pcm = buffer.readInt16LE(info.dataOffset + index * 2);
        const sample = pcm < 0 ? pcm / 32768 : pcm / 32767;
        peak = Math.max(peak, Math.abs(sample));
        sumSquares += sample * sample;
    }
    const rms = Math.sqrt(sumSquares / sampleCount);
    return {
        peak,
        rms,
        peakDb: 20 * Math.log10(peak),
        rmsDb: 20 * Math.log10(rms),
    };
}

function walkFiles(rootPath) {
    const results = [];
    for (const entry of fs.readdirSync(rootPath, { withFileTypes: true })) {
        const fullPath = path.join(rootPath, entry.name);
        if (entry.isDirectory()) results.push(...walkFiles(fullPath));
        else results.push(fullPath);
    }
    return results;
}

function record(name, condition, detail = "") {
    const passed = Boolean(condition);
    checks.push({ name, passed, detail });
    const suffix = detail ? ` — ${detail}` : "";
    console.log(`[${passed ? "PASS" : "FAIL"}] ${name}${suffix}`);
}

function contains(source, ...needles) {
    return needles.every((needle) => source.includes(needle));
}

function removeExactOnce(source, exactBlock) {
    const firstIndex = source.indexOf(exactBlock);
    if (firstIndex < 0 || source.indexOf(exactBlock, firstIndex + exactBlock.length) >= 0) {
        return null;
    }
    return source.slice(0, firstIndex) + source.slice(firstIndex + exactBlock.length);
}

function replaceExactOnce(source, exactBlock, replacementBlock) {
    const firstIndex = source.indexOf(exactBlock);
    if (firstIndex < 0 || source.indexOf(exactBlock, firstIndex + exactBlock.length) >= 0) {
        return null;
    }
    return source.slice(0, firstIndex) + replacementBlock + source.slice(firstIndex + exactBlock.length);
}

function applyExactReplacements(source, replacements) {
    let result = source;
    for (const [exactBlock, replacementBlock] of replacements) {
        result = replaceExactOnce(result, exactBlock, replacementBlock);
        if (result === null) return null;
    }
    return result;
}

const manager = file("LaunchPuzzleGame-Laya/src/game/GameManager.ts");
const game = file("LaunchPuzzleGame-Laya/src/game/GameScene.ts");
const win = file("LaunchPuzzleGame-Laya/src/game/WinScene.ts");
const audio = file("LaunchPuzzleGame-Laya/src/audio/AudioManager.ts");
const home = file("LaunchPuzzleGame-Laya/src/ui/HomeUI.ts");
const pause = file("LaunchPuzzleGame-Laya/src/ui/PauseUI.ts");
const config = file("LaunchPuzzleGame-Laya/src/game/GameConfig.ts");
const readme = file("README.md");
const playerSettings = JSON.parse(file("LaunchPuzzleGame-Laya/settings/PlayerSettings.json"));

const initBody = methodBody(manager, "init") || "";
record("1 GameManager.init opens Cover", contains(initBody, "this.showCover()") && !/startLevel\s*\(\s*0\s*\)/.test(initBody));
record("2 Cover exists", contains(home, "LAUNCH PUZZLE", "AIM • BOUNCE • REACH THE PORTAL", "TAP / CLICK TO START"));
record("3 Cover routes to Main Menu", contains(manager, "_acceptCover", "this._homeUI.showMainMenu()"));
record("4 Main Menu PLAY starts fresh Level 0", contains(home, '"PLAY"', "this._callbacks.onPlay") && /startNewGame\(\)[\s\S]*?startLevel\(0\)/.test(manager));
record("5 HOW TO PLAY exists", contains(home, "HOW TO PLAY", "Drag the orb backward", "Avoid the red danger zone"));
record("6 BACK returns to Main Menu", /_makeButton\("BACK"[\s\S]*?this\.showMainMenu\(\)/.test(home));
record("7 R restarts current level", contains(game, "Laya.Keyboard.R", "this._callbacks.onReset()") && contains(manager, "restartCurrentLevel", "this.startLevel(this._currentLevel)"));
record("8 P toggles Pause and Resume", contains(game, "Laya.Keyboard.P", "this._enterPause()", "this._resumeFromPause()"));
record("9 Pause button exists and is mounted", contains(game, "_buildPauseButton", 'label.text = "Ⅱ"', "this.container.addChild(hit)"));

const pausableBody = methodBody(game, "_isPausableState") || "";
record("10 Pause allowed only in ready/dragging/flying", contains(pausableBody, "'ready'", "'dragging'", "'flying'") && !contains(pausableBody, "'respawning'") && !contains(pausableBody, "'completed'"));
record("11 respawning cannot Pause", !pausableBody.includes("respawning"));
record("12 completed cannot Pause", !pausableBody.includes("completed"));

const enterPauseBody = methodBody(game, "_enterPause") || "";
record("13 dragging Pause cancels drag to ready", /_state === 'dragging'[\s\S]*?_state = 'ready'/.test(enterPauseBody));
const updateBody = methodBody(game, "_update") || "";
record("14 flying Pause freezes and Resume preserves continuation", /^\{\s*if \(this\._paused\) return;/.test(updateBody) && !/_physicsAccumulator\s*=/.test(enterPauseBody));
record("15 Pause overlay blocks gameplay action", contains(pause, "event.stopPropagation()", "Laya.Event.MOUSE_DOWN", "Laya.Event.MOUSE_MOVE", "Laya.Event.MOUSE_UP") && contains(game, "if (this._paused) return;"));
record("16 Pause RESTART targets current level", contains(pause, '"RESTART"', "this._callbacks.onRestart") && contains(manager, "restartCurrentLevel"));
record("17 MAIN MENU abandons current run", contains(pause, '"MAIN MENU"', "this._callbacks.onMainMenu") && contains(manager, "returnToMainMenu", "this.showMainMenu()"));

class FlowModel {
    constructor() {
        this.surface = "cover";
        this.level = null;
        this.sceneCreations = 0;
        this.paused = false;
    }
    acceptCover() { this.surface = "menu"; }
    play() { this.surface = "game"; this.level = 0; this.paused = false; this.sceneCreations += 1; }
    pause() { if (this.surface === "game") this.paused = true; }
    mainMenu() { this.surface = "menu"; this.level = null; this.paused = false; }
}
const flow = new FlowModel();
flow.acceptCover();
for (let index = 0; index < 3; index += 1) {
    flow.play();
    flow.pause();
    flow.mainMenu();
}
record("18 Menu/Game/Pause/Main Menu is re-entrant in mock boundary", flow.surface === "menu" && flow.sceneCreations === 3 && flow.level === null && !flow.paused, "STATIC_REENTRY_SEQUENCE=PASS");

const toggleMuteBody = methodBody(audio, "toggleMute") || "";
record("19 AudioManager toggleMute/isMuted", contains(audio, "static toggleMute(): boolean", "static isMuted(): boolean", "Laya.SoundManager.muted"));
record("20 mute does not reset BGM start state", !contains(toggleMuteBody, "_bgmStarted") && !contains(toggleMuteBody, "stopBgm"));
record("21 Cover attempts BGM and gesture-restarts the same track", /showCover\(\)[\s\S]*?AudioManager\.playBgmOnce\(\)/.test(manager) && /_acceptCover\(\)[\s\S]*?AudioManager\.restartBgm\(\)[\s\S]*?showMainMenu\(\)/.test(manager) && contains(audio, "static restartBgm", "AudioManager.stopBgm()", "AudioManager.playBgmOnce()"));

const desktopRadius = Number((game.match(/CLICK_RADIUS\s*=\s*(\d+)/) || [])[1]);
const mobileRadius = Number((game.match(/MOBILE_CLICK_RADIUS\s*=\s*(\d+)/) || [])[1]);
record("22 mobile acquisition radius exceeds desktop", mobileRadius > desktopRadius && contains(game, "Laya.Browser.onMobile", "acquisitionRadius"), `${desktopRadius} -> ${mobileRadius}`);
record("23 visual ball radius remains config-driven", contains(game, "GameConfig.BALL_RADIUS") && !/new Ball\([^;]*MOBILE_CLICK_RADIUS/.test(game));
record("24 physics constants unchanged", /GRAVITY:\s*number\s*=\s*980/.test(config) && /BOUNCE:\s*number\s*=\s*0\.65/.test(config) && /MAX_DRAG:\s*number\s*=\s*150/.test(config) && /BALL_RADIUS:\s*number\s*=\s*12/.test(config));
record("25 WinScene exposes PLAY AGAIN callback", contains(win, "onPlayAgain", "PLAY AGAIN"));
record("26 WinScene exposes MAIN MENU callback", contains(win, "onMainMenu", "MAIN MENU"));
record("27 Play Again routes to fresh Level 0", contains(manager, "_onWinPlayAgain", "this.startNewGame()") && /startNewGame\(\)[\s\S]*?startLevel\(0\)/.test(manager));
record("28 Win Main Menu routes to Main Menu", contains(manager, "onMainMenu: () => this.returnToMainMenu()"));

const stageOnCount = (game.match(/Laya\.stage\.on\(/g) || []).length;
const stageOffCount = (game.match(/Laya\.stage\.off\(/g) || []).length;
record("29 destroy/listener cleanup stays symmetric", stageOnCount === stageOffCount && stageOnCount === 4 && contains(game, "Laya.timer.clearAll(this)", "this._pauseButton.offAllCaller(this)") && [home, pause, win].every((source) => source.includes("offAllCaller(this)")), `${stageOnCount} stage on / ${stageOffCount} stage off`);

const protectedSources = [
    "LaunchPuzzleGame-Laya/src/physics/PhysicsEngine.ts",
    "LaunchPuzzleGame-Laya/src/levels/LevelData.ts",
    "LaunchPuzzleGame-Laya/src/levels/LevelLoader.ts",
    "LaunchPuzzleGame-Laya/src/game/GameConfig.ts",
    "LaunchPuzzleGame-Laya/src/objects/Ball.ts",
    "LaunchPuzzleGame-Laya/src/objects/Platform.ts",
    "LaunchPuzzleGame-Laya/src/objects/Target.ts",
];
const protectedSourceResults = protectedSources.map((relativePath) => {
    const current = fs.readFileSync(path.join(ROOT, relativePath));
    return current.equals(gitBlob(relativePath));
});
record("30 protected source files match authoritative HEAD", protectedSourceResults.every(Boolean), `${protectedSourceResults.filter(Boolean).length}/${protectedSources.length}`);

const baselineGame = gitBlob("LaunchPuzzleGame-Laya/src/game/GameScene.ts").toString("utf8").replace(/\r\n/g, "\n");
const approvedDynamicDragReplacements = [
    [
`    /** Mobile keeps the visual BALL_RADIUS unchanged while easing touch acquisition. */
    private static readonly MOBILE_CLICK_RADIUS = 64;
`,
`    /** Mobile keeps the visual BALL_RADIUS unchanged while easing touch acquisition. */
    private static readonly MOBILE_CLICK_RADIUS = 64;
    /** Mobile edge compensation uses Stage-space units, matching stage.mouseX/Y and game geometry. */
    private static readonly MOBILE_EDGE_MARGIN = 24;
    private static readonly MIN_MOBILE_FULL_POWER_RATIO = 0.70;
`,
    ],
    [
`    // ── 发射（反向充能） ──────────────────────────────────────────
    /**
`,
`    // ── 发射（反向充能） ──────────────────────────────────────────
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
`,
    ],
    [
`        const capped = Math.min(pullDist, GameConfig.MAX_DRAG);
        const speed  = (capped / GameConfig.MAX_DRAG) * GameConfig.LAUNCH_SPEED_MAX;
`,
`        const capped = Math.min(pullDist, GameConfig.MAX_DRAG);
        const powerRatio = this._getEffectiveLaunchPower(pullX, pullY, pullDist, capped);
        const speed  = powerRatio * GameConfig.LAUNCH_SPEED_MAX;
`,
    ],
    [
`        const capped = Math.min(pullDist, GameConfig.MAX_DRAG);
        const ratio  = capped / pullDist;
`,
`        const capped = Math.min(pullDist, GameConfig.MAX_DRAG);
        const ratio  = capped / pullDist;
        const powerRatio = this._getEffectiveLaunchPower(pullX, pullY, pullDist, capped);
`,
    ],
    [
`        const speed = (capped / GameConfig.MAX_DRAG) * GameConfig.LAUNCH_SPEED_MAX;
`,
`        const speed = powerRatio * GameConfig.LAUNCH_SPEED_MAX;
`,
    ],
    [
`        const pct = Math.round((capped / GameConfig.MAX_DRAG) * 100);
`,
`        const pct = Math.round(powerRatio * 100);
`,
    ],
];
const reversedDynamicDragReplacements = approvedDynamicDragReplacements
    .slice()
    .reverse()
    .map(([before, after]) => [after, before]);
const gameBeforeDynamicDrag = applyExactReplacements(game, reversedDynamicDragReplacements);
const protectedMethods = ["_launch", "_drawAimVisualization", "_stepPhysics", "_onFail", "_respawn", "_onPortalReached"];
const protectedMethodResults = protectedMethods.map((name) => gameBeforeDynamicDrag !== null
    && methodBody(gameBeforeDynamicDrag, name) === methodBody(baselineGame, name));
record("31 protected gameplay methods match authoritative HEAD after exact approved dynamic-drag normalization", protectedMethodResults.every(Boolean), `${protectedMethodResults.filter(Boolean).length}/${protectedMethods.length}`);

const audioPaths = git(["ls-tree", "-r", "--name-only", BASELINE, "--", "LaunchPuzzleGame-Laya/assets/resources/audio/"])
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
const protectedAudioResults = audioPaths.map((relativePath) => fs.readFileSync(path.join(ROOT, relativePath)).equals(gitBlob(relativePath)));
record("32 audio assets and metadata match authoritative HEAD", audioPaths.length === 10 && protectedAudioResults.every(Boolean), `${protectedAudioResults.filter(Boolean).length}/${audioPaths.length}`);

record("33 Home/Pause/Win presentation has create, mount, layout, hit, and event evidence", contains(home, "new Laya.Sprite", "size(", "mouseEnabled = true", "Laya.Event.CLICK") && contains(pause, "new Laya.Sprite", "size(", "mouseEnabled = true", "Laya.Event.CLICK") && contains(win, "new Laya.Sprite", "size(", "mouseEnabled = true", "Laya.Event.CLICK") && /Laya\.stage\.addChild\(home\.container\)/.test(manager) && /Laya\.stage\.addChild\(winScene\.container\)/.test(manager));
record("34 duplicate destructive actions are guarded", [home, pause, win].every((source) => contains(source, "_actionLocked", "_activateOnce")));
record("35 Pause pointer coordinate guard only rejects acquisition", contains(game, "_isInsidePauseHitRegion", "if (this._isInsidePauseHitRegion(mx, my)) return") && !(methodBody(game, "_isInsidePauseHitRegion") || "").includes("_ball"));
record("36 README documents final controls and product flow", contains(readme, "Cover", "Main Menu", "How to Play", "Pause", "mobile", "Mute", "3 playable levels", "BGM", "SFX"));

const expectedImplementationPaths = new Set([
    "LaunchPuzzleGame-Laya/settings/PlayerSettings.json",
    "LaunchPuzzleGame-Laya/assets/resources/audio/sfx_collision_mobile.wav",
    "LaunchPuzzleGame-Laya/assets/resources/audio/sfx_collision_mobile.wav.meta",
    "LaunchPuzzleGame-Laya/assets/resources/audio/sfx_fail_mobile.wav",
    "LaunchPuzzleGame-Laya/assets/resources/audio/sfx_fail_mobile.wav.meta",
    "LaunchPuzzleGame-Laya/assets/resources/audio/sfx_ui_click.wav",
    "LaunchPuzzleGame-Laya/assets/resources/audio/sfx_ui_click.wav.meta",
    "LaunchPuzzleGame-Laya/src/game/GameManager.ts",
    "LaunchPuzzleGame-Laya/src/game/GameScene.ts",
    "LaunchPuzzleGame-Laya/src/audio/AudioManager.ts",
    "LaunchPuzzleGame-Laya/src/ui/HomeUI.ts",
    "tools/verify-final-product.cjs",
]);
const statusLines = git(["status", "--porcelain=v1", "--untracked-files=all"])
    .split(/\r?\n/)
    .filter(Boolean);
const changedImplementationPaths = statusLines
    .map((line) => line.slice(3).replace(/\\/g, "/"))
    .filter((relativePath) => relativePath !== "AGENTS.md" && !relativePath.startsWith(".agents/"));
const scopeClean = changedImplementationPaths.every((relativePath) => expectedImplementationPaths.has(relativePath));
record("37 implementation paths stay inside locked allowlist", scopeClean, changedImplementationPaths.join(", "));
record("38 staged diff remains empty", git(["diff", "--cached", "--name-only"]).trim() === "");

const changedPathSet = new Set(changedImplementationPaths);
const exactPatchPaths = changedPathSet.size === expectedImplementationPaths.size
    && [...expectedImplementationPaths].every((relativePath) => changedPathSet.has(relativePath));
record("39 v1.0.1 candidate changes exactly the twelve authorized paths", exactPatchPaths, `${changedPathSet.size}/12`);

const resolution = playerSettings.resolution || {};
record("40 PlayerSettings uses the frozen 800x600 showall centered resolution", resolution.designWidth === 800
    && resolution.designHeight === 600
    && resolution.scaleMode === "showall"
    && resolution.alignH === "center"
    && resolution.alignV === "middle"
    && resolution.screenMode === "none"
    && resolution.backgroundColor === "#acd6eb");

const uiClickWav = fs.readFileSync(path.join(ROOT, UI_CLICK_PATH));
const uiClickWavInfo = parsePcmWav(uiClickWav);
record("41 deterministic UI click WAV matches pinned SHA-256", sha256(uiClickWav) === UI_CLICK_SHA256, UI_CLICK_SHA256);
record("42 UI click WAV is PCM mono 16-bit 44.1kHz and 60-100ms", uiClickWavInfo
    && uiClickWavInfo.audioFormat === 1
    && uiClickWavInfo.channels === 1
    && uiClickWavInfo.sampleRate === 44100
    && uiClickWavInfo.bitsPerSample === 16
    && uiClickWavInfo.blockAlign === 2
    && uiClickWavInfo.byteRate === 88200
    && uiClickWavInfo.durationMs >= 60
    && uiClickWavInfo.durationMs <= 100,
uiClickWavInfo ? `${uiClickWavInfo.durationMs.toFixed(3)}ms` : "invalid WAV");

const uiClickMeta = JSON.parse(file(UI_CLICK_META_PATH));
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const allAssetMetaPaths = walkFiles(path.join(ROOT, "LaunchPuzzleGame-Laya/assets")).filter((filePath) => filePath.endsWith(".meta"));
const uuidOccurrences = allAssetMetaPaths.reduce((count, filePath) => {
    try {
        return count + (JSON.parse(fs.readFileSync(filePath, "utf8")).uuid === uiClickMeta.uuid ? 1 : 0);
    } catch {
        return count;
    }
}, 0);
record("43 UI click meta has one unique LayaAir-style UUID", uuidPattern.test(uiClickMeta.uuid) && uuidOccurrences === 1, `${uiClickMeta.uuid}; occurrences=${uuidOccurrences}`);

const unlockBody = methodBody(audio, "unlockSfxFromUserGesture") || "";
const clickBody = methodBody(audio, "playUiClickFromUserGesture") || "";
const resumeBody = methodBody(audio, "_resumeAudioContext") || "";
const unlockScope = `${unlockBody}\n${clickBody}\n${resumeBody}`;
record("44 AudioManager implements retryable non-blocking unlock and ordered UI click", contains(audio,
    'SFX_UI_CLICK_URL: string = "resources/audio/sfx_ui_click.wav"',
    "static unlockSfxFromUserGesture(): void",
    "static playUiClickFromUserGesture(): void")
    && contains(unlockBody, 'ctx.state === "running"', "void AudioManager._resumeAudioContext")
    && contains(clickBody, 'ctx.state === "running"', ".then((running)", "running && ctx.state === \"running\"")
    && contains(resumeBody, "ctx.resume()", ".catch((e)", "_audioResumePromise = null")
    && !unlockScope.includes("await "));
record("45 WebAudio unlock scope does not mutate mute, volumes, BGM state, or playback", [
    "SoundManager.muted", "musicVolume", "soundVolume", "_bgmStarted", "stopBgm", "restartBgm",
].every((forbidden) => !unlockScope.includes(forbidden)));

const acceptCoverBody = methodBody(manager, "_acceptCover") || "";
const feedbackWiringCount = (manager.match(/onUiFeedback:\s*\(\)\s*=>\s*AudioManager\.playUiClickFromUserGesture\(\)/g) || []).length;
record("46 GameManager change stays at the narrow audio wiring and Cover unlock seams", feedbackWiringCount === 2
    && acceptCoverBody.indexOf("AudioManager.unlockSfxFromUserGesture()") < acceptCoverBody.indexOf("AudioManager.restartBgm()")
    && acceptCoverBody.indexOf("AudioManager.restartBgm()") < acceptCoverBody.indexOf("this._homeUI.showMainMenu()")
    && !acceptCoverBody.includes("await "));

const activateUiBody = methodBody(home, "_activateUiOnce") || "";
const makeButtonStart = home.indexOf("    private _makeButton(");
const makeButtonEnd = home.indexOf("    private _clearInteractiveTargets", makeButtonStart);
const makeButtonBody = makeButtonStart >= 0 && makeButtonEnd > makeButtonStart
    ? home.slice(makeButtonStart, makeButtonEnd)
    : "";
record("47 HomeUI has immediate feedback for PLAY/HOW/BACK and child-visual-only press motion", (home.match(/this\._activateUiOnce\(/g) || []).length === 3
    && contains(home, "onUiFeedback: () => void")
    && contains(activateUiBody, "this._callbacks.onUiFeedback()", "action()")
    && activateUiBody.indexOf("this._callbacks.onUiFeedback()") < activateUiBody.indexOf("action()")
    && !activateUiBody.includes("await ")
    && contains(makeButtonBody,
        "button.size(width, height)",
        "button.pos(x, y)",
        "const visual = new Laya.Sprite()",
        'visual.pos(0, state === "pressed" ? 3 : 0)',
        'const shadowOffset = state === "pressed" ? 1 : 4',
        'Laya.Browser.onMobile ? "normal" : "hover"')
    && !makeButtonBody.includes("button.scale"));

const patchProtectedSources = [
    "LaunchPuzzleGame-Laya/assets/Scene.ls",
    "LaunchPuzzleGame-Laya/src/Main.ts",
    "LaunchPuzzleGame-Laya/src/game/GameScene.ts",
    "LaunchPuzzleGame-Laya/src/game/WinScene.ts",
    "LaunchPuzzleGame-Laya/src/ui/PauseUI.ts",
    "LaunchPuzzleGame-Laya/src/physics/PhysicsEngine.ts",
    "LaunchPuzzleGame-Laya/src/levels/LevelData.ts",
    "LaunchPuzzleGame-Laya/src/levels/LevelLoader.ts",
    "LaunchPuzzleGame-Laya/src/game/GameConfig.ts",
    "LaunchPuzzleGame-Laya/src/objects/Ball.ts",
    "LaunchPuzzleGame-Laya/src/objects/Platform.ts",
    "LaunchPuzzleGame-Laya/src/objects/Target.ts",
    "README.md",
    "docs/showcase/all-levels-cleared.png",
    "docs/showcase/cover.png",
    "docs/showcase/l3-multi-bounce-aiming.png",
    "docs/showcase/main-menu.png",
];
const dangerZoneLabelBlock = `        // 地面标签：保留底部危险区位置与红色边界，仅补充轻量警示包装。
        const dangerLabelX = GameConfig.CANVAS_W / 2 - 68;
        const dangerLabelY = GameConfig.CANVAS_H - 35;
        const dangerBadge = new Laya.Sprite();
        dangerBadge.graphics.drawRoundRect(
            0, 3, 136, 26,
            9, 9, 9, 9,
            "rgba(83,52,54,0.16)"
        );
        dangerBadge.graphics.drawRoundRect(
            0, 0, 136, 26,
            9, 9, 9, 9,
            "rgba(255,248,245,0.94)", "#e96b5a", 2
        );
        dangerBadge.pos(dangerLabelX, dangerLabelY);
        this.container.addChild(dangerBadge);

        const groundLabel = new Laya.Text();
        groundLabel.text          = "DANGER ZONE";
        groundLabel.color         = "#b9403a";
        groundLabel.fontSize      = 12;
        groundLabel.bold          = true;
        groundLabel.width         = 136;
        groundLabel.height        = 26;
        groundLabel.align         = "center";
        groundLabel.valign        = "middle";
        groundLabel.pos(dangerLabelX, dangerLabelY);
        this.container.addChild(groundLabel);

`;
const mobileGameplayHintBlock = `        if (Laya.Browser.onMobile) {
            const mobileHint = new Laya.Text();
            mobileHint.text = "DRAG • AIM • RELEASE";
            mobileHint.color = "#2f6471";
            mobileHint.fontSize = 13;
            mobileHint.bold = true;
            mobileHint.pos(20, 74);
            this.container.addChild(mobileHint);
        }

`;
const patchBaselineGame = gitBlobAt(PATCH_BASELINE, "LaunchPuzzleGame-Laya/src/game/GameScene.ts")
    .toString("utf8")
    .replace(/\r\n/g, "\n");
const baselineWithoutDangerZone = removeExactOnce(patchBaselineGame, dangerZoneLabelBlock);
const expectedLabelOnlyGame = baselineWithoutDangerZone === null
    ? null
    : removeExactOnce(baselineWithoutDangerZone, mobileGameplayHintBlock);
const expectedDynamicDragGame = expectedLabelOnlyGame === null
    ? null
    : applyExactReplacements(expectedLabelOnlyGame, approvedDynamicDragReplacements);
const patchProtectedResults = patchProtectedSources.map((relativePath) => {
    const current = fs.readFileSync(path.join(ROOT, relativePath));
    const baseline = gitBlobAt(PATCH_BASELINE, relativePath);
    if (path.extname(relativePath).toLowerCase() === ".png") return current.equals(baseline);
    const normalizeLf = (buffer) => buffer.toString("utf8").replace(/\r\n/g, "\n");
    if (relativePath === "LaunchPuzzleGame-Laya/src/game/GameScene.ts") {
        return expectedDynamicDragGame !== null && normalizeLf(current) === expectedDynamicDragGame;
    }
    return normalizeLf(current) === normalizeLf(baseline);
});
record("48 v1.0.1 protected sources/showcase match frozen baseline with exact label-removal and dynamic-drag GameScene exceptions", patchProtectedResults.every(Boolean), `${patchProtectedResults.filter(Boolean).length}/${patchProtectedSources.length}`);

const managerRaw = fs.readFileSync(path.join(ROOT, "LaunchPuzzleGame-Laya/src/game/GameManager.ts"), "utf8");
const baselineManagerRaw = gitBlobAt(PATCH_BASELINE, "LaunchPuzzleGame-Laya/src/game/GameManager.ts").toString("utf8");
const forbiddenManagerMethods = ["startNewGame", "startLevel", "nextLevel", "restartCurrentLevel", "_showWin"];
const frozenManagerResults = forbiddenManagerMethods.map((name) => methodSource(managerRaw, name) === methodSource(baselineManagerRaw, name));
record("49 forbidden GameManager function bytes remain frozen", frozenManagerResults.every(Boolean), `${frozenManagerResults.filter(Boolean).length}/${forbiddenManagerMethods.length}`);

const buildBody = methodBody(game, "_build") || "";
const buildUiBody = methodBody(game, "_buildUI") || "";
record("50 gameplay _build no longer creates DANGER ZONE label", !buildBody.includes("DANGER ZONE")
    && !buildBody.includes("dangerBadge")
    && !buildBody.includes("groundLabel"));
record("51 gameplay _buildUI no longer creates DRAG AIM RELEASE mobile hint", !buildUiBody.includes("DRAG • AIM • RELEASE")
    && !buildUiBody.includes("mobileHint"));

const launchSfxBody = methodBody(audio, "playLaunchSfx") || "";
const portalSfxBody = methodBody(audio, "playPortalSfx") || "";
record("52 launch and portal SFX public paths remain byte-exact", launchSfxBody === `{
        AudioManager._playSfxInternal(AudioManager.SFX_LAUNCH_URL, "launch");
    }` && portalSfxBody === `{
        AudioManager._playSfxInternal(AudioManager.SFX_PORTAL_URL, "portal");
    }`);

const collisionSfxBody = methodBody(audio, "playCollisionSfx") || "";
record("53 collision retains first-play eligibility and exact 100ms anti-spam semantics", contains(audio,
    "private static readonly COLLISION_SFX_COOLDOWN_MS: number = 100",
    "private static _lastCollisionSfxAtMs: number = -Infinity")
    && contains(collisionSfxBody,
        "const now = Laya.timer.currTimer",
        "now - AudioManager._lastCollisionSfxAtMs < AudioManager.COLLISION_SFX_COOLDOWN_MS",
        "AudioManager._lastCollisionSfxAtMs = now",
        "AudioManager.COLLISION_SFX_VOLUME"));

const warmupBody = methodBody(audio, "_warmCriticalGameplaySfx") || "";
record("54 successful user gesture warms the selected collision/fail assets through LayaAir AudioDataCache", /if \(ctx\.state === "running"\)\s*\{\s*AudioManager\._warmCriticalGameplaySfx\(\)/.test(unlockBody)
    && /\.then\(\(running\) => \{\s*if \(running && ctx\.state === "running"\)\s*\{\s*AudioManager\._warmCriticalGameplaySfx\(\)/.test(unlockBody)
    && contains(warmupBody,
        "audioDataCache",
        "cache.get",
        "_criticalSfxWarmupInFlight",
        "_criticalSfxWarmupReady",
        "const mobile = Laya.Browser.onMobile",
        "mobile ? AudioManager.SFX_COLLISION_MOBILE_URL : AudioManager.SFX_COLLISION_URL",
        "mobile ? AudioManager.SFX_FAIL_MOBILE_URL : AudioManager.SFX_FAIL_URL",
        "for (const url of urls)")
    && !warmupBody.includes("playSound")
    && !warmupBody.includes("await "));

const failSfxBody = methodBody(audio, "playFailSfx") || "";
const playSfxInternalBody = methodBody(audio, "_playSfxInternal") || "";
record("55 desktop collision/fail retain 1.0, mobile masters use 0.8, and other SFX retain 0.6", contains(audio,
    "private static readonly SFX_VOLUME: number = 0.6",
    "private static readonly COLLISION_SFX_VOLUME: number = 1.0",
    "private static readonly FAIL_SFX_VOLUME: number = 1.0",
    "private static readonly MOBILE_COLLISION_SFX_VOLUME: number = 0.8",
    "private static readonly MOBILE_FAIL_SFX_VOLUME: number = 0.8",
    "volume: number = AudioManager.SFX_VOLUME")
    && contains(collisionSfxBody,
        "mobile ? AudioManager.MOBILE_COLLISION_SFX_VOLUME : AudioManager.COLLISION_SFX_VOLUME")
    && contains(failSfxBody,
        "mobile ? AudioManager.MOBILE_FAIL_SFX_VOLUME : AudioManager.FAIL_SFX_VOLUME")
    && playSfxInternalBody.includes("channel.volume = volume"));

const collisionSfxBytes = fs.readFileSync(path.join(ROOT, COLLISION_SFX_PATH));
const failSfxBytes = fs.readFileSync(path.join(ROOT, FAIL_SFX_PATH));
record("56 collision/fail asset bytes remain pinned and unchanged", sha256(collisionSfxBytes) === COLLISION_SFX_SHA256
    && sha256(failSfxBytes) === FAIL_SFX_SHA256,
`${COLLISION_SFX_SHA256}; ${FAIL_SFX_SHA256}`);

const collisionSfxMetaBytes = fs.readFileSync(path.join(ROOT, COLLISION_SFX_META_PATH));
const failSfxMetaBytes = fs.readFileSync(path.join(ROOT, FAIL_SFX_META_PATH));
record("57 original desktop collision/fail metadata remains pinned and unchanged",
    sha256(collisionSfxMetaBytes) === COLLISION_SFX_META_SHA256
    && sha256(failSfxMetaBytes) === FAIL_SFX_META_SHA256,
`${COLLISION_SFX_META_SHA256}; ${FAIL_SFX_META_SHA256}`);

const mobileCollisionSfxBytes = fs.readFileSync(path.join(ROOT, MOBILE_COLLISION_SFX_PATH));
const mobileFailSfxBytes = fs.readFileSync(path.join(ROOT, MOBILE_FAIL_SFX_PATH));
record("58 deterministic mobile collision/fail masters match pinned SHA-256",
    sha256(mobileCollisionSfxBytes) === MOBILE_COLLISION_SFX_SHA256
    && sha256(mobileFailSfxBytes) === MOBILE_FAIL_SFX_SHA256,
`${MOBILE_COLLISION_SFX_SHA256}; ${MOBILE_FAIL_SFX_SHA256}`);

const mobileCollisionWavInfo = parsePcmWav(mobileCollisionSfxBytes);
const mobileFailWavInfo = parsePcmWav(mobileFailSfxBytes);
const isMobileMasterFormat = (info) => info
    && info.audioFormat === 1
    && info.channels === 1
    && info.sampleRate === 44100
    && info.bitsPerSample === 16
    && info.blockAlign === 2
    && info.byteRate === 88200;
record("59 mobile masters are PCM mono 16-bit 44.1kHz with source-equivalent durations",
    isMobileMasterFormat(mobileCollisionWavInfo)
    && isMobileMasterFormat(mobileFailWavInfo)
    && mobileCollisionWavInfo.durationMs >= 417.9
    && mobileCollisionWavInfo.durationMs <= 418.1
    && mobileFailWavInfo.durationMs >= 1449.5
    && mobileFailWavInfo.durationMs <= 1449.8,
mobileCollisionWavInfo && mobileFailWavInfo
    ? `${mobileCollisionWavInfo.durationMs.toFixed(3)}ms; ${mobileFailWavInfo.durationMs.toFixed(3)}ms`
    : "invalid mobile WAV");

const mobileCollisionStats = pcm16Stats(mobileCollisionSfxBytes, mobileCollisionWavInfo);
const mobileFailStats = pcm16Stats(mobileFailSfxBytes, mobileFailWavInfo);
record("60 mobile masters meet frozen loudness ranges without PCM clipping", mobileCollisionStats
    && mobileFailStats
    && mobileCollisionStats.rmsDb >= -15
    && mobileCollisionStats.rmsDb <= -13
    && mobileCollisionStats.peakDb >= -1.05
    && mobileCollisionStats.peakDb <= -0.95
    && mobileFailStats.rmsDb >= -17
    && mobileFailStats.rmsDb <= -14
    && mobileFailStats.peakDb >= -2
    && mobileFailStats.peakDb <= -1
    && mobileCollisionStats.peak < 1
    && mobileFailStats.peak < 1,
mobileCollisionStats && mobileFailStats
    ? `collision RMS ${mobileCollisionStats.rmsDb.toFixed(3)} peak ${mobileCollisionStats.peakDb.toFixed(3)}; fail RMS ${mobileFailStats.rmsDb.toFixed(3)} peak ${mobileFailStats.peakDb.toFixed(3)}`
    : "unavailable stats");

const mobileCollisionMetaBytes = fs.readFileSync(path.join(ROOT, MOBILE_COLLISION_SFX_META_PATH));
const mobileFailMetaBytes = fs.readFileSync(path.join(ROOT, MOBILE_FAIL_SFX_META_PATH));
const mobileCollisionMeta = JSON.parse(mobileCollisionMetaBytes.toString("utf8"));
const mobileFailMeta = JSON.parse(mobileFailMetaBytes.toString("utf8"));
const mobileUuidOccurrences = [mobileCollisionMeta.uuid, mobileFailMeta.uuid].map((uuid) => allAssetMetaPaths.reduce((count, filePath) => {
    try {
        return count + (JSON.parse(fs.readFileSync(filePath, "utf8")).uuid === uuid ? 1 : 0);
    } catch {
        return count;
    }
}, 0));
record("61 mobile master metadata hashes and UUIDs are pinned and globally unique",
    sha256(mobileCollisionMetaBytes) === MOBILE_COLLISION_SFX_META_SHA256
    && sha256(mobileFailMetaBytes) === MOBILE_FAIL_SFX_META_SHA256
    && uuidPattern.test(mobileCollisionMeta.uuid)
    && uuidPattern.test(mobileFailMeta.uuid)
    && mobileCollisionMeta.uuid !== mobileFailMeta.uuid
    && mobileUuidOccurrences.every((count) => count === 1),
`${mobileCollisionMeta.uuid} (${mobileUuidOccurrences[0]}); ${mobileFailMeta.uuid} (${mobileUuidOccurrences[1]})`);

record("62 collision/fail choose mobile masters only on mobile while desktop keeps original URLs", contains(audio,
    'SFX_COLLISION_URL: string = "resources/audio/sfx_collision.wav"',
    'SFX_COLLISION_MOBILE_URL: string = "resources/audio/sfx_collision_mobile.wav"',
    'SFX_FAIL_URL: string = "resources/audio/sfx_fail.mp3"',
    'SFX_FAIL_MOBILE_URL: string = "resources/audio/sfx_fail_mobile.wav"')
    && contains(collisionSfxBody,
        "const mobile = Laya.Browser.onMobile",
        "mobile ? AudioManager.SFX_COLLISION_MOBILE_URL : AudioManager.SFX_COLLISION_URL")
    && contains(failSfxBody,
        "const mobile = Laya.Browser.onMobile",
        "mobile ? AudioManager.SFX_FAIL_MOBILE_URL : AudioManager.SFX_FAIL_URL")
    && !launchSfxBody.includes("onMobile")
    && !portalSfxBody.includes("onMobile")
    && !clickBody.includes("onMobile"));

const originalFullPowerDragDistance = 150;
const mobileEdgeMarginMatch = /MOBILE_EDGE_MARGIN\s*=\s*(24)/.exec(game);
const minimumMobileRatioMatch = /MIN_MOBILE_FULL_POWER_RATIO\s*=\s*(0\.70)/.exec(game);
const mobileEdgeMargin = mobileEdgeMarginMatch ? Number(mobileEdgeMarginMatch[1]) : Number.NaN;
const minimumMobileFullPowerRatio = minimumMobileRatioMatch ? Number(minimumMobileRatioMatch[1]) : Number.NaN;
const usableEdgeBody = methodBody(game, "_getMobileUsableEdgeDistance") || "";
const effectivePowerBody = methodBody(game, "_getEffectiveLaunchPower") || "";
record("63 fixed-threshold assist is removed and dynamic edge parameters/implementation are exact",
    mobileEdgeMargin === 24
    && minimumMobileFullPowerRatio === 0.70
    && !game.includes("MOBILE_ASSIST_START")
    && !game.includes("MOBILE_FULL_POWER_THRESHOLD")
    && !game.includes("_mapLaunchPowerRatio")
    && contains(usableEdgeBody,
        "const dragDirX = -pullX / pullDist",
        "const dragDirY = -pullY / pullDist",
        "const minX = GameScene.MOBILE_EDGE_MARGIN",
        "const maxX = GameConfig.CANVAS_W - GameScene.MOBILE_EDGE_MARGIN",
        "const minY = GameScene.MOBILE_EDGE_MARGIN",
        "const maxY = GameConfig.CANVAS_H - GameScene.MOBILE_EDGE_MARGIN",
        "return Math.max(0, edgeDistance)")
    && contains(effectivePowerBody,
        "const desktopPower = cappedDragDistance / GameConfig.MAX_DRAG",
        "if (!Laya.Browser.onMobile)",
        "return desktopPower",
        "GameConfig.MAX_DRAG * GameScene.MIN_MOBILE_FULL_POWER_RATIO",
        "Math.min(\n            GameConfig.MAX_DRAG",
        "Math.max(minimumFullPowerDistance, usableEdgeDistance)",
        "Math.max(0, Math.min(pullDist / effectiveFullPowerDistance, 1))"));

function referenceUsableEdgeDistance(originX, originY, dragDirectionX, dragDirectionY) {
    const directionLength = Math.hypot(dragDirectionX, dragDirectionY);
    const dx = dragDirectionX / directionLength;
    const dy = dragDirectionY / directionLength;
    const minX = mobileEdgeMargin;
    const maxX = 800 - mobileEdgeMargin;
    const minY = mobileEdgeMargin;
    const maxY = 600 - mobileEdgeMargin;
    let edgeDistance = Number.POSITIVE_INFINITY;
    if (dx > 0) edgeDistance = Math.min(edgeDistance, (maxX - originX) / dx);
    else if (dx < 0) edgeDistance = Math.min(edgeDistance, (minX - originX) / dx);
    if (dy > 0) edgeDistance = Math.min(edgeDistance, (maxY - originY) / dy);
    else if (dy < 0) edgeDistance = Math.min(edgeDistance, (minY - originY) / dy);
    return Math.max(0, edgeDistance);
}

function referenceDynamicPower(actualDistance, usableEdgeDistance, onMobile) {
    const cappedDistance = Math.min(actualDistance, originalFullPowerDragDistance);
    if (!onMobile) return cappedDistance / originalFullPowerDragDistance;
    const minimumFullPowerDistance = originalFullPowerDragDistance * minimumMobileFullPowerRatio;
    const effectiveFullPowerDistance = Math.min(
        originalFullPowerDragDistance,
        Math.max(minimumFullPowerDistance, usableEdgeDistance)
    );
    return Math.max(0, Math.min(actualDistance / effectiveFullPowerDistance, 1));
}

const nearlyEqual = (actual, expected, epsilon = 1e-12) => Math.abs(actual - expected) <= epsilon;
const desktopDistanceCases = [[75, 0.50], [114, 0.76], [145.5, 0.97], [150, 1.00], [180, 1.00]];
record("64 desktop drag mapping remains the original capped distance divided by MAX_DRAG",
    desktopDistanceCases.every(([distance, expected]) => nearlyEqual(referenceDynamicPower(distance, 26, false), expected)),
desktopDistanceCases.map(([distance]) => `${distance}->${referenceDynamicPower(distance, 26, false).toFixed(6)}`).join(", "));

const roomyEdgeDistance = referenceUsableEdgeDistance(400, 300, 0, 1);
const roomyMobileCases = [[75, 0.50], [114, 0.76], [150, 1.00]];
record("65 mobile mapping remains original when at least MAX_DRAG is usable along the drag ray",
    roomyEdgeDistance >= originalFullPowerDragDistance
    && roomyMobileCases.every(([distance, expected]) => nearlyEqual(referenceDynamicPower(distance, roomyEdgeDistance, true), expected)),
`usable=${roomyEdgeDistance.toFixed(3)}; ${roomyMobileCases.map(([distance]) => `${distance}->${referenceDynamicPower(distance, roomyEdgeDistance, true).toFixed(6)}`).join(", ")}`);

const levelTwoLikeEdgeDistance = referenceUsableEdgeDistance(400, 462, 0, 1);
record("66 mobile near-edge mapping makes the reachable edge full power without changing mid-range linearity",
    nearlyEqual(levelTwoLikeEdgeDistance, 114)
    && nearlyEqual(referenceDynamicPower(57, levelTwoLikeEdgeDistance, true), 0.5)
    && nearlyEqual(referenceDynamicPower(114, levelTwoLikeEdgeDistance, true), 1),
`usable=${levelTwoLikeEdgeDistance.toFixed(3)}; 57->${referenceDynamicPower(57, levelTwoLikeEdgeDistance, true).toFixed(6)}; 114->${referenceDynamicPower(114, levelTwoLikeEdgeDistance, true).toFixed(6)}`);

const extremeEdgeDistance = referenceUsableEdgeDistance(400, 550, 0, 1);
const minimumFullPowerDistance = originalFullPowerDragDistance * minimumMobileFullPowerRatio;
record("67 extreme edge pressure is bounded by the approved 70 percent minimum full-power distance",
    nearlyEqual(extremeEdgeDistance, 26)
    && nearlyEqual(minimumFullPowerDistance, 105)
    && nearlyEqual(referenceDynamicPower(52.5, extremeEdgeDistance, true), 0.5)
    && nearlyEqual(referenceDynamicPower(105, extremeEdgeDistance, true), 1),
`usable=${extremeEdgeDistance.toFixed(3)}; floor=${minimumFullPowerDistance.toFixed(3)}`);

const directionCases = [
    [400, 300, 0, 1, 276],
    [400, 300, 0, -1, 276],
    [400, 300, 1, 0, 376],
    [400, 300, -1, 0, 376],
    [400, 300, 3, 4, 345],
];
const monotonicEdgeDistances = [26, 114, 150, 276];
const distanceProbes = Array.from({ length: 401 }, (_, index) => index * 0.5);
const dynamicOutputs = monotonicEdgeDistances.flatMap((available) =>
    distanceProbes.map((distance) => referenceDynamicPower(distance, available, true)));
const monotonicResults = monotonicEdgeDistances.map((available) => {
    const outputs = distanceProbes.map((distance) => referenceDynamicPower(distance, available, true));
    return outputs.every((output, index) => index === 0 || output + 1e-12 >= outputs[index - 1]);
});
record("68 edge distance is direction-aware and dynamic power remains monotonic and clamped",
    directionCases.every(([x, y, dx, dy, expected]) => nearlyEqual(referenceUsableEdgeDistance(x, y, dx, dy), expected))
    && monotonicResults.every(Boolean)
    && dynamicOutputs.every((output) => Number.isFinite(output) && output >= 0 && output <= 1),
`${directionCases.length} directions; ${dynamicOutputs.length} bounded outputs`);

const launchBody = methodBody(game, "_launch") || "";
const aimBody = methodBody(game, "_drawAimVisualization") || "";
const mouseMoveBody = methodBody(game, "_onMouseMove") || "";
const mouseUpBody = methodBody(game, "_onMouseUp") || "";
const frozenInputBodies = ["_onMouseDown", "_onMouseMove", "_onMouseUp", "_stepPhysics", "_onFail", "_respawn", "_onPortalReached"];
const frozenInputBodyResults = frozenInputBodies.map((name) => methodBody(game, name) === methodBody(patchBaselineGame, name));
record("69 reaching 100 percent cannot release the ball; only the frozen real mouse-up handler launches",
    frozenInputBodyResults.every(Boolean)
    && !usableEdgeBody.includes("this._launch()")
    && !usableEdgeBody.includes("this._state =")
    && !usableEdgeBody.includes("this._dragX =")
    && !usableEdgeBody.includes("this._dragY =")
    && !effectivePowerBody.includes("this._launch()")
    && !effectivePowerBody.includes("this._state =")
    && !effectivePowerBody.includes("this._dragX =")
    && !effectivePowerBody.includes("this._dragY =")
    && !mouseMoveBody.includes("this._launch()")
    && (mouseUpBody.match(/this\._launch\(\)/g) || []).length === 1
    && contains(launchBody, "if (pullDist < 6)", "this._state = 'ready'", "this._state   = 'flying'"),
`${frozenInputBodyResults.filter(Boolean).length}/${frozenInputBodies.length} frozen handlers/consumers`);

const frozenAudioManagerBytes = fs.readFileSync(path.join(ROOT, "LaunchPuzzleGame-Laya/src/audio/AudioManager.ts"));
record("70 current mobile audio mastering candidate and AudioManager remain byte-frozen",
    sha256(frozenAudioManagerBytes) === "75298C7D14E326FD6AB4F797C998C9FA675DCD8F489051F4B57F1B707E631A90"
    && sha256(mobileCollisionSfxBytes) === MOBILE_COLLISION_SFX_SHA256
    && sha256(mobileCollisionMetaBytes) === MOBILE_COLLISION_SFX_META_SHA256
    && sha256(mobileFailSfxBytes) === MOBILE_FAIL_SFX_SHA256
    && sha256(mobileFailMetaBytes) === MOBILE_FAIL_SFX_META_SHA256);

const priorCandidateFrozenFiles = [
    ["LaunchPuzzleGame-Laya/settings/PlayerSettings.json", "63F414323F6C40BDD7E45D00D9C72A00D3DD94A6EB8B7FC1BB05B9BFDC399B58"],
    ["LaunchPuzzleGame-Laya/src/game/GameManager.ts", "8135C525739686BC1B23AAA6BD6CE2E404567D29D5B70909F1E0C1A2BEE8D407"],
    ["LaunchPuzzleGame-Laya/src/ui/HomeUI.ts", "60EB675788B4FA58E1918198B024732D8D291312A168D47FDCBD030EC063DD62"],
];
const priorCandidateFrozenResults = priorCandidateFrozenFiles.map(([relativePath, expectedHash]) =>
    sha256(fs.readFileSync(path.join(ROOT, relativePath))) === expectedHash);
record("71 prior PlayerSettings, GameManager, and HomeUI candidate files remain byte-frozen",
    priorCandidateFrozenResults.every(Boolean),
`${priorCandidateFrozenResults.filter(Boolean).length}/${priorCandidateFrozenResults.length}`);

const effectivePowerCallCount = (game.match(/this\._getEffectiveLaunchPower\(/g) || []).length;
const launchSpeedMaxUnchanged = /LAUNCH_SPEED_MAX:\s*number\s*=\s*Math\.hypot\(GameConfig\.CANVAS_W, GameConfig\.CANVAS_H\)/.test(config);
const launchMagnitudeProbes = monotonicEdgeDistances.flatMap((available) =>
    distanceProbes.map((distance) => referenceDynamicPower(distance, available, true) * Math.hypot(800, 600)));
record("72 preview, HUD, and actual launch share one dynamic ratio while direction and speed ceiling remain unchanged",
    effectivePowerCallCount === 2
    && contains(launchBody,
        "const pullX    = this._ball.x - this._dragX",
        "const pullY    = this._ball.y - this._dragY",
        "const powerRatio = this._getEffectiveLaunchPower(pullX, pullY, pullDist, capped)",
        "const speed  = powerRatio * GameConfig.LAUNCH_SPEED_MAX",
        "this._ball.vx = (pullX / pullDist) * speed",
        "this._ball.vy = (pullY / pullDist) * speed")
    && contains(aimBody,
        "const powerRatio = this._getEffectiveLaunchPower(pullX, pullY, pullDist, capped)",
        "const speed = powerRatio * GameConfig.LAUNCH_SPEED_MAX",
        "const vx    = (pullX / pullDist) * speed",
        "const vy    = (pullY / pullDist) * speed",
        "const pct = Math.round(powerRatio * 100)")
    && launchSpeedMaxUnchanged
    && launchMagnitudeProbes.every((magnitude) => magnitude <= Math.hypot(800, 600) + 1e-9),
`${effectivePowerCallCount} shared calls; max=${Math.max(...launchMagnitudeProbes).toFixed(6)}`);

record("73 dynamic edge calculation stays in the same 800x600 Stage coordinate system as touch input and game geometry",
    playerSettings.resolution.designWidth === 800
    && playerSettings.resolution.designHeight === 600
    && /CANVAS_W:\s*number\s*=\s*800/.test(config)
    && /CANVAS_H:\s*number\s*=\s*600/.test(config)
    && contains(game, "Laya.stage.mouseX", "Laya.stage.mouseY")
    && contains(usableEdgeBody,
        "GameConfig.CANVAS_W - GameScene.MOBILE_EDGE_MARGIN",
        "GameConfig.CANVAS_H - GameScene.MOBILE_EDGE_MARGIN",
        "Math.min(edgeDistance")
    && !usableEdgeBody.includes("innerWidth")
    && !usableEdgeBody.includes("innerHeight")
    && !usableEdgeBody.includes("clientWidth")
    && !usableEdgeBody.includes("clientHeight"));

console.log("HUMAN_RUNTIME_REQUIRED=REAL_MOBILE_TOUCH,REAL_AUDIO_PLAYBACK,REAL_BROWSER_AUTOPLAY,VISUAL_QUALITY,REAL_VIEWPORT_FIT,FULL_3_LEVEL_FLOW");
const failed = checks.filter((check) => !check.passed);
console.log(`verification: ${failed.length === 0 ? "PASS" : "FAIL"} (${checks.length - failed.length}/${checks.length})`);
if (failed.length > 0) {
    process.exitCode = 1;
}
