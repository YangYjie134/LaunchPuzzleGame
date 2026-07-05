# Launch Puzzle Game

## Project Overview / 项目简介

Launch Puzzle Game 是一个基于 **LayaAir 3 + TypeScript** 的 2D 发射解谜原型项目。玩家通过反向拖拽小球进行蓄力和瞄准，松开后让小球在重力、墙体、平台和目标点之间运动，尝试进入传送门完成关卡。

项目当前重点是基础玩法闭环、关卡数据驱动、轻量物理步进和场景切换。它更接近一个可运行的 gameplay prototype，而不是完整商业游戏。

## Features / 功能

- Reverse drag launch / 反向拖拽发射。
- Aim preview / 拖拽时显示发射方向和力度提示。
- Gravity-based flight / 小球飞行受重力影响。
- Wall bounce and ground failure / 墙体反弹，触地失败后重生。
- Portal target detection / 进入目标区域后触发通关流程。
- Level data loading / 关卡由 `LevelData` 和 `LevelLoader` 管理。
- WinScene / 全部关卡完成后进入通关界面。
- Custom lightweight physics / 自定义轻量 `PhysicsEngine`，用于固定步长物理和平台碰撞。

## Controls / 操作方式

- Mouse down near the ball / 在小球附近按下鼠标开始拖拽。
- Drag opposite the launch direction / 反向拖拽进行蓄力和瞄准。
- Release mouse / 松开鼠标发射小球。
- Reset button / 点击 `Reset` 重新开始当前关卡。

## Tech Stack / 技术栈

- **LayaAir 3**
- **TypeScript**
- **Custom PhysicsEngine**

本项目使用 LayaAir 负责：

- Rendering / 渲染
- Input / 鼠标输入
- UI / 文本、按钮和场景内 UI
- Timer / `Laya.timer` 帧循环与延时回调
- Scene runtime / `Laya.stage` 场景挂载、销毁与切换

本项目没有使用 LayaAir Box2D，也没有添加 `RigidBody` / `Collider` 组件。物理行为由项目内的自定义轻量 `PhysicsEngine` 处理。

## Current Status / 当前状态

当前状态：

- R4.4 已接入 `PhysicsEngine.step()`。
- `GameScene` 已使用 fixed timestep accumulator 驱动物理步进。
- 平台碰撞已通过 `Platform.getBounds()` 收集 bounds，并传入 `PhysicsEngine.step()`。
- `LAUNCH_SPEED_MAX` 已改为 `Math.hypot(GameConfig.CANVAS_W, GameConfig.CANVAS_H)`，按画布对角线设置最大发射速度。
- L1 / L2 当前可通关。
- L3 目前需要进一步关卡布局调校。
- 测试中暂未发现明显顶角卡顿或穿模 bug。

## Project Structure / 项目结构

```text
src/
  game/
    GameConfig.ts     # 画布、拖拽、发射速度等核心配置
    GameManager.ts    # 关卡切换、WinScene 接入
    GameScene.ts      # 单关卡运行、输入、UI、目标检测、物理调度
    WinScene.ts       # 通关界面
  levels/
    LevelData.ts      # 关卡数据结构
    LevelLoader.ts    # 关卡数据源与读取逻辑
  objects/
    Ball.ts           # 小球数据模型
    Platform.ts       # 平台数据与 bounds 导出
    Target.ts         # 目标区域数据与绘制
  physics/
    PhysicsEngine.ts  # 自定义轻量物理步进
```

## Technical Highlight / 技术亮点

- `GameScene` 负责 LayaAir 输入、渲染、UI、计时器和场景生命周期。
- `PhysicsEngine` 只处理数值物理，不依赖 LayaAir 的显示对象或舞台。
- Fixed timestep accumulator 由 `GameScene` 持有，按 `PhysicsEngine.FIXED_DT` 多次消耗，减少大帧间隔造成的穿透风险。
- 平台碰撞使用 circle-rectangle bounds 检测与解算，平台对象只暴露矩形 bounds。
- Target detection 仍保留在 `GameScene`，用于维持阶段 2 的通关手感和状态流。
