# Launch Puzzle Game

## Project Overview / 项目简介

Launch Puzzle Game is a small 2D physics launch puzzle prototype built with **LayaAir 3 + TypeScript**.

玩家通过反向拖拽能量球进行蓄力和瞄准，松开后让小球在重力、墙体和平台之间运动，尝试进入绿色传送门完成关卡。

This project focuses on a complete gameplay loop, lightweight custom physics, level data loading, scene switching, and simple visual polish. It is a playable prototype rather than a full commercial game.

本项目定位为一个可运行的 gameplay prototype，重点展示基础玩法闭环、自定义轻量物理、关卡数据驱动和简单场景切换。

---

## Features / 功能

- Reverse drag launch / 反向拖拽发射
- Aim preview / 拖拽时显示预测轨迹
- Gravity-based movement / 小球受重力影响飞行
- Wall bounce / 墙体反弹
- Platform collision / 平台碰撞
- Ground failure and respawn / 触底失败后重生
- Portal target detection / 进入传送门后切换关卡
- Level data loading / 使用 `LevelData` 和 `LevelLoader` 管理关卡
- WinScene / 全部关卡完成后进入通关界面
- Custom lightweight physics / 自定义轻量 `PhysicsEngine`
- Sunny morning background / 阳光清晨风格背景
- Keyboard reset / 使用 `R` 键重置当前关卡

---

## Controls / 操作方式

- Mouse down near the ball / 在小球附近按下鼠标开始拖拽
- Drag opposite the launch direction / 反向拖拽进行蓄力和瞄准
- Release mouse / 松开鼠标发射小球
- Press `R` / 按 `R` 重置当前关卡

---

## Tech Stack / 技术栈

- **LayaAir 3**
- **TypeScript**
- **Custom lightweight PhysicsEngine**

LayaAir is used for:

- Rendering / 渲染
- Input / 鼠标与键盘输入
- UI / 文本与场景内 UI
- Timer / 帧循环与延时回调
- Scene runtime / 场景挂载、销毁与切换

This project does **not** use LayaAir Box2D.

本项目没有使用 LayaAir Box2D，也没有添加 `RigidBody` / `Collider` 组件。物理行为由项目内自定义轻量 `PhysicsEngine` 处理。

---

## Current Status / 当前状态

Current project status:

- L1 / L2 / L3 are playable and can be completed.
- `GameScene` is connected to `LevelLoader`.
- `GameScene` uses a fixed timestep accumulator to drive `PhysicsEngine.step()`.
- Platform collision bounds are collected from `Platform.getBounds()`.
- `LAUNCH_SPEED_MAX` is calculated from the canvas diagonal using `Math.hypot(GameConfig.CANVAS_W, GameConfig.CANVAS_H)`.
- Final `WinScene` and restart flow are implemented.
- Sunny morning background has been added.
- Aim preview visibility has been improved for the light background.
- The old Reset button has been removed and replaced with keyboard `R` reset.
- No obvious corner-sticking or tunneling issue has been found in current testing.

当前项目已经进入稳定收尾阶段，具备 3 个可玩的基础关卡、自定义物理、平台碰撞、失败重生、传送门通关和最终胜利界面。

---

## Project Structure / 项目结构

The LayaAir project is located in:

```text
LaunchPuzzleGame-Laya/
```

Main source structure:

```text
LaunchPuzzleGame-Laya/
  src/
    game/
      GameConfig.ts     # Canvas size, drag, launch speed and core configuration
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

Technical Highlights / 技术亮点

* `GameScene` handles LayaAir rendering, input, UI, timer updates, and scene lifecycle.
* `PhysicsEngine` only handles numerical physics and does not depend on Laya display objects.
* Fixed timestep accumulator reduces tunneling risk caused by large frame intervals.
* Platform collision uses circle-rectangle bounds detection and resolution.
* `Platform` only provides drawing and bounds data, keeping collision logic outside display objects.
* Target detection remains in `GameScene` to preserve the original gameplay flow.
* `LevelLoader.get(index)` returns cloned level data and does not silently fall back on invalid indexes.
* Final win flow is separated into `WinScene`.

Notes / 说明

This project is part of a small-game practice portfolio.
It is designed to demonstrate a complete playable loop and clean separation between gameplay scene logic and custom physics logic.
本项目是小游戏练习作品集的一部分，重点不是复杂美术或大型系统，而是完成一个可运行、可解释、可维护的轻量玩法闭环。
