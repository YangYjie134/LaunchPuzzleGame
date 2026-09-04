"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __decorateClass = (decorators, target, key, kind) => {
    var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc(target, key) : target;
    for (var i = decorators.length - 1, decorator; i >= 0; i--)
      if (decorator = decorators[i])
        result = (kind ? decorator(target, key, result) : decorator(result)) || result;
    if (kind && result)
      __defProp(target, key, result);
    return result;
  };

  // src/audio/AudioManager.ts
  var _AudioManager = class _AudioManager {
    /**
     * 启动 BGM（幂等）。
     * 多次调用只有第一次生效，用于在 GameScene 首次真实玩家交互（鼠标按下/
     * 拖拽开始）时调用，不必担心 Restart / 切关 / 重新构建场景时被重复调用
     * 导致多层叠加。
     */
    static playBgmOnce() {
      if (_AudioManager._bgmStarted) {
        return;
      }
      _AudioManager._bgmStarted = true;
      _AudioManager._playInternal();
    }
    /** 封面用户手势：停止当前 music 通道，并从头播放同一首 BGM。 */
    static restartBgm() {
      _AudioManager.stopBgm();
      _AudioManager.playBgmOnce();
    }
    /**
     * 停止 BGM。
     * 当前验收范围内没有强制停止的场景（WinScene 允许 BGM 继续播放），
     * 保留此接口供后续扩展（例如未来加入静音开关）使用。
     */
    static stopBgm() {
      Laya.SoundManager.stopMusic();
      _AudioManager._bgmStarted = false;
    }
    /** Toggle the engine-wide session mute without stopping or re-unlocking BGM. */
    static toggleMute() {
      Laya.SoundManager.muted = !Laya.SoundManager.muted;
      return Laya.SoundManager.muted;
    }
    /** Current engine-wide mute state for menu/gameplay/win presentation. */
    static isMuted() {
      return Laya.SoundManager.muted;
    }
    /** 有效发射后播放一次；短拖拽取消不会调用本接口 */
    static playLaunchSfx() {
      _AudioManager._playSfxInternal(_AudioManager.SFX_LAUNCH_URL, "launch");
    }
    /**
     * 墙体或平台碰撞后播放一次。
     * 100ms 冷却阻止同一帧多个固定步长或持续接触造成的碰撞音效刷屏。
     */
    static playCollisionSfx() {
      const now = Laya.timer.currTimer;
      if (now - _AudioManager._lastCollisionSfxAtMs < _AudioManager.COLLISION_SFX_COOLDOWN_MS) {
        return;
      }
      _AudioManager._lastCollisionSfxAtMs = now;
      _AudioManager._playSfxInternal(_AudioManager.SFX_COLLISION_URL, "collision");
    }
    /** 进入传送门并切换到 completed 状态时播放一次 */
    static playPortalSfx() {
      _AudioManager._playSfxInternal(_AudioManager.SFX_PORTAL_URL, "portal");
    }
    /** 进入 respawning 失败状态时播放一次 */
    static playFailSfx() {
      _AudioManager._playSfxInternal(_AudioManager.SFX_FAIL_URL, "fail");
    }
    // ── 内部 ──────────────────────────────────────────────────────
    static _playInternal() {
      Laya.SoundManager.musicVolume = _AudioManager.BGM_VOLUME;
      try {
        Laya.SoundManager.playMusic(_AudioManager.BGM_URL, 0);
      } catch (e) {
        console.warn("[AudioManager] BGM playback failed, will not retry automatically:", e);
      }
    }
    static _playSfxInternal(url, label) {
      try {
        const channel = Laya.SoundManager.playSound(url, 1);
        channel.volume = _AudioManager.SFX_VOLUME;
      } catch (e) {
        console.warn(`[AudioManager] ${label} SFX playback failed:`, e);
      }
    }
  };
  /** BGM 资源路径。相对 assets 根目录，与项目现有 assets/resources 资源习惯保持一致 */
  _AudioManager.BGM_URL = "resources/audio/bgm.mp3";
  /** 已批准 SFX 的运行时资源路径 */
  _AudioManager.SFX_LAUNCH_URL = "resources/audio/sfx_launch.mp3";
  _AudioManager.SFX_COLLISION_URL = "resources/audio/sfx_collision.wav";
  _AudioManager.SFX_PORTAL_URL = "resources/audio/sfx_portal.wav";
  _AudioManager.SFX_FAIL_URL = "resources/audio/sfx_fail.mp3";
  /** 低音量循环播放，避免刺耳、避免抢游戏反馈音效的听觉空间 */
  _AudioManager.BGM_VOLUME = 0.22;
  /** SFX 使用独立声道音量，不修改 BGM 的 musicVolume */
  _AudioManager.SFX_VOLUME = 0.6;
  /** 固定步长物理可能在很短时间内连续上报碰撞；冷却用于避免声音堆叠 */
  _AudioManager.COLLISION_SFX_COOLDOWN_MS = 100;
  /** 是否已经启动过 BGM；true 之后 playBgmOnce() 直接短路，防止重复叠加播放 */
  _AudioManager._bgmStarted = false;
  /** 最近一次实际触发碰撞音效的引擎时间 */
  _AudioManager._lastCollisionSfxAtMs = -Infinity;
  var AudioManager = _AudioManager;

  // src/levels/LevelLoader.ts
  var LEVEL_1 = {
    name: "Level 1",
    launchPoint: { x: 120, y: 470 },
    target: { x: 650, y: 420, radius: 28 },
    platforms: [],
    hint: "Drag the energy orb to charge"
  };
  var LEVEL_2 = {
    name: "Level 2",
    launchPoint: { x: 120, y: 470 },
    target: { x: 680, y: 150, radius: 26 },
    platforms: [
      // 中部横板：挡在直线弹道上，引导玩家借助反弹把球送往右上角目标
      { x: 420, y: 300, w: 180, h: 20, color: "#2244aa" }
    ],
    hint: "Bank the orb off the platform"
  };
  var LEVEL_3 = {
    name: "Level 3",
    launchPoint: { x: 120, y: 470 },
    target: { x: 440, y: 320, radius: 24 },
    platforms: [
      { x: 180, y: 420, w: 260, h: 20, color: "#2244aa" },
      { x: 480, y: 250, w: 20, h: 180, color: "#2244aa" },
      { x: 150, y: 180, w: 220, h: 20, color: "#2244aa" }
    ],
    hint: "Chain multiple bounces to reach the portal"
  };
  var _LevelLoader = class _LevelLoader {
    /** 关卡总数（GameManager 后续应以此为准，而不是另外硬编码） */
    static get count() {
      return _LevelLoader.LEVELS.length;
    }
    /** 判断 index 是否落在合法关卡范围内 */
    static isValidIndex(index) {
      return Number.isInteger(index) && index >= 0 && index < _LevelLoader.LEVELS.length;
    }
    /**
     * 按下标取关卡数据（返回浅拷贝出的独立副本，消费方改 platforms/target/
     * launchPoint 不会污染本文件内的原始关卡数据）。
     *
     * index 越界时显式抛出 RangeError，不再静默回退到第 0 关——越界通常
     * 意味着调用方（GameManager/GameScene）的关卡切换逻辑有 bug，静默兜底
     * 只会把这个 bug 藏起来。不确定 index 是否合法时，请先用 isValidIndex()
     * 判断，或改用 tryGet()。
     */
    static get(index) {
      if (!_LevelLoader.isValidIndex(index)) {
        throw new RangeError(
          `[LevelLoader] level index out of range: ${index} (valid: 0..${_LevelLoader.LEVELS.length - 1})`
        );
      }
      return _LevelLoader._clone(_LevelLoader.LEVELS[index]);
    }
    /** get() 的非抛异常版本：越界时返回 undefined，调用方自行判断 */
    static tryGet(index) {
      if (!_LevelLoader.isValidIndex(index))
        return void 0;
      return _LevelLoader._clone(_LevelLoader.LEVELS[index]);
    }
    /**
     * 浅拷贝一份关卡数据：launchPoint/target 各自是新对象，platforms 是
     * 新数组且数组内每个平台也是新对象，原始 LEVELS 常量永远不会被外部改动影响。
     */
    static _clone(level) {
      const launchPoint = { x: level.launchPoint.x, y: level.launchPoint.y };
      const target = {
        x: level.target.x,
        y: level.target.y,
        radius: level.target.radius
      };
      const platforms = level.platforms.map((p) => ({
        x: p.x,
        y: p.y,
        w: p.w,
        h: p.h,
        color: p.color
      }));
      return {
        name: level.name,
        launchPoint,
        target,
        platforms,
        hint: level.hint
      };
    }
  };
  _LevelLoader.LEVELS = [LEVEL_1, LEVEL_2, LEVEL_3];
  var LevelLoader = _LevelLoader;

  // src/game/GameConfig.ts
  var _GameConfig = class _GameConfig {
  };
  /** 画布宽度 */
  _GameConfig.CANVAS_W = 800;
  /** 画布高度 */
  _GameConfig.CANVAS_H = 600;
  /** 重力加速度（像素/秒²） */
  _GameConfig.GRAVITY = 980;
  /** 弹力系数（0~1，越大越弹） */
  _GameConfig.BOUNCE = 0.65;
  /** 速度衰减系数（每帧乘以此值，模拟摩擦） */
  _GameConfig.FRICTION = 0.995;
  /** 小球半径（像素） */
  _GameConfig.BALL_RADIUS = 12;
  /** 最大蓄力拖拽距离（像素） */
  _GameConfig.MAX_DRAG = 150;
  /** 最大蓄力时的初速度（像素/秒）。MAX_DRAG 拉满时等于此值 */
  _GameConfig.LAUNCH_SPEED_MAX = Math.hypot(_GameConfig.CANVAS_W, _GameConfig.CANVAS_H);
  /** 目标区域半径（像素） */
  _GameConfig.TARGET_RADIUS = 28;
  /** 速度低于此值（像素/秒）且贴近地面时，判定小球停止 */
  _GameConfig.STOP_SPEED = 20;
  /** 关卡总数 */
  _GameConfig.TOTAL_LEVELS = 3;
  var GameConfig = _GameConfig;

  // src/ui/HomeUI.ts
  var HomeUI = class {
    constructor(callbacks) {
      this._interactiveTargets = [];
      this._screen = "cover";
      this._actionLocked = false;
      this._callbacks = callbacks;
      this.container = new Laya.Sprite();
      this.container.size(GameConfig.CANVAS_W, GameConfig.CANVAS_H);
      this.container.mouseEnabled = true;
      this.showCover();
    }
    showCover() {
      this._screen = "cover";
      this._resetScreen();
      this._buildSunnyBackground();
      const topRule = new Laya.Sprite();
      topRule.graphics.drawRoundRect(
        54,
        48,
        692,
        4,
        2,
        2,
        2,
        2,
        "rgba(255,255,255,0.72)"
      );
      topRule.graphics.drawRoundRect(
        54,
        548,
        692,
        4,
        2,
        2,
        2,
        2,
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
        0,
        0,
        352,
        58,
        20,
        20,
        20,
        20,
        "rgba(255, 252, 242, 0.92)",
        "rgba(255,255,255,0.92)",
        2
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
    showMainMenu() {
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
        this._activateOnce(this._callbacks.onPlay);
      });
      this.container.addChild(play);
      const howToPlay = this._makeButton("HOW TO PLAY", 270, 424, 260, 52, false, () => {
        this._showHowToPlay();
      });
      this.container.addChild(howToPlay);
      const note = this._makeText("3 sunny launch puzzles", 14, "#70839a", false, 540);
      note.align = "center";
      note.pos(130, 506);
      this.container.addChild(note);
    }
    _showHowToPlay() {
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
        "6. Avoid the red danger zone."
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
        this.showMainMenu();
      });
      this.container.addChild(back);
    }
    _acceptCover() {
      if (this._screen !== "cover") {
        return;
      }
      this._activateOnce(this._callbacks.onCoverAccepted);
    }
    _activateOnce(action) {
      if (this._actionLocked) {
        return;
      }
      this._actionLocked = true;
      action();
    }
    _resetScreen() {
      this._clearInteractiveTargets();
      this.container.removeChildren();
      this._actionLocked = false;
    }
    _buildSunnyBackground() {
      const W = GameConfig.CANVAS_W;
      const H = GameConfig.CANVAS_H;
      const bg = new Laya.Sprite();
      bg.graphics.drawRect(0, 0, W, H, "#acd6eb");
      bg.graphics.drawCircle(W - 115, 85, 54, "rgba(255, 245, 200, 0.25)");
      bg.graphics.drawCircle(W - 115, 85, 28, "#fff3b0", "#ffe27a", 2);
      const cloud = (x, y, scale) => {
        const color = "rgba(255,255,255,0.78)";
        bg.graphics.drawCircle(x, y, 18 * scale, color);
        bg.graphics.drawCircle(x + 22 * scale, y + 4 * scale, 14 * scale, color);
        bg.graphics.drawCircle(x - 22 * scale, y + 4 * scale, 14 * scale, color);
      };
      cloud(120, 90, 1);
      cloud(660, 180, 0.8);
      bg.graphics.drawPoly(0, 0, [
        0,
        H - 60,
        120,
        H - 90,
        245,
        H - 60,
        390,
        H - 105,
        535,
        H - 60,
        680,
        H - 88,
        W,
        H - 60,
        W,
        H,
        0,
        H
      ], "#c5e7cb");
      bg.size(W, H);
      this.container.addChild(bg);
    }
    /** Static UI illustration only; it does not create or reference gameplay objects. */
    _addGameplayMotif(x, y, width, height) {
      const motif = new Laya.Sprite();
      motif.size(width, height);
      motif.pos(x, y);
      motif.graphics.drawRoundRect(
        0,
        0,
        width,
        height,
        24,
        24,
        24,
        24,
        "rgba(255,255,255,0.30)",
        "rgba(255,255,255,0.64)",
        2
      );
      const orbX = width * 0.12;
      const orbY = height * 0.7;
      const orbR = Math.max(10, height * 0.075);
      motif.graphics.drawCircle(orbX, orbY + 5, orbR + 5, "rgba(58,72,96,0.12)");
      motif.graphics.drawCircle(orbX, orbY, orbR + 10, "rgba(0,0,0,0)", "rgba(233,107,90,0.28)", 3);
      motif.graphics.drawCircle(orbX, orbY, orbR, "#e96b5a", "#fff0ea", 3);
      motif.graphics.drawCircle(orbX - orbR * 0.28, orbY - orbR * 0.32, orbR * 0.3, "#ffd9cf");
      const cueStartX = orbX - orbR * 2.8;
      motif.graphics.drawLine(cueStartX, orbY, orbX - orbR * 1.2, orbY, "rgba(47,100,113,0.72)", 3);
      motif.graphics.drawPoly(0, 0, [
        cueStartX,
        orbY,
        cueStartX + 10,
        orbY - 6,
        cueStartX + 10,
        orbY + 6
      ], "rgba(47,100,113,0.72)");
      const platformX = width * 0.43;
      const platformY = height * 0.68;
      const platformW = width * 0.2;
      const platformH = Math.max(12, height * 0.1);
      motif.graphics.drawRoundRect(
        platformX + 4,
        platformY + 6,
        platformW,
        platformH,
        6,
        6,
        6,
        6,
        "rgba(58,72,96,0.16)"
      );
      motif.graphics.drawRoundRect(
        platformX,
        platformY,
        platformW,
        platformH,
        6,
        6,
        6,
        6,
        "#5c78c9",
        "#d9e5ff",
        2
      );
      motif.graphics.drawLine(
        platformX + 9,
        platformY + 4,
        platformX + platformW - 9,
        platformY + 4,
        "rgba(255,255,255,0.62)",
        2
      );
      const portalX = width * 0.88;
      const portalY = height * 0.27;
      const portalR = Math.max(14, height * 0.12);
      motif.graphics.drawCircle(portalX, portalY, portalR + 12, "rgba(102,209,161,0.10)");
      motif.graphics.drawCircle(portalX, portalY, portalR + 6, "rgba(0,0,0,0)", "rgba(72,183,135,0.34)", 4);
      motif.graphics.drawCircle(portalX, portalY, portalR, "rgba(255,255,255,0.18)", "#3b9b7a", 4);
      motif.graphics.drawCircle(portalX, portalY, portalR * 0.34, "#7ce0b5");
      const trajectory = [
        [0.2, 0.61],
        [0.29, 0.5],
        [0.38, 0.47],
        [0.47, 0.54],
        [0.52, 0.62],
        [0.6, 0.51],
        [0.69, 0.39],
        [0.78, 0.3],
        [0.84, 0.27]
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
    _makePanel(x, y, width, height) {
      const panel = new Laya.Sprite();
      panel.graphics.drawRoundRect(
        0,
        0,
        width,
        height,
        28,
        28,
        28,
        28,
        "rgba(255, 252, 242, 0.96)",
        "rgba(255,255,255,0.92)",
        2
      );
      panel.size(width, height);
      panel.pos(x, y);
      return panel;
    }
    _makeText(text, fontSize, color, bold, width) {
      const label = new Laya.Text();
      label.text = text;
      label.fontSize = fontSize;
      label.color = color;
      label.bold = bold;
      label.width = width;
      return label;
    }
    _makeButton(label, x, y, width, height, primary, onClick) {
      const button = new Laya.Sprite();
      button.size(width, height);
      button.pos(x, y);
      button.mouseEnabled = true;
      const text = this._makeText(label, 20, primary ? "#ffffff" : "#2f4d57", true, width);
      text.align = "center";
      text.height = height;
      text.valign = "middle";
      button.addChild(text);
      const paint = (state) => {
        const fill = primary ? state === "pressed" ? "#d85849" : state === "hover" ? "#f27b68" : "#e96b5a" : state === "pressed" ? "#a9d8c5" : state === "hover" ? "#d2efe2" : "#bfe5d4";
        button.graphics.clear();
        button.graphics.drawRoundRect(0, 0, width, height, 16, 16, 16, 16, fill);
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
    _clearInteractiveTargets() {
      for (const target of this._interactiveTargets) {
        target.offAllCaller(this);
      }
      this._interactiveTargets.length = 0;
    }
    destroy() {
      this._clearInteractiveTargets();
      this.container.removeChildren();
      this.container.removeSelf();
    }
  };

  // src/objects/Ball.ts
  var Ball = class {
    constructor(x, y, radius) {
      this.vx = 0;
      this.vy = 0;
      /** true = 已发射，不再允许拖拽蓄力 */
      this.isLaunched = false;
      /** true = 运动停止，等待玩家按重置 */
      this.isStopped = false;
      this.x = x;
      this.y = y;
      this._startX = x;
      this._startY = y;
      this.radius = radius;
    }
    /** 重置回初始位置和状态（重置按钮 / 关卡重载时调用） */
    reset() {
      this.x = this._startX;
      this.y = this._startY;
      this.vx = 0;
      this.vy = 0;
      this.isLaunched = false;
      this.isStopped = false;
    }
  };

  // src/objects/Target.ts
  var Target = class {
    constructor(x, y, radius = GameConfig.TARGET_RADIUS) {
      this.x = x;
      this.y = y;
      this.radius = radius;
    }
    /**
     * 判断小球中心是否进入目标区。
     * 采用宽松判定（仅检测球心距离 < 目标半径），手感更友好。
     */
    contains(bx, by) {
      const dx = bx - this.x;
      const dy = by - this.y;
      return Math.sqrt(dx * dx + dy * dy) < this.radius;
    }
    /**
     * 将目标绘制到 sp（sp 将被定位到 this.x, this.y）。
     * 绘制为两层同心圆：外圈轮廓 + 内圆心。
     */
    drawTo(sp) {
      sp.graphics.clear();
      sp.graphics.drawCircle(0, 0, this.radius, "#00cc6633", "#00ff88", 2);
      sp.graphics.drawCircle(0, 0, 8, "#00ff88");
      sp.pos(this.x, this.y);
    }
  };

  // src/objects/Platform.ts
  var Platform = class {
    constructor(data) {
      this.data = data;
    }
    /**
     * 将平台以世界坐标绘制到容器 Sprite。
     * 使用 container.graphics，坐标为 container 本地空间（与 stage 对齐）。
     */
    drawTo(container) {
      const { x, y, w, h, color } = this.data;
      container.graphics.drawRect(x, y, w, h, color != null ? color : "#2244aa", "#4466cc", 1);
    }
    /**
     * 导出矩形 bounds 供 PhysicsEngine 做碰撞检测使用。
     * 返回独立的新对象（而非 this.data 的引用），调用方改动返回值不会影响
     * 这个 Platform 自身的数据。不包含 color，因为碰撞解算不需要颜色。
     */
    getBounds() {
      const { x, y, w, h } = this.data;
      return { x, y, w, h };
    }
  };

  // src/physics/PhysicsEngine.ts
  var _PhysicsEngine = class _PhysicsEngine {
    // ─── 对外主入口 ──────────────────────────────────────────────
    /**
     * 推进物理状态一次：重力 → 限速 → 位移积分 → 世界边界/平台碰撞 → 地面/目标判定。
     * 只做"一次"积分，不在内部拆分 dt；是否需要按 FIXED_DT 多次调用本方法，
     * 由调用方的累加器决定（见类注释）。直接修改传入的 ball，不返回新对象。
     */
    static step(ball, platforms, dt, context = {}) {
      var _a, _b;
      const bounds = (_a = context.bounds) != null ? _a : {
        width: GameConfig.CANVAS_W,
        height: GameConfig.CANVAS_H
      };
      const groundY = (_b = bounds.groundY) != null ? _b : bounds.height;
      const result = {
        hitWall: false,
        hitPlatform: false,
        hitBottom: false,
        reachedTarget: false,
        isLowSpeed: false,
        isTimedOut: false,
        shouldStopByPhysics: false
      };
      const clampedDt = Math.min(Math.max(dt, 0), _PhysicsEngine.MAX_STEP_DT);
      _PhysicsEngine._integrate(ball, clampedDt, bounds, groundY, platforms, context.target, result);
      const speed = Math.hypot(ball.vx, ball.vy);
      result.isLowSpeed = speed < GameConfig.STOP_SPEED;
      if (context.elapsedFlightTime !== void 0) {
        result.isTimedOut = context.elapsedFlightTime >= _PhysicsEngine.FLIGHT_TIMEOUT_SECONDS;
      }
      result.shouldStopByPhysics = result.hitBottom || result.isTimedOut;
      return result;
    }
    // ─── 单次积分 ────────────────────────────────────────────────
    static _integrate(ball, dt, bounds, groundY, platforms, target, result) {
      ball.vy += GameConfig.GRAVITY * dt;
      const speed = Math.hypot(ball.vx, ball.vy);
      if (speed > _PhysicsEngine.MAX_SPEED) {
        const scale = _PhysicsEngine.MAX_SPEED / speed;
        ball.vx *= scale;
        ball.vy *= scale;
      }
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      if (_PhysicsEngine._resolveWorldBounds(ball, bounds)) {
        result.hitWall = true;
      }
      for (let i = 0; i < platforms.length; i++) {
        if (_PhysicsEngine._resolvePlatformCollision(ball, platforms[i])) {
          result.hitPlatform = true;
        }
      }
      if (ball.y + ball.radius >= groundY) {
        ball.y = groundY - ball.radius;
        result.hitBottom = true;
      }
      if (target && !result.reachedTarget) {
        const dx = ball.x - target.x;
        const dy = ball.y - target.y;
        if (Math.sqrt(dx * dx + dy * dy) < target.radius) {
          result.reachedTarget = true;
        }
      }
    }
    // ─── 世界边界碰撞（左/右/上，轴对齐半平面反弹） ─────────────
    static _resolveWorldBounds(ball, bounds) {
      const r = ball.radius;
      let hit = false;
      if (ball.x - r < 0) {
        ball.x = r;
        ball.vx = Math.abs(ball.vx) * GameConfig.BOUNCE;
        hit = true;
      }
      if (ball.x + r > bounds.width) {
        ball.x = bounds.width - r;
        ball.vx = -Math.abs(ball.vx) * GameConfig.BOUNCE;
        hit = true;
      }
      if (ball.y - r < 0) {
        ball.y = r;
        ball.vy = Math.abs(ball.vy) * GameConfig.BOUNCE;
        hit = true;
      }
      return hit;
    }
    // ─── 圆-矩形碰撞（最近点法）+ 反射 + 恢复系数 ───────────────
    /**
     * 最近点法：
     *  1. 把球心 (ball.x, ball.y) 在矩形 rect 上做 clamp，得到矩形上离球心最近的点 closest。
     *  2. 球心到 closest 的向量 (dx, dy)，其长度 dist 即球心到矩形的最短距离。
     *  3. 若 dist >= 球半径，说明没有重叠，不发生碰撞。
     *  4. 若 dist > 0（球心在矩形外部），归一化 (dx, dy) 得到碰撞法线 (nx, ny)，
     *     推出量 penetration = radius - dist。
     *  5. 沿法线方向反射速度，并乘以恢复系数 GameConfig.BOUNCE（非完全弹性）。
     *
     * 退化情况（球心落在矩形内部，或恰好在边界上，dist ≈ 0）：
     *  此时 closest point 退化为球心本身，(dx,dy) 无法归一化出法线。改为
     *  计算球心到矩形四条边的距离 leftDist/rightDist/topDist/bottomDist，
     *  取最小值对应的边作为推出方向（法线指向矩形外部），并且推出量必须是
     *  "球心到该边的距离 + 球半径"，而不是只用球半径——否则只会把球心推到
     *  矩形边界上，球体本身仍有一半埋在平台里，导致边缘卡死/抖动/重复反弹。
     */
    static _resolvePlatformCollision(ball, rect) {
      const r = ball.radius;
      const closestX = Math.min(Math.max(ball.x, rect.x), rect.x + rect.w);
      const closestY = Math.min(Math.max(ball.y, rect.y), rect.y + rect.h);
      const dx = ball.x - closestX;
      const dy = ball.y - closestY;
      const distSq = dx * dx + dy * dy;
      if (distSq >= r * r)
        return false;
      const dist = Math.sqrt(distSq);
      let nx;
      let ny;
      let penetration;
      if (dist > 1e-6) {
        nx = dx / dist;
        ny = dy / dist;
        penetration = r - dist;
      } else {
        const leftDist = ball.x - rect.x;
        const rightDist = rect.x + rect.w - ball.x;
        const topDist = ball.y - rect.y;
        const bottomDist = rect.y + rect.h - ball.y;
        const minDist = Math.min(leftDist, rightDist, topDist, bottomDist);
        if (minDist === leftDist) {
          nx = -1;
          ny = 0;
          penetration = leftDist + r;
        } else if (minDist === rightDist) {
          nx = 1;
          ny = 0;
          penetration = rightDist + r;
        } else if (minDist === topDist) {
          nx = 0;
          ny = -1;
          penetration = topDist + r;
        } else {
          nx = 0;
          ny = 1;
          penetration = bottomDist + r;
        }
      }
      ball.x += nx * penetration;
      ball.y += ny * penetration;
      const vDotN = ball.vx * nx + ball.vy * ny;
      if (vDotN < 0) {
        const normalImpulseScale = 1 + GameConfig.BOUNCE;
        ball.vx -= normalImpulseScale * vDotN * nx;
        ball.vy -= normalImpulseScale * vDotN * ny;
      }
      return true;
    }
  };
  // ─── 可调常量 ────────────────────────────────────────────────
  /** 固定步长（秒）。调用方累加器应以此为粒度推进物理。
   *  1/120s 时最大初速 800px/s 下单步位移 ≈6.7px，小于球半径(12px)和
   *  建议的最小平台厚度(16px)，是缓解隧穿的关键参数之一。 */
  _PhysicsEngine.FIXED_DT = 1 / 120;
  /** 单次 step() 调用的防御性 dt 上限（秒）。这不是"拆子步"的依据，
   *  只是兜底——即使调用方没有遵守累加器约定、传入了异常大的 dt，
   *  也不允许单次积分推进过大距离。 */
  _PhysicsEngine.MAX_STEP_DT = 0.05;
  /** 速度上限（像素/秒），每次积分后做钳制，防止长时间飞行速度无限增长导致隧穿 */
  _PhysicsEngine.MAX_SPEED = 2400;
  /** 飞行超时阈值（秒），仅用于和 elapsedFlightTime 比较后上报 isTimedOut */
  _PhysicsEngine.FLIGHT_TIMEOUT_SECONDS = 6;
  var PhysicsEngine = _PhysicsEngine;

  // src/ui/PauseUI.ts
  var PauseUI = class {
    constructor(callbacks) {
      this._interactiveTargets = [];
      this._actionLocked = false;
      this._callbacks = callbacks;
      this.container = new Laya.Sprite();
      this.container.size(GameConfig.CANVAS_W, GameConfig.CANVAS_H);
      this.container.mouseEnabled = true;
      this.container.zOrder = 1e3;
      this._build();
    }
    _build() {
      const W = GameConfig.CANVAS_W;
      const H = GameConfig.CANVAS_H;
      const shade = new Laya.Sprite();
      shade.graphics.drawRect(0, 0, W, H, "rgba(42, 58, 85, 0.42)");
      shade.size(W, H);
      this.container.addChild(shade);
      const panel = new Laya.Sprite();
      panel.graphics.drawRoundRect(
        0,
        0,
        390,
        470,
        26,
        26,
        26,
        26,
        "#fffaf0",
        "rgba(255,255,255,0.9)",
        2
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
      this._muteLabel = muteButton.getChildAt(0);
      this._refreshMuteLabel();
      this.container.addChild(muteButton);
      this.container.on(Laya.Event.MOUSE_DOWN, this, this._stopPropagation);
      this.container.on(Laya.Event.MOUSE_MOVE, this, this._stopPropagation);
      this.container.on(Laya.Event.MOUSE_UP, this, this._stopPropagation);
      this.container.on(Laya.Event.CLICK, this, this._stopPropagation);
      this._interactiveTargets.push(this.container);
    }
    _stopPropagation(event) {
      event.stopPropagation();
    }
    _activateOnce(action) {
      if (this._actionLocked) {
        return;
      }
      this._actionLocked = true;
      action();
    }
    _refreshMuteLabel() {
      this._muteLabel.text = this._callbacks.isMuted() ? "MUTE: ON" : "MUTE: OFF";
    }
    _makeText(text, fontSize, color, bold, width) {
      const label = new Laya.Text();
      label.text = text;
      label.fontSize = fontSize;
      label.color = color;
      label.bold = bold;
      label.width = width;
      return label;
    }
    _makeButton(label, x, y, width, height, primary, onClick) {
      const button = new Laya.Sprite();
      button.size(width, height);
      button.pos(x, y);
      button.mouseEnabled = true;
      const text = this._makeText(label, 19, primary ? "#ffffff" : "#2f4d57", true, width);
      text.align = "center";
      text.height = height;
      text.valign = "middle";
      button.addChild(text);
      const paint = (state) => {
        const fill = primary ? state === "pressed" ? "#d85849" : state === "hover" ? "#f27b68" : "#e96b5a" : state === "pressed" ? "#a9d8c5" : state === "hover" ? "#d2efe2" : "#bfe5d4";
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
    destroy() {
      for (const target of this._interactiveTargets) {
        target.offAllCaller(this);
      }
      this._interactiveTargets.length = 0;
      this.container.removeChildren();
      this.container.removeSelf();
    }
  };

  // src/game/GameScene.ts
  var _GameScene = class _GameScene {
    // ─────────────────────────────────────────────────────────────
    constructor(levelIndex, callbacks) {
      this._state = "ready";
      this._dragX = 0;
      this._dragY = 0;
      this._paused = false;
      this._pauseUI = null;
      // ── 物理（R4.4：接入 PhysicsEngine） ──────────────────────────
      /** 固定步长累加器，由 _stepPhysics() 累加/消耗，PhysicsEngine 自身不持有此状态 */
      this._physicsAccumulator = 0;
      /** 平台碰撞包围盒缓存，_build() 时一次性收集，供 PhysicsEngine.step() 使用 */
      this._platformBounds = [];
      this._levelIndex = levelIndex;
      this._level = LevelLoader.get(levelIndex);
      this._callbacks = callbacks;
      this.container = new Laya.Sprite();
      this._build();
    }
    // ── 构建场景 ──────────────────────────────────────────────────
    _build() {
      var _a;
      const bg = new Laya.Sprite();
      const W = GameConfig.CANVAS_W;
      const H = GameConfig.CANVAS_H;
      bg.graphics.drawRect(0, 0, W, H, "#acd6eb");
      const sunX = W - 160;
      const sunY = 72;
      bg.graphics.drawCircle(sunX, sunY, 52, "rgba(255, 245, 200, 0.07)");
      bg.graphics.drawCircle(sunX, sunY, 36, "rgba(255, 235, 160, 0.15)");
      bg.graphics.drawCircle(sunX, sunY, 21, "#fff3b0", "#ffe27a", 2);
      const rayCount = 8;
      const rayLen = 130;
      for (let i = 0; i < rayCount; i++) {
        const angle = Math.PI * 2 / rayCount * i;
        const x2 = sunX + Math.cos(angle) * rayLen;
        const y2 = sunY + Math.sin(angle) * rayLen;
        bg.graphics.drawLine(sunX, sunY, x2, y2, "rgba(255, 244, 190, 0.05)", 6);
      }
      const drawCloud = (cx, cy, scale) => {
        const a = "rgba(255, 255, 255, 0.85)";
        bg.graphics.drawCircle(cx, cy, 18 * scale, a);
        bg.graphics.drawCircle(cx + 20 * scale, cy + 4 * scale, 14 * scale, a);
        bg.graphics.drawCircle(cx - 20 * scale, cy + 4 * scale, 14 * scale, a);
        bg.graphics.drawCircle(cx, cy - 8 * scale, 14 * scale, a);
      };
      drawCloud(150, 110, 1);
      drawCloud(330, 150, 0.8);
      drawCloud(470, 90, 0.65);
      const failLineY = H - 6;
      const horizonY = failLineY - 20;
      bg.graphics.drawRect(0, horizonY, W, failLineY - horizonY, "#dff5e1");
      bg.graphics.drawPoly(0, 0, [
        0,
        horizonY,
        90,
        horizonY - 22,
        190,
        horizonY,
        300,
        horizonY - 30,
        420,
        horizonY,
        540,
        horizonY - 20,
        660,
        horizonY,
        760,
        horizonY - 26,
        W,
        horizonY,
        W,
        failLineY,
        0,
        failLineY
      ], "rgba(178, 224, 186, 0.55)");
      bg.size(W, H);
      this.container.addChild(bg);
      const ground = new Laya.Sprite();
      const dangerEdgeY = GameConfig.CANVAS_H - 6;
      const thornColors = ["#c94f49", "#d95f54", "#bf4643"];
      for (let x = 0, cluster = 0; x < GameConfig.CANVAS_W; x += 24, cluster++) {
        const highTip = cluster % 3 === 0 ? 13 : cluster % 3 === 1 ? 10 : 8;
        ground.graphics.drawPoly(0, 0, [
          x,
          dangerEdgeY,
          x + 4,
          dangerEdgeY - 6,
          x + 8,
          dangerEdgeY - 3,
          x + 12,
          dangerEdgeY - highTip,
          x + 16,
          dangerEdgeY - 4,
          x + 21,
          dangerEdgeY - 8,
          x + 24,
          dangerEdgeY
        ], thornColors[cluster % thornColors.length]);
      }
      ground.graphics.drawRect(
        0,
        GameConfig.CANVAS_H - 6,
        GameConfig.CANVAS_W,
        6,
        "#cc2222"
      );
      this.container.addChild(ground);
      const dangerLabelX = GameConfig.CANVAS_W / 2 - 68;
      const dangerLabelY = GameConfig.CANVAS_H - 35;
      const dangerBadge = new Laya.Sprite();
      dangerBadge.graphics.drawRoundRect(
        0,
        3,
        136,
        26,
        9,
        9,
        9,
        9,
        "rgba(83,52,54,0.16)"
      );
      dangerBadge.graphics.drawRoundRect(
        0,
        0,
        136,
        26,
        9,
        9,
        9,
        9,
        "rgba(255,248,245,0.94)",
        "#e96b5a",
        2
      );
      dangerBadge.pos(dangerLabelX, dangerLabelY);
      this.container.addChild(dangerBadge);
      const groundLabel = new Laya.Text();
      groundLabel.text = "DANGER ZONE";
      groundLabel.color = "#b9403a";
      groundLabel.fontSize = 12;
      groundLabel.bold = true;
      groundLabel.width = 136;
      groundLabel.height = 26;
      groundLabel.align = "center";
      groundLabel.valign = "middle";
      groundLabel.pos(dangerLabelX, dangerLabelY);
      this.container.addChild(groundLabel);
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
      const platformsLayer = new Laya.Sprite();
      for (const platformData of this._level.platforms) {
        const platform = new Platform(platformData);
        platform.drawTo(platformsLayer);
        this._platformBounds.push(platform.getBounds());
      }
      this.container.addChild(platformsLayer);
      this._target = new Target(
        this._level.target.x,
        this._level.target.y,
        (_a = this._level.target.radius) != null ? _a : GameConfig.TARGET_RADIUS
      );
      const targetDecor = new Laya.Sprite();
      const targetR = this._target.radius;
      targetDecor.graphics.drawCircle(0, 4, targetR + 13, "rgba(53,76,96,0.10)");
      targetDecor.graphics.drawCircle(0, 0, targetR + 18, "rgba(93,218,164,0.08)");
      targetDecor.graphics.drawCircle(
        0,
        0,
        targetR + 10,
        "rgba(0,0,0,0)",
        "rgba(59,155,122,0.26)",
        4
      );
      targetDecor.pos(this._target.x, this._target.y);
      this.container.addChild(targetDecor);
      const targetSp = new Laya.Sprite();
      this._target.drawTo(targetSp);
      this.container.addChild(targetSp);
      this._aimLayer = new Laya.Sprite();
      this.container.addChild(this._aimLayer);
      this._ball = new Ball(
        this._level.launchPoint.x,
        this._level.launchPoint.y,
        GameConfig.BALL_RADIUS
      );
      this._ballSprite = new Laya.Sprite();
      this._drawOrbGraphics();
      this._ballSprite.pos(this._ball.x, this._ball.y);
      this.container.addChild(this._ballSprite);
      this._buildUI();
      Laya.stage.on(Laya.Event.MOUSE_DOWN, this, this._onMouseDown);
      Laya.stage.on(Laya.Event.MOUSE_MOVE, this, this._onMouseMove);
      Laya.stage.on(Laya.Event.MOUSE_UP, this, this._onMouseUp);
      Laya.stage.on(Laya.Event.KEY_DOWN, this, this._onKeyDown);
      Laya.timer.frameLoop(1, this, this._update);
    }
    /** R restarts the level; P toggles Pause/Resume only where valid. */
    _onKeyDown(e) {
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
    _drawOrbGraphics() {
      const r = GameConfig.BALL_RADIUS;
      this._ballSprite.graphics.drawCircle(0, 5, r + 5, "rgba(53,76,96,0.16)");
      this._ballSprite.graphics.drawCircle(
        0,
        0,
        r + 9,
        "rgba(233,69,96,0.10)",
        "rgba(255,255,255,0.56)",
        2
      );
      this._ballSprite.graphics.drawCircle(0, 0, r, "#e94560", "#fff0f4", 3);
      this._ballSprite.graphics.drawCircle(-r * 0.28, -r * 0.32, r * 0.34, "#ffd5df");
    }
    _drawPlatformPresentation(layer, x, y, width, height) {
      const corner = Math.min(7, Math.max(4, Math.min(width, height) * 0.24));
      layer.graphics.drawRoundRect(
        x + 4,
        y + 6,
        width,
        height,
        corner,
        corner,
        corner,
        corner,
        "rgba(53,76,96,0.18)"
      );
      layer.graphics.drawRoundRect(
        x - 3,
        y - 3,
        width + 6,
        height + 6,
        corner + 2,
        corner + 2,
        corner + 2,
        corner + 2,
        "rgba(255,255,255,0.22)",
        "rgba(255,255,255,0.58)",
        2
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
    _buildUI() {
      var _a;
      const hud = new Laya.Sprite();
      hud.graphics.drawRoundRect(
        0,
        5,
        260,
        68,
        18,
        18,
        18,
        18,
        "rgba(53,76,96,0.16)"
      );
      hud.graphics.drawRoundRect(
        0,
        0,
        260,
        68,
        18,
        18,
        18,
        18,
        "rgba(255,250,239,0.96)",
        "rgba(255,255,255,0.92)",
        2
      );
      hud.graphics.drawCircle(28, 25, 15, "rgba(233,107,90,0.12)");
      hud.graphics.drawCircle(28, 25, 11, "rgba(0,0,0,0)", "rgba(233,107,90,0.42)", 2);
      hud.graphics.drawCircle(28, 25, 7, "#e96b5a", "#fff0ea", 2);
      hud.graphics.drawCircle(26, 23, 2.5, "#ffd8cf");
      hud.graphics.drawCircle(232, 22, 8, "rgba(102,201,161,0.10)", "#66c9a1", 2);
      hud.graphics.drawCircle(232, 22, 3, "#66c9a1");
      hud.graphics.drawRoundRect(
        50,
        38,
        192,
        22,
        8,
        8,
        8,
        8,
        "rgba(47,100,113,0.92)"
      );
      hud.graphics.drawCircle(52, 22, 2.5, "#f4b65f");
      hud.graphics.drawCircle(59, 19, 2, "#f4b65f");
      hud.graphics.drawCircle(66, 18, 1.5, "#66c9a1");
      hud.size(260, 73);
      hud.pos(14, 10);
      this.container.addChild(hud);
      const levelLabel = new Laya.Text();
      levelLabel.text = `Level ${this._levelIndex + 1}`;
      levelLabel.color = "#2a3a55";
      levelLabel.fontSize = 19;
      levelLabel.bold = true;
      levelLabel.width = 171;
      levelLabel.pos(71, 17);
      this.container.addChild(levelLabel);
      this._hintText = new Laya.Text();
      this._hintText.text = (_a = this._level.hint) != null ? _a : "Drag the energy orb to charge";
      this._hintText.color = "#fff8e8";
      this._hintText.fontSize = 13;
      this._hintText.width = 171;
      this._hintText.height = 18;
      this._hintText.overflow = "shrink";
      this._hintText.pos(71, 50);
      this.container.addChild(this._hintText);
      if (Laya.Browser.onMobile) {
        const mobileHint = new Laya.Text();
        mobileHint.text = "DRAG • AIM • RELEASE";
        mobileHint.color = "#2f6471";
        mobileHint.fontSize = 13;
        mobileHint.bold = true;
        mobileHint.pos(20, 74);
        this.container.addChild(mobileHint);
      }
      this._buildPauseButton();
    }
    _buildPauseButton() {
      const hit = new Laya.Sprite();
      hit.graphics.drawRect(
        0,
        0,
        _GameScene.PAUSE_HIT_W,
        _GameScene.PAUSE_HIT_H,
        "rgba(0,0,0,0)"
      );
      hit.size(_GameScene.PAUSE_HIT_W, _GameScene.PAUSE_HIT_H);
      hit.pos(_GameScene.PAUSE_HIT_X, _GameScene.PAUSE_HIT_Y);
      hit.mouseEnabled = true;
      const shadow = new Laya.Sprite();
      shadow.graphics.drawRoundRect(
        0,
        0,
        54,
        48,
        17,
        17,
        17,
        17,
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
      const paint = (fill) => {
        face.graphics.clear();
        face.graphics.drawRoundRect(
          0,
          0,
          54,
          48,
          17,
          17,
          17,
          17,
          fill,
          "rgba(255,255,255,0.56)",
          2
        );
        face.graphics.drawLine(12, 6, 42, 6, "rgba(255,255,255,0.32)", 1);
      };
      paint("rgba(199,234,219,0.48)");
      hit.on(Laya.Event.MOUSE_OVER, this, () => paint("rgba(218,242,231,0.62)"));
      hit.on(Laya.Event.MOUSE_OUT, this, () => paint("rgba(199,234,219,0.48)"));
      hit.on(Laya.Event.MOUSE_DOWN, this, (event) => {
        event.stopPropagation();
        paint("rgba(169,216,197,0.72)");
      });
      hit.on(Laya.Event.MOUSE_UP, this, (event) => {
        event.stopPropagation();
        paint("rgba(218,242,231,0.62)");
      });
      hit.on(Laya.Event.CLICK, this, this._onPauseButtonClick);
      this._pauseButton = hit;
      this.container.addChild(hit);
      this._syncPauseButtonVisibility();
    }
    _onPauseButtonClick(event) {
      event.stopPropagation();
      this._enterPause();
    }
    _isInsidePauseHitRegion(x, y) {
      return x >= _GameScene.PAUSE_HIT_X && x <= _GameScene.PAUSE_HIT_X + _GameScene.PAUSE_HIT_W && y >= _GameScene.PAUSE_HIT_Y && y <= _GameScene.PAUSE_HIT_Y + _GameScene.PAUSE_HIT_H;
    }
    _isPausableState() {
      return this._state === "ready" || this._state === "dragging" || this._state === "flying";
    }
    _enterPause() {
      if (this._paused || !this._isPausableState()) {
        return;
      }
      if (this._state === "dragging") {
        this._state = "ready";
        this._aimLayer.graphics.clear();
      }
      this._paused = true;
      this._syncPauseButtonVisibility();
      const pauseUI = new PauseUI({
        onResume: () => this._resumeFromPause(),
        onRestart: () => this._callbacks.onReset(),
        onMainMenu: () => this._callbacks.onMainMenu(),
        onToggleMute: () => AudioManager.toggleMute(),
        isMuted: () => AudioManager.isMuted()
      });
      this._pauseUI = pauseUI;
      this.container.addChild(pauseUI.container);
    }
    _resumeFromPause() {
      if (!this._paused) {
        return;
      }
      this._paused = false;
      this._destroyPauseUI();
      this._syncPauseButtonVisibility();
    }
    _destroyPauseUI() {
      if (!this._pauseUI) {
        return;
      }
      this._pauseUI.destroy();
      this._pauseUI = null;
    }
    _syncPauseButtonVisibility() {
      if (!this._pauseButton) {
        return;
      }
      this._pauseButton.visible = !this._paused && this._isPausableState();
    }
    // ── 鼠标事件 ──────────────────────────────────────────────────
    _onMouseDown() {
      if (this._paused)
        return;
      const mx = Laya.stage.mouseX;
      const my = Laya.stage.mouseY;
      if (this._isInsidePauseHitRegion(mx, my))
        return;
      if (this._state !== "ready")
        return;
      const dx = mx - this._ball.x;
      const dy = my - this._ball.y;
      const acquisitionRadius = Laya.Browser.onMobile ? _GameScene.MOBILE_CLICK_RADIUS : _GameScene.CLICK_RADIUS;
      if (Math.sqrt(dx * dx + dy * dy) > acquisitionRadius)
        return;
      AudioManager.playBgmOnce();
      this._state = "dragging";
      this._dragX = mx;
      this._dragY = my;
    }
    _onMouseMove() {
      if (this._paused)
        return;
      if (this._state !== "dragging")
        return;
      this._dragX = Laya.stage.mouseX;
      this._dragY = Laya.stage.mouseY;
    }
    _onMouseUp() {
      if (this._paused)
        return;
      if (this._state !== "dragging")
        return;
      this._launch();
      if (this._state === "flying") {
        AudioManager.playLaunchSfx();
      }
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
    _launch() {
      const pullX = this._ball.x - this._dragX;
      const pullY = this._ball.y - this._dragY;
      const pullDist = Math.sqrt(pullX * pullX + pullY * pullY);
      if (pullDist < 6) {
        this._state = "ready";
        return;
      }
      const capped = Math.min(pullDist, GameConfig.MAX_DRAG);
      const speed = capped / GameConfig.MAX_DRAG * GameConfig.LAUNCH_SPEED_MAX;
      this._ball.vx = pullX / pullDist * speed;
      this._ball.vy = pullY / pullDist * speed;
      this._state = "flying";
    }
    // ── 主循环（每帧） ────────────────────────────────────────────
    _update() {
      if (this._paused)
        return;
      const dt = Math.min(Laya.timer.delta / 1e3, 0.05);
      this._aimLayer.graphics.clear();
      if (this._state === "dragging") {
        this._drawAimVisualization();
      } else if (this._state === "ready") {
        this._aimLayer.graphics.drawCircle(
          this._ball.x,
          this._ball.y,
          _GameScene.CLICK_RADIUS,
          "rgba(0,0,0,0)",
          "rgba(255,255,255,0.12)",
          1
        );
      }
      if (this._state === "flying") {
        this._stepPhysics(dt);
      }
      this._ballSprite.pos(this._ball.x, this._ball.y);
      if (this._state === "flying" && this._target.contains(this._ball.x, this._ball.y)) {
        this._onPortalReached();
        AudioManager.playPortalSfx();
        this._syncPauseButtonVisibility();
        return;
      }
      this._updateHint();
      this._syncPauseButtonVisibility();
    }
    // ── 蓄力可视化 ────────────────────────────────────────────────
    /**
     * 绘制两层辅助视觉：
     *  1. 拉伸线：从球心到鼠标方向（表示反向蓄力方向，红色）
     *  2. 轨迹点：按反向速度 + 重力模拟 0.65s，最多 10 个点（青色）
     */
    _drawAimVisualization() {
      const bx = this._ball.x;
      const by = this._ball.y;
      const pullX = bx - this._dragX;
      const pullY = by - this._dragY;
      const pullDist = Math.sqrt(pullX * pullX + pullY * pullY);
      if (pullDist < 3)
        return;
      const capped = Math.min(pullDist, GameConfig.MAX_DRAG);
      const ratio = capped / pullDist;
      const strX = bx - pullX * ratio;
      const strY = by - pullY * ratio;
      this._aimLayer.graphics.drawLine(
        bx,
        by,
        strX,
        strY,
        "rgba(255, 80, 80, 0.5)",
        1.5
      );
      this._aimLayer.graphics.drawCircle(
        strX,
        strY,
        4,
        "rgba(255, 80, 80, 0.55)"
      );
      const speed = capped / GameConfig.MAX_DRAG * GameConfig.LAUNCH_SPEED_MAX;
      const vx = pullX / pullDist * speed;
      const vy = pullY / pullDist * speed;
      const g = GameConfig.GRAVITY;
      const SIM_DT = 0.05;
      const MAX_DOT = 4;
      const W = GameConfig.CANVAS_W;
      const H = GameConfig.CANVAS_H;
      for (let i = 1; i <= MAX_DOT; i++) {
        const t = i * SIM_DT;
        const tx = bx + vx * t;
        const ty = by + vy * t + 0.5 * g * t * t;
        if (tx < 0 || tx > W || ty > H)
          break;
        const opacity = (MAX_DOT - i + 1) / (MAX_DOT + 1) * 0.85;
        const dotR = Math.max(2, 4.5 - i * 0.25);
        this._aimLayer.graphics.drawCircle(
          tx,
          ty,
          dotR,
          `rgba(255, 209, 102, ${opacity.toFixed(2)})`,
          `rgba(42, 58, 85, ${opacity.toFixed(2)})`,
          1.5
        );
      }
      const pct = Math.round(capped / GameConfig.MAX_DRAG * 100);
      this._hintText.text = `Release to launch  [${pct}%]`;
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
    _stepPhysics(frameDt) {
      this._physicsAccumulator += frameDt;
      while (this._physicsAccumulator >= PhysicsEngine.FIXED_DT) {
        const result = PhysicsEngine.step(
          this._ball,
          this._platformBounds,
          PhysicsEngine.FIXED_DT,
          {
            bounds: {
              width: GameConfig.CANVAS_W,
              height: GameConfig.CANVAS_H,
              groundY: GameConfig.CANVAS_H - 6
            }
          }
        );
        this._physicsAccumulator -= PhysicsEngine.FIXED_DT;
        if (result.shouldStopByPhysics || result.hitBottom) {
          this._onFail();
          AudioManager.playFailSfx();
          this._physicsAccumulator = 0;
          break;
        }
        if (result.hitWall || result.hitPlatform) {
          AudioManager.playCollisionSfx();
        }
      }
    }
    // ── 失败 / 重生 ────────────────────────────────────────────────
    _onFail() {
      this._state = "respawning";
      this._ball.vx = 0;
      this._ball.vy = 0;
      this._ballSprite.visible = false;
      Laya.timer.once(1e3, this, this._respawn);
    }
    _respawn() {
      this._ball.reset();
      this._ballSprite.pos(this._ball.x, this._ball.y);
      this._ballSprite.visible = true;
      this._state = "ready";
    }
    // ── 进入传送门 ────────────────────────────────────────────────
    _onPortalReached() {
      this._state = "completed";
      this._ball.vx = 0;
      this._ball.vy = 0;
      Laya.timer.once(1e3, this, () => {
        this._callbacks.onComplete();
      });
    }
    // ── 提示文字状态机 ────────────────────────────────────────────
    _updateHint() {
      var _a;
      if (this._state === "dragging")
        return;
      switch (this._state) {
        case "ready":
          this._hintText.text = (_a = this._level.hint) != null ? _a : "Drag the energy orb to charge";
          this._hintText.color = "#aaaacc";
          break;
        case "flying":
          this._hintText.text = "Orb flying...";
          this._hintText.color = "#88aacc";
          break;
        case "respawning":
          this._hintText.text = "Failed! Respawning...";
          this._hintText.color = "#ff6644";
          break;
        case "completed":
          this._hintText.text = "Portal reached!";
          this._hintText.color = "#ffd700";
          break;
      }
    }
    // ── 销毁 ──────────────────────────────────────────────────────
    destroy() {
      Laya.timer.clearAll(this);
      this._destroyPauseUI();
      this._pauseButton.offAllCaller(this);
      Laya.stage.off(Laya.Event.MOUSE_DOWN, this, this._onMouseDown);
      Laya.stage.off(Laya.Event.MOUSE_MOVE, this, this._onMouseMove);
      Laya.stage.off(Laya.Event.MOUSE_UP, this, this._onMouseUp);
      Laya.stage.off(Laya.Event.KEY_DOWN, this, this._onKeyDown);
      this.container.removeSelf();
    }
  };
  // ── 常量 ──────────────────────────────────────────────────────
  /** 鼠标点击必须在此半径内才能开始拖拽 */
  _GameScene.CLICK_RADIUS = 42;
  /** Mobile keeps the visual BALL_RADIUS unchanged while easing touch acquisition. */
  _GameScene.MOBILE_CLICK_RADIUS = 64;
  _GameScene.PAUSE_HIT_X = 652;
  _GameScene.PAUSE_HIT_Y = 14;
  _GameScene.PAUSE_HIT_W = 128;
  _GameScene.PAUSE_HIT_H = 60;
  var GameScene = _GameScene;

  // src/game/WinScene.ts
  var WinScene = class {
    constructor(callbacks) {
      this._interactiveTargets = [];
      this._actionLocked = false;
      this._callbacks = callbacks;
      this.container = new Laya.Sprite();
      this.container.size(GameConfig.CANVAS_W, GameConfig.CANVAS_H);
      this._build();
    }
    _build() {
      const W = GameConfig.CANVAS_W;
      const H = GameConfig.CANVAS_H;
      const bg = new Laya.Sprite();
      bg.graphics.drawRect(0, 0, W, H, "#acd6eb");
      bg.graphics.drawCircle(W - 118, 86, 52, "rgba(255, 245, 200, 0.25)");
      bg.graphics.drawCircle(W - 118, 86, 27, "#fff3b0", "#ffe27a", 2);
      bg.graphics.drawPoly(0, 0, [
        0,
        H - 58,
        130,
        H - 94,
        270,
        H - 58,
        420,
        H - 102,
        570,
        H - 58,
        700,
        H - 86,
        W,
        H - 58,
        W,
        H,
        0,
        H
      ], "#c5e7cb");
      bg.size(W, H);
      this.container.addChild(bg);
      const panel = new Laya.Sprite();
      panel.graphics.drawRoundRect(
        0,
        0,
        520,
        410,
        28,
        28,
        28,
        28,
        "rgba(255, 252, 242, 0.96)",
        "rgba(255,255,255,0.92)",
        2
      );
      panel.size(520, 410);
      panel.pos(140, 95);
      this.container.addChild(panel);
      const title = this._makeText("ALL LEVELS CLEARED!", 40, "#2a3a55", true, 520);
      title.align = "center";
      title.pos(140, 160);
      this.container.addChild(title);
      const sub = this._makeText("Three puzzles. One perfect portal run.", 18, "#65788f", false, 520);
      sub.align = "center";
      sub.pos(140, 225);
      this.container.addChild(sub);
      this.container.addChild(this._makeButton("PLAY AGAIN", 255, 310, 290, 58, true, () => {
        this._activateOnce(this._callbacks.onPlayAgain);
      }));
      this.container.addChild(this._makeButton("MAIN MENU", 255, 388, 290, 52, false, () => {
        this._activateOnce(this._callbacks.onMainMenu);
      }));
    }
    _activateOnce(action) {
      if (this._actionLocked) {
        return;
      }
      this._actionLocked = true;
      action();
    }
    _makeText(text, fontSize, color, bold, width) {
      const label = new Laya.Text();
      label.text = text;
      label.fontSize = fontSize;
      label.color = color;
      label.bold = bold;
      label.width = width;
      return label;
    }
    _makeButton(label, x, y, width, height, primary, onClick) {
      const button = new Laya.Sprite();
      button.size(width, height);
      button.pos(x, y);
      button.mouseEnabled = true;
      const text = this._makeText(label, 20, primary ? "#ffffff" : "#2f4d57", true, width);
      text.align = "center";
      text.height = height;
      text.valign = "middle";
      button.addChild(text);
      const paint = (state) => {
        const fill = primary ? state === "pressed" ? "#d85849" : state === "hover" ? "#f27b68" : "#e96b5a" : state === "pressed" ? "#a9d8c5" : state === "hover" ? "#d2efe2" : "#bfe5d4";
        button.graphics.clear();
        button.graphics.drawRoundRect(0, 0, width, height, 16, 16, 16, 16, fill);
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
    destroy() {
      for (const target of this._interactiveTargets) {
        target.offAllCaller(this);
      }
      this._interactiveTargets.length = 0;
      this.container.removeChildren();
      this.container.removeSelf();
    }
  };

  // src/game/GameManager.ts
  var GameManager = class _GameManager {
    constructor() {
      this._homeUI = null;
      this._currentScene = null;
      this._currentWinScene = null;
      this._currentLevel = 0;
    }
    static get instance() {
      if (!_GameManager._instance) {
        _GameManager._instance = new _GameManager();
      }
      return _GameManager._instance;
    }
    get currentLevel() {
      return this._currentLevel;
    }
    /** Application entry point. Gameplay no longer auto-starts. */
    init() {
      console.log(`[GameManager] init — ${LevelLoader.count} levels`);
      this.showCover();
    }
    showCover() {
      this._destroyAllPresentation();
      const home = new HomeUI({
        onCoverAccepted: () => this._acceptCover(),
        onPlay: () => this.startNewGame()
      });
      this._homeUI = home;
      Laya.stage.addChild(home.container);
      AudioManager.playBgmOnce();
    }
    showMainMenu() {
      this._destroyAllPresentation();
      const home = new HomeUI({
        onCoverAccepted: () => this._acceptCover(),
        onPlay: () => this.startNewGame()
      });
      this._homeUI = home;
      home.showMainMenu();
      Laya.stage.addChild(home.container);
    }
    /** Menu PLAY and Win PLAY AGAIN converge on the same fresh Level 1 state. */
    startNewGame() {
      this.startLevel(0);
    }
    /** Start one validated level after removing every previous product surface. */
    startLevel(index) {
      console.log(`[GameManager] startLevel(${index})`);
      if (!LevelLoader.isValidIndex(index)) {
        console.error(
          `[GameManager] startLevel: invalid level index ${index} (valid: 0..${LevelLoader.count - 1})`
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
      const callbacks = {
        onReset: () => this.restartCurrentLevel(),
        onComplete: () => this.nextLevel(),
        onMainMenu: () => this.returnToMainMenu()
      };
      const scene = new GameScene(index, callbacks);
      this._currentScene = scene;
      Laya.stage.addChild(scene.container);
    }
    nextLevel() {
      const next = this._currentLevel + 1;
      if (next >= LevelLoader.count) {
        this._showWin();
      } else {
        this.startLevel(next);
      }
    }
    restartCurrentLevel() {
      this.startLevel(this._currentLevel);
    }
    returnToMainMenu() {
      this.showMainMenu();
    }
    _acceptCover() {
      if (!this._homeUI) {
        return;
      }
      AudioManager.restartBgm();
      this._homeUI.showMainMenu();
    }
    _showWin() {
      console.log("[GameManager] All levels cleared");
      this._destroyCurrentScene();
      this._destroyHomeUI();
      if (this._currentWinScene) {
        return;
      }
      const callbacks = {
        onPlayAgain: () => this._onWinPlayAgain(),
        onMainMenu: () => this.returnToMainMenu()
      };
      const winScene = new WinScene(callbacks);
      this._currentWinScene = winScene;
      Laya.stage.addChild(winScene.container);
    }
    _onWinPlayAgain() {
      if (!this._currentWinScene) {
        return;
      }
      this._destroyWinScene();
      this.startNewGame();
    }
    _destroyAllPresentation() {
      this._destroyHomeUI();
      this._destroyCurrentScene();
      this._destroyWinScene();
    }
    _destroyHomeUI() {
      if (!this._homeUI) {
        return;
      }
      this._homeUI.destroy();
      this._homeUI = null;
    }
    _destroyCurrentScene() {
      if (!this._currentScene) {
        return;
      }
      this._currentScene.destroy();
      this._currentScene = null;
    }
    _destroyWinScene() {
      if (!this._currentWinScene) {
        return;
      }
      this._currentWinScene.destroy();
      this._currentWinScene = null;
    }
  };

  // src/Main.ts
  var { regClass, property } = Laya;
  var Main = class extends Laya.Script {
    onStart() {
      GameManager.instance.init();
    }
  };
  Main = __decorateClass([
    regClass("e60XQm7tTY2BwFAdxb8D1g")
  ], Main);
})();
