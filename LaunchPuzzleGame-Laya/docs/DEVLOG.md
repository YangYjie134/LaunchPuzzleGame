# DEVLOG

本文记录 Launch Puzzle Game 的阶段性开发过程、修正点和当前测试结果。项目使用 **LayaAir 3 + TypeScript**，LayaAir 负责渲染、输入、UI、计时器和场景运行；物理部分没有使用 LayaAir Box2D，也没有添加 `RigidBody` / `Collider`，而是使用自定义轻量 `PhysicsEngine`。

## Stage 1 - 基础画面

- 建立 LayaAir 3 + TypeScript 项目基础结构。
- 绘制关卡背景、小球、平台、目标区域和提示文本。
- 搭建单关卡的基础运行入口。

## Stage 2 - 反向拖拽、预测轨迹、失败重生、传送门

- 实现 reverse drag launch：`pull = ball - mouse`。
- 拖拽时显示瞄准/力度提示。
- 松开鼠标后进入 flying 状态。
- 小球触地失败后延时重生。
- 小球进入目标区域后触发完成流程。
- 保留阶段 2 的基础手感：短拖拽取消、触地失败不反弹、1 秒重生和 1 秒完成节奏。

## R1 - PhysicsEngine 原型

- 新增自定义轻量 `PhysicsEngine` 原型。
- 将重力、速度积分、边界处理和物理结果输出整理到纯逻辑层。
- `PhysicsEngine` 不直接操作 LayaAir 显示对象，只处理数值和 `Ball` 数据。

## R1.1 / R1.2 - PhysicsEngine 修正

- 修正 `PhysicsEngine.step()` 的输入输出边界，明确单次 step 只做一次固定步长积分。
- 明确 accumulator 不属于 `PhysicsEngine`，由调用方维护。
- 补充平台碰撞、世界边界、触地失败和飞行超时等结果标记。
- 保持通关目标判定与场景状态流解耦，避免物理层直接控制场景切换。

## R2 - LevelData / LevelLoader

- 新增 `LevelData` 数据结构。
- 新增 `LevelLoader` 作为关卡数据读取入口。
- 关卡数据不依赖 LayaAir、不依赖 `GameScene`、不依赖 `PhysicsEngine` 实例。
- 当前关卡数据包含 L1、L2、L3。

## R3 - WinScene

- 抽出 `WinScene`，用于全部关卡完成后的通关界面。
- `WinScene` 只负责显示和 Restart 回调，不直接决定切关逻辑。
- 切关和重启仍由 `GameManager` 统一管理。

## R4.1 - Platform.getBounds

- `Platform` 新增 `getBounds()`。
- 平台对象导出 `{ x, y, w, h }` bounds，供物理层做矩形碰撞检测。
- `Platform` 自身不处理碰撞解算，避免平台模型和物理逻辑耦合。

## R4.2 - GameManager 接 LevelLoader.count 和 WinScene

- `GameManager` 使用 `LevelLoader.count` 作为关卡总数来源。
- 接入真实 `WinScene`。
- 关卡切换、重开和完成后的场景销毁由 `GameManager` 统一处理。

## R4.3 - GameScene 接 LevelLoader 数据

- `GameScene` 改为从 `LevelLoader.get(levelIndex)` 读取当前关卡。
- 小球初始点、目标点和平台来自关卡数据。
- 运行时对象仍由 `GameScene` 创建和挂载到 LayaAir 舞台。

## R4.4 - GameScene 接 PhysicsEngine.step()

- `GameScene` 已接入 `PhysicsEngine.step()`。
- `_stepPhysics()` 使用 fixed timestep accumulator。
- 每次按 `PhysicsEngine.FIXED_DT` 消耗 accumulator，并调用一次 `PhysicsEngine.step()`。
- `_build()` 阶段收集平台 bounds，作为 platform bounds collision 输入传给 `PhysicsEngine.step()`。
- `groundY` 显式使用 `GameConfig.CANVAS_H - 6`，对齐画面中的地面失败线。
- Target detection 仍保留在 `GameScene`，阶段 2 的通关判定手感不被物理层接管。

## Launch speed tuning

- `LAUNCH_SPEED_MAX` 已改为：

```ts
Math.hypot(GameConfig.CANVAS_W, GameConfig.CANVAS_H)
```

- 该值按画布对角线设置最大发射速度。
- 这样发射速度与画布尺寸绑定，比固定魔法数更容易理解和调校。

## Current test result

- L1: pass / 当前可通关。
- L2: pass / 当前可通关。
- L3: needs layout tuning / 目前需要关卡布局调校。
- 测试中暂未发现明显顶角卡顿或穿模 bug。

## Notes

- 当前记录描述的是 current status / 当前状态，不代表项目已完全完成。
- 后续重点更偏向关卡布局调校、手感参数微调和测试覆盖补充。
