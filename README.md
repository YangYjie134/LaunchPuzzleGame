# Launch Puzzle Game

> Personal project / 个人项目 | Independently developed / 独立开发

![Reverse drag launch with trajectory preview](docs/showcase/drag-launch.webp)

A small-scope 2D physics launch puzzle built with **LayaAir 3** and **TypeScript**.

Players drag backward to aim and launch an energy ball, then use gravity, wall bounces, platform collisions, and portal targets to complete each level.

This project focuses on a complete playable loop, custom lightweight physics, level data loading, scene switching, and simple visual polish. It is a personal learning and portfolio project rather than a commercial release. Requirements, technical decisions, code integration, debugging, verification, and final acceptance were handled independently; AI tools were used as development assistants.

<p align="center">
  <img src="docs/showcase/platform-bounce.webp" alt="Orb bouncing from a Level 2 platform" width="49%">
  <img src="docs/showcase/win-scene.webp" alt="Final WinScene" width="49%">
</p>

---

## Features

- Reverse drag launch
- Aim preview trajectory
- Gravity-based ball movement
- Wall bounce
- Platform collision
- Ground failure and respawn
- Portal-based level completion
- Data-driven level loading with `LevelData` and `LevelLoader`
- Final win screen with `WinScene`
- Custom lightweight `PhysicsEngine`
- Sunny morning visual theme
- Keyboard reset with `R`
- Background music (BGM) started by the first valid drag interaction
- Sound effects (SFX) for launch, collision, portal clear, and failure

---

## Controls

| Action | Input |
|---|---|
| Start aiming | Mouse down near the ball |
| Aim and charge | Drag opposite the launch direction |
| Launch | Release mouse |
| Reset current level | Press `R` |

---

## How to Run

1. Open **LayaAir IDE 3**.
2. Open the `LaunchPuzzleGame-Laya/` project folder.
3. Run or preview the project from the editor.
4. Use the mouse to drag the orb and press `R` to reset the current level.

For a published Web build, serve the build through local HTTP instead of opening it with `file://`. This repository does not currently publish an online-play URL.

中文说明：使用 LayaAir 3 IDE 打开 `LaunchPuzzleGame-Laya/` 后运行主场景；Web 构建应通过本地 HTTP 访问。

---

## Tech Stack

- **LayaAir 3**
- **TypeScript**
- **Custom lightweight PhysicsEngine**

LayaAir is used for rendering, input, UI, timer updates, scene mounting, and scene switching.

This project does **not** use LayaAir Box2D.
It does not use `RigidBody` or `Collider` components.

Physics behavior is handled by a custom lightweight `PhysicsEngine`.

---

## Current Status

Current status: **completed and archived within the intended personal-project scope**. All three levels are playable, and the final LayaAir Web build and human playtest passed. This status does not imply a commercial release.

Implemented and verified within the current scope:

- 3 playable levels
- Custom physics step integration
- Fixed timestep accumulator in `GameScene`
- Platform collision based on `Platform.getBounds()`
- Portal detection and level switching
- Final `WinScene`
- Failure and respawn flow
- Sunny morning background
- Improved aim preview visibility
- `R` key reset

Current testing has not found obvious corner-sticking or tunneling issues.

---

## Project Structure

The LayaAir project is located in:

```text
LaunchPuzzleGame-Laya/
```

Main source structure:

```text
LaunchPuzzleGame-Laya/
  src/
    game/
      GameConfig.ts     # Canvas size, drag settings, launch speed and core config
      GameManager.ts    # Level switching and WinScene management
      GameScene.ts      # Single-level runtime, input, UI, target detection and physics scheduling
      WinScene.ts       # Final win screen
    audio/
      AudioManager.ts   # BGM and gameplay SFX playback
    levels/
      LevelData.ts      # Level data structure
      LevelLoader.ts    # Level data source and loading logic
    objects/
      Ball.ts           # Ball data model
      Platform.ts       # Platform drawing and bounds export
      Target.ts         # Portal target data and drawing
    physics/
      PhysicsEngine.ts  # Custom lightweight physics step
```

## Technical Highlights

- `GameScene` handles rendering, input, UI, timer updates, and scene lifecycle.
- `PhysicsEngine` only handles numerical physics and does not depend on LayaAir display objects.
- Fixed timestep accumulation helps reduce tunneling caused by large frame intervals.
- Platform collision uses circle-rectangle bounds detection and resolution.
- `Platform` only provides drawing and bounds data.
- Target detection stays in `GameScene` to preserve the intended gameplay flow.
- `LevelLoader.get(index)` returns cloned level data and does not silently fall back on invalid indexes.
- Final completion flow is separated into `WinScene`.

## Audio and Credits

`AudioManager` manages the implemented BGM and gameplay SFX. BGM begins after the first valid player drag, while scene transitions, `WinScene`, and restart flow do not stack additional music playback. Collision SFX consumes existing wall/platform collision signals and uses a short cooldown to avoid repeated fixed-step triggers.

| Type / Event | Source | Author | License |
|---|---|---|---|
| BGM | [*Cozy Puzzle In-Game 3*](https://opengameart.org/content/cozy-puzzle-in-game-3) | MintoDog | CC0 |
| Launch | [Boost or Launch or Thruster Sound Effect](https://opengameart.org/content/boost-or-launch-or-thruster-sound-effect) | EZduzziteh | CC0 |
| Collision | [Metal Impact Sounds](https://opengameart.org/content/metal-impact-sounds) | BMacZero | CC0 |
| Portal clear | [Teleport](https://opengameart.org/content/teleport) | fins | CC0 |
| Failure | [Game Over](https://opengameart.org/content/game-over-10) | GreyFrogGames | CC0 |

Detailed runtime paths and integration notes are recorded in [`LaunchPuzzleGame-Laya/docs/TECH_NOTES.md`](LaunchPuzzleGame-Laya/docs/TECH_NOTES.md).

## Current Limitations

- No hosted standalone Web demo or online-play URL has been published yet.
- Audio uses fixed in-code volumes and does not provide a settings UI.
- The current project scope is intentionally limited to three levels.

---

## Notes

This project is part of a small-game practice portfolio.
The goal is not to build a large commercial game, but to demonstrate a complete, playable, explainable, and maintainable gameplay loop.

中文说明：这是一个基于 LayaAir 3 + TypeScript 的个人 2D 发射解谜项目，由本人独立开发。当前范围包含三关可玩流程、自定义轻量物理、关卡数据驱动、失败重生、传送门通关、BGM 与四类 SFX；项目定位为学习和作品集展示，不是商业发行游戏。
