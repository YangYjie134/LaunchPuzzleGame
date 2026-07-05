# Launch Puzzle Game

A small 2D physics launch puzzle prototype built with **LayaAir 3** and **TypeScript**.

Players drag backward to aim and launch an energy ball, then use gravity, wall bounces, platform collisions, and portal targets to complete each level.

This project focuses on a complete playable loop, custom lightweight physics, level data loading, scene switching, and simple visual polish. It is a gameplay prototype rather than a full commercial game.

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

---

## Controls

| Action | Input |
|---|---|
| Start aiming | Mouse down near the ball |
| Aim and charge | Drag opposite the launch direction |
| Launch | Release mouse |
| Reset current level | Press `R` |

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

The project is currently in a stable prototype stage.

Implemented:

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

Technical Highlights

- `GameScene` handles rendering, input, UI, timer updates, and scene lifecycle.
- `PhysicsEngine` only handles numerical physics and does not depend on LayaAir display objects.
- Fixed timestep accumulation helps reduce tunneling caused by large frame intervals.
- Platform collision uses circle-rectangle bounds detection and resolution.
- `Platform` only provides drawing and bounds data.
- Target detection stays in `GameScene` to preserve the intended gameplay flow.
- `LevelLoader.get(index)` returns cloned level data and does not silently fall back on invalid indexes.
- Final completion flow is separated into `WinScene`.

---

## Notes

This project is part of a small-game practice portfolio.
The goal is not to build a large commercial game, but to demonstrate a complete, playable, explainable, and maintainable gameplay loop.

中文说明：这是一个基于 LayaAir 3 + TypeScript 的 2D 发射解谜原型项目，重点展示自定义轻量物理、关卡数据驱动、失败重生、传送门通关和基础作品包装能力。
