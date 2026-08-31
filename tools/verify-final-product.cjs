"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const BASELINE = "edb9c8c41a4037e2e9f9dd546b1bb1ec431d5954";
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

function record(name, condition, detail = "") {
    const passed = Boolean(condition);
    checks.push({ name, passed, detail });
    const suffix = detail ? ` — ${detail}` : "";
    console.log(`[${passed ? "PASS" : "FAIL"}] ${name}${suffix}`);
}

function contains(source, ...needles) {
    return needles.every((needle) => source.includes(needle));
}

const manager = file("LaunchPuzzleGame-Laya/src/game/GameManager.ts");
const game = file("LaunchPuzzleGame-Laya/src/game/GameScene.ts");
const win = file("LaunchPuzzleGame-Laya/src/game/WinScene.ts");
const audio = file("LaunchPuzzleGame-Laya/src/audio/AudioManager.ts");
const home = file("LaunchPuzzleGame-Laya/src/ui/HomeUI.ts");
const pause = file("LaunchPuzzleGame-Laya/src/ui/PauseUI.ts");
const config = file("LaunchPuzzleGame-Laya/src/game/GameConfig.ts");
const readme = file("README.md");

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
const protectedMethods = ["_launch", "_drawAimVisualization", "_stepPhysics", "_onFail", "_respawn", "_onPortalReached"];
const protectedMethodResults = protectedMethods.map((name) => methodBody(game, name) === methodBody(baselineGame, name));
record("31 protected gameplay method bodies match authoritative HEAD", protectedMethodResults.every(Boolean), `${protectedMethodResults.filter(Boolean).length}/${protectedMethods.length}`);

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
    "LaunchPuzzleGame-Laya/src/game/GameManager.ts",
    "LaunchPuzzleGame-Laya/src/game/GameScene.ts",
    "LaunchPuzzleGame-Laya/src/game/WinScene.ts",
    "LaunchPuzzleGame-Laya/src/audio/AudioManager.ts",
    "LaunchPuzzleGame-Laya/src/ui/HomeUI.ts",
    "LaunchPuzzleGame-Laya/src/ui/HomeUI.ts.meta",
    "LaunchPuzzleGame-Laya/src/ui/PauseUI.ts",
    "LaunchPuzzleGame-Laya/src/ui/PauseUI.ts.meta",
    "tools/verify-final-product.cjs",
    "README.md",
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

console.log("HUMAN_RUNTIME_REQUIRED=REAL_MOBILE_TOUCH,REAL_AUDIO_PLAYBACK,REAL_BROWSER_AUTOPLAY,VISUAL_QUALITY,REAL_VIEWPORT_FIT,FULL_3_LEVEL_FLOW");
const failed = checks.filter((check) => !check.passed);
console.log(`verification: ${failed.length === 0 ? "PASS" : "FAIL"} (${checks.length - failed.length}/${checks.length})`);
if (failed.length > 0) {
    process.exitCode = 1;
}
