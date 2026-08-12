/**
 * AudioManager.ts
 * 轻量音频管理器：负责背景音乐（BGM）与本轮已批准的游戏音效（SFX）。
 *
 * 职责边界：
 *  - BGM 继续保持幂等启动与停止行为。
 *  - SFX 仅包括发射、墙体/平台碰撞、传送门通关、失败四类。
 *  - 本轮没有已批准的重生音效资源，因此不在 _respawn() 播放音效。
 *  - 不提供音量设置 UI，音量为代码内常量。
 *  - 不引入新的玩法逻辑，不依赖/不修改 GameScene、GameManager 的状态机。
 *
 * 防重复叠加播放：
 *  - `_bgmStarted` 标记一旦置 true，后续所有 `playBgmOnce()` 调用直接短路返回。
 *  - 调用方是 GameScene 首次真实玩家交互（鼠标按下/拖拽开始）的入口，而非
 *    没有用户手势的初始化阶段；切关 / Restart / 重新构建场景都会再次经过
 *    该入口，但 `_bgmStarted` 标记保证只有第一次调用真正生效，不会叠加。
 *  - `Laya.SoundManager.playMusic()` 本身是"背景音乐单通道"播放，同一时间只有
 *    一路 music 通道，LayaAir 引擎层面也会替换而非叠加，这里的标记位是双重保险。
 */
export class AudioManager {

    /** BGM 资源路径。相对 assets 根目录，与项目现有 assets/resources 资源习惯保持一致 */
    private static readonly BGM_URL: string = "resources/audio/bgm.mp3";

    /** 已批准 SFX 的运行时资源路径 */
    private static readonly SFX_LAUNCH_URL: string = "resources/audio/sfx_launch.mp3";
    private static readonly SFX_COLLISION_URL: string = "resources/audio/sfx_collision.wav";
    private static readonly SFX_PORTAL_URL: string = "resources/audio/sfx_portal.wav";
    private static readonly SFX_FAIL_URL: string = "resources/audio/sfx_fail.mp3";

    /** 低音量循环播放，避免刺耳、避免抢游戏反馈音效的听觉空间 */
    private static readonly BGM_VOLUME: number = 0.22;

    /** SFX 使用独立声道音量，不修改 BGM 的 musicVolume */
    private static readonly SFX_VOLUME: number = 0.6;

    /** 固定步长物理可能在很短时间内连续上报碰撞；冷却用于避免声音堆叠 */
    private static readonly COLLISION_SFX_COOLDOWN_MS: number = 100;

    /** 是否已经启动过 BGM；true 之后 playBgmOnce() 直接短路，防止重复叠加播放 */
    private static _bgmStarted: boolean = false;

    /** 最近一次实际触发碰撞音效的引擎时间 */
    private static _lastCollisionSfxAtMs: number = -Infinity;

    /**
     * 启动 BGM（幂等）。
     * 多次调用只有第一次生效，用于在 GameScene 首次真实玩家交互（鼠标按下/
     * 拖拽开始）时调用，不必担心 Restart / 切关 / 重新构建场景时被重复调用
     * 导致多层叠加。
     */
    static playBgmOnce(): void {
        if (AudioManager._bgmStarted) {
            return;
        }
        AudioManager._bgmStarted = true;
        AudioManager._playInternal();
    }

    /**
     * 停止 BGM。
     * 当前验收范围内没有强制停止的场景（WinScene 允许 BGM 继续播放），
     * 保留此接口供后续扩展（例如未来加入静音开关）使用。
     */
    static stopBgm(): void {
        Laya.SoundManager.stopMusic();
        AudioManager._bgmStarted = false;
    }

    /** 有效发射后播放一次；短拖拽取消不会调用本接口 */
    static playLaunchSfx(): void {
        AudioManager._playSfxInternal(AudioManager.SFX_LAUNCH_URL, "launch");
    }

    /**
     * 墙体或平台碰撞后播放一次。
     * 100ms 冷却阻止同一帧多个固定步长或持续接触造成的碰撞音效刷屏。
     */
    static playCollisionSfx(): void {
        const now = Laya.timer.currTimer;
        if (now - AudioManager._lastCollisionSfxAtMs < AudioManager.COLLISION_SFX_COOLDOWN_MS) {
            return;
        }

        AudioManager._lastCollisionSfxAtMs = now;
        AudioManager._playSfxInternal(AudioManager.SFX_COLLISION_URL, "collision");
    }

    /** 进入传送门并切换到 completed 状态时播放一次 */
    static playPortalSfx(): void {
        AudioManager._playSfxInternal(AudioManager.SFX_PORTAL_URL, "portal");
    }

    /** 进入 respawning 失败状态时播放一次 */
    static playFailSfx(): void {
        AudioManager._playSfxInternal(AudioManager.SFX_FAIL_URL, "fail");
    }

    // ── 内部 ──────────────────────────────────────────────────────
    private static _playInternal(): void {
        Laya.SoundManager.musicVolume = AudioManager.BGM_VOLUME;

        try {
            // playMusic 第二个参数 loops=0 表示无限循环
            Laya.SoundManager.playMusic(AudioManager.BGM_URL, 0);
        } catch (e) {
            // 浏览器自动播放策略可能导致首次播放被拒绝；
            // 当前播放入口位于 GameScene._onMouseDown() 的首次有效玩家交互中，
            // 此处仅记录异常，不修改输入或玩法逻辑。
            console.warn("[AudioManager] BGM playback failed, will not retry automatically:", e);
        }
    }

    private static _playSfxInternal(url: string, label: string): void {
        try {
            const channel = Laya.SoundManager.playSound(url, 1);
            channel.volume = AudioManager.SFX_VOLUME;
        } catch (e) {
            console.warn(`[AudioManager] ${label} SFX playback failed:`, e);
        }
    }
}
