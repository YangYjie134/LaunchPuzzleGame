/**
 * AudioManager.ts
 * 轻量背景音乐（BGM）管理器。
 *
 * 职责边界（本轮范围）：
 *  - 只负责 BGM 的播放/停止，不涉及碰撞音效、失败音效、传送门音效。
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

    /** 低音量循环播放，避免刺耳、避免抢游戏反馈音效的听觉空间 */
    private static readonly BGM_VOLUME: number = 0.22;

    /** 是否已经启动过 BGM；true 之后 playBgmOnce() 直接短路，防止重复叠加播放 */
    private static _bgmStarted: boolean = false;

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
}
