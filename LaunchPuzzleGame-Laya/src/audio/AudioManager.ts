/**
 * AudioManager.ts
 * 轻量音频管理器：负责背景音乐（BGM）与本轮已批准的游戏音效（SFX）。
 *
 * 职责边界：
 *  - BGM 继续保持幂等启动与停止行为。
 *  - Gameplay SFX 保持发射、墙体/平台碰撞、传送门通关、失败四类；
 *    UI click 仅服务于主菜单通用按钮，不进入玩法调用点。
 *  - 本轮没有已批准的重生音效资源，因此不在 _respawn() 播放音效。
 *  - 不提供音量设置 UI，音量为代码内常量。
 *  - 不引入新的玩法逻辑，不依赖/不修改 GameScene、GameManager 的状态机。
 *
 * 防重复叠加播放：
 *  - `_bgmStarted` 标记一旦置 true，后续所有 `playBgmOnce()` 调用直接短路返回。
 *  - 封面显示时先尝试启动；封面首次用户手势会从头重启同一首 BGM，作为
 *    浏览器自动播放受限时的可靠兜底。切关 / Restart / 重新构建场景仍由
 *    `_bgmStarted` 标记保证不会叠加。
 *  - `Laya.SoundManager.playMusic()` 本身是"背景音乐单通道"播放，同一时间只有
 *    一路 music 通道，LayaAir 引擎层面也会替换而非叠加，这里的标记位是双重保险。
 */
export class AudioManager {

    /** BGM 资源路径。相对 assets 根目录，与项目现有 assets/resources 资源习惯保持一致 */
    private static readonly BGM_URL: string = "resources/audio/bgm.mp3";

    /** 已批准 SFX 的运行时资源路径 */
    private static readonly SFX_LAUNCH_URL: string = "resources/audio/sfx_launch.mp3";
    private static readonly SFX_COLLISION_URL: string = "resources/audio/sfx_collision.wav";
    private static readonly SFX_COLLISION_MOBILE_URL: string = "resources/audio/sfx_collision_mobile.wav";
    private static readonly SFX_PORTAL_URL: string = "resources/audio/sfx_portal.wav";
    private static readonly SFX_FAIL_URL: string = "resources/audio/sfx_fail.mp3";
    private static readonly SFX_FAIL_MOBILE_URL: string = "resources/audio/sfx_fail_mobile.wav";
    private static readonly SFX_UI_CLICK_URL: string = "resources/audio/sfx_ui_click.wav";

    /** 低音量循环播放，避免刺耳、避免抢游戏反馈音效的听觉空间 */
    private static readonly BGM_VOLUME: number = 0.22;

    /** SFX 使用独立声道音量，不修改 BGM 的 musicVolume */
    private static readonly SFX_VOLUME: number = 0.6;

    /** 桌面端保持上一轮已验收的 collision/fail 声道音量；其余 SFX 保持 0.6。 */
    private static readonly COLLISION_SFX_VOLUME: number = 1.0;
    private static readonly FAIL_SFX_VOLUME: number = 1.0;

    /** 手机母带已有更高 RMS；保留 20% 声道余量，避免贴近满幅并压过 launch/portal。 */
    private static readonly MOBILE_COLLISION_SFX_VOLUME: number = 0.8;
    private static readonly MOBILE_FAIL_SFX_VOLUME: number = 0.8;

    /** 固定步长物理可能在很短时间内连续上报碰撞；冷却用于避免声音堆叠 */
    private static readonly COLLISION_SFX_COOLDOWN_MS: number = 100;

    /** 是否已经启动过 BGM；true 之后 playBgmOnce() 直接短路，防止重复叠加播放 */
    private static _bgmStarted: boolean = false;

    /** 最近一次实际触发碰撞音效的引擎时间 */
    private static _lastCollisionSfxAtMs: number = -Infinity;

    /** 合并同一时刻的解锁请求；settle 后清空，失败时允许下一次手势重试。 */
    private static _audioResumePromise: Promise<boolean> | null = null;

    /** collision/fail 预热状态；失败时复位，允许后续成功手势再次尝试。 */
    private static _criticalSfxWarmupInFlight: boolean = false;
    private static _criticalSfxWarmupReady: boolean = false;

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

    /** 封面用户手势：停止当前 music 通道，并从头播放同一首 BGM。 */
    static restartBgm(): void {
        AudioManager.stopBgm();
        AudioManager.playBgmOnce();
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

    /** Toggle the engine-wide session mute without stopping or re-unlocking BGM. */
    static toggleMute(): boolean {
        Laya.SoundManager.muted = !Laya.SoundManager.muted;
        return Laya.SoundManager.muted;
    }

    /** Current engine-wide mute state for menu/gameplay/win presentation. */
    static isMuted(): boolean {
        return Laya.SoundManager.muted;
    }

    /**
     * 直接用户手势入口：尽力恢复 WebAudio，但永不等待、永不改变 BGM/音量/静音状态。
     * 调用方必须继续同步执行原页面动作。
     */
    static unlockSfxFromUserGesture(): void {
        const ctx = AudioManager._getAudioContext();
        if (!ctx) {
            return;
        }
        if (ctx.state === "running") {
            AudioManager._warmCriticalGameplaySfx();
            return;
        }

        void AudioManager._resumeAudioContext(ctx, "unlock").then((running) => {
            if (running && ctx.state === "running") {
                AudioManager._warmCriticalGameplaySfx();
            }
        });
    }

    /**
     * 主菜单通用按钮反馈。running 时立即播放；否则仅在 resume 成功且确已 running 后播放。
     * 返回 void，调用方不会等待此异步音频路径。
     */
    static playUiClickFromUserGesture(): void {
        const ctx = AudioManager._getAudioContext();
        if (!ctx) {
            return;
        }
        if (ctx.state === "running") {
            AudioManager._playSfxInternal(AudioManager.SFX_UI_CLICK_URL, "UI click");
            return;
        }

        void AudioManager._resumeAudioContext(ctx, "UI click").then((running) => {
            if (running && ctx.state === "running") {
                AudioManager._playSfxInternal(AudioManager.SFX_UI_CLICK_URL, "UI click");
            }
        });
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
        const mobile = Laya.Browser.onMobile;
        AudioManager._playSfxInternal(
            mobile ? AudioManager.SFX_COLLISION_MOBILE_URL : AudioManager.SFX_COLLISION_URL,
            "collision",
            mobile ? AudioManager.MOBILE_COLLISION_SFX_VOLUME : AudioManager.COLLISION_SFX_VOLUME
        );
    }

    /** 进入传送门并切换到 completed 状态时播放一次 */
    static playPortalSfx(): void {
        AudioManager._playSfxInternal(AudioManager.SFX_PORTAL_URL, "portal");
    }

    /** 进入 respawning 失败状态时播放一次 */
    static playFailSfx(): void {
        const mobile = Laya.Browser.onMobile;
        AudioManager._playSfxInternal(
            mobile ? AudioManager.SFX_FAIL_MOBILE_URL : AudioManager.SFX_FAIL_URL,
            "fail",
            mobile ? AudioManager.MOBILE_FAIL_SFX_VOLUME : AudioManager.FAIL_SFX_VOLUME
        );
    }

    // ── 内部 ──────────────────────────────────────────────────────
    private static _getAudioContext(): AudioContext | null {
        try {
            const media = Laya.PAL && Laya.PAL.media;
            const ctx = media && media.audioCtx;
            if (!ctx) {
                console.warn("[AudioManager] WebAudio context is unavailable; SFX unlock skipped.");
                return null;
            }
            return ctx;
        } catch (e) {
            console.warn("[AudioManager] WebAudio context lookup failed; SFX unlock skipped:", e);
            return null;
        }
    }

    private static _resumeAudioContext(ctx: AudioContext, label: string): Promise<boolean> {
        if (ctx.state === "running") {
            return Promise.resolve(true);
        }
        if (AudioManager._audioResumePromise) {
            return AudioManager._audioResumePromise;
        }

        try {
            const request = ctx.resume()
                .then(() => ctx.state === "running")
                .catch((e) => {
                    console.warn(`[AudioManager] WebAudio ${label} resume failed:`, e);
                    return false;
                });
            AudioManager._audioResumePromise = request.then((running) => {
                AudioManager._audioResumePromise = null;
                return running;
            });
            return AudioManager._audioResumePromise;
        } catch (e) {
            console.warn(`[AudioManager] WebAudio ${label} resume threw:`, e);
            return Promise.resolve(false);
        }
    }

    /**
     * 使用 LayaAir WebAudio 声道实际消费的 AudioDataCache 预热 collision/fail。
     * 这里只加载并解码，不创建播放声道，不阻塞页面动作，也不会产生重复音效。
     */
    private static _warmCriticalGameplaySfx(): void {
        if (AudioManager._criticalSfxWarmupInFlight || AudioManager._criticalSfxWarmupReady) {
            return;
        }

        try {
            const media = Laya.PAL && Laya.PAL.media;
            const cache = media && media.audioDataCache;
            if (!cache) {
                console.warn("[AudioManager] Audio data cache is unavailable; critical SFX warm-up skipped.");
                return;
            }

            AudioManager._criticalSfxWarmupInFlight = true;
            const mobile = Laya.Browser.onMobile;
            const urls: readonly string[] = [
                mobile ? AudioManager.SFX_COLLISION_MOBILE_URL : AudioManager.SFX_COLLISION_URL,
                mobile ? AudioManager.SFX_FAIL_MOBILE_URL : AudioManager.SFX_FAIL_URL,
            ];
            let remaining = urls.length;
            let allLoaded = true;

            for (const url of urls) {
                cache.get(url, (buffer) => {
                    if (!buffer) {
                        allLoaded = false;
                    }
                    remaining -= 1;

                    if (remaining === 0) {
                        AudioManager._criticalSfxWarmupInFlight = false;
                        AudioManager._criticalSfxWarmupReady = allLoaded;
                        if (!allLoaded) {
                            console.warn("[AudioManager] Critical SFX warm-up was incomplete; a later gesture may retry.");
                        }
                    }
                });
            }
        } catch (e) {
            AudioManager._criticalSfxWarmupInFlight = false;
            console.warn("[AudioManager] Critical SFX warm-up failed:", e);
        }
    }

    private static _playInternal(): void {
        Laya.SoundManager.musicVolume = AudioManager.BGM_VOLUME;

        try {
            // playMusic 第二个参数 loops=0 表示无限循环
            Laya.SoundManager.playMusic(AudioManager.BGM_URL, 0);
        } catch (e) {
            // 浏览器自动播放策略可能拒绝封面显示时的首次尝试；封面用户手势
            // 会调用 restartBgm() 重新启动。此处仅记录异常，不修改输入或玩法逻辑。
            console.warn("[AudioManager] BGM playback failed, will not retry automatically:", e);
        }
    }

    private static _playSfxInternal(
        url: string,
        label: string,
        volume: number = AudioManager.SFX_VOLUME
    ): void {
        try {
            const channel = Laya.SoundManager.playSound(url, 1);
            channel.volume = volume;
        } catch (e) {
            console.warn(`[AudioManager] ${label} SFX playback failed:`, e);
        }
    }
}
