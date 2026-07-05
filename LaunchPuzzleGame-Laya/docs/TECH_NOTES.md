# TECH_NOTES

本文记录 Launch Puzzle Game 的技术取舍和实现思路。项目使用 **LayaAir 3 + TypeScript**。LayaAir 负责渲染、输入、UI、计时器和场景运行；物理行为由自定义轻量 `PhysicsEngine` 管理。

## Why custom PhysicsEngine instead of LayaAir Box2D

本项目没有使用 LayaAir Box2D，也没有添加 `RigidBody` / `Collider` 组件。原因是当前玩法规模较小，核心需求是可控的发射手感、固定步长积分、简单世界边界和少量矩形平台碰撞。

自定义轻量 `PhysicsEngine` 的优势：

- 更容易保持阶段 2 已有手感。
- 更容易明确 `GameScene` 与物理层之间的数据边界。
- 不需要引入刚体组件生命周期和编辑器组件配置。
- 对当前 2D prototype 来说，circle-rectangle collision 已覆盖主要需求。

这个选择不是说 Box2D 不适合游戏物理，而是当前项目不需要完整刚体系统。

## GameScene 与 PhysicsEngine 的职责划分

`GameScene` 负责：

- LayaAir rendering / 场景绘制与显示对象挂载。
- LayaAir input / 鼠标按下、移动、松开。
- LayaAir UI / 文本、按钮、瞄准提示。
- LayaAir timer / 帧循环、失败重生延时、完成延时。
- Scene lifecycle / 事件解绑、计时器清理、容器销毁。
- Level runtime objects / 根据 `LevelLoader` 数据创建 `Ball`、`Platform`、`Target`。
- Target detection / 目标判定仍在 `GameScene` 中完成。

`PhysicsEngine` 负责：

- 速度和位置积分。
- 重力影响。
- 世界边界处理。
- 平台 bounds 碰撞。
- 触地失败、超时、平台命中等物理结果标记。

`PhysicsEngine` 不依赖 LayaAir 显示对象，不直接创建或销毁场景，也不直接切换关卡。

## Fixed timestep accumulator

R4.4 中，`GameScene` 已接入 fixed timestep accumulator：

- 每帧从 `Laya.timer.delta` 得到 frame dt。
- 将 frame dt 累加到 `_physicsAccumulator`。
- 当 accumulator 大于等于 `PhysicsEngine.FIXED_DT` 时，调用一次 `PhysicsEngine.step()`。
- 同一帧可能消耗多个 fixed step，以降低大帧间隔带来的穿透风险。
- 每次 step 后从 accumulator 中减去 `PhysicsEngine.FIXED_DT`。

Accumulator 放在 `GameScene` 中，而不是放在 `PhysicsEngine` 中。这样 `PhysicsEngine.step()` 可以保持纯粹：输入当前 ball、platform bounds、dt 和 context，输出 step result。

## Circle-rectangle platform collision

平台碰撞使用平台矩形 bounds：

```ts
{ x, y, w, h }
```

`Platform.getBounds()` 只导出矩形数据，不处理碰撞。`GameScene` 在构建关卡时收集这些 bounds，并在 R4.4 中传给 `PhysicsEngine.step()`。

技术思路：

- Ball 视为 circle。
- Platform 视为 axis-aligned rectangle。
- 物理层判断 circle 与 rectangle 的最近点关系。
- 发生重叠时由 `PhysicsEngine` 进行位置修正和速度响应。

该方案比完整刚体系统更轻，但足够支撑当前平台碰撞需求。

## Ground failure line: CANVAS_H - 6

当前触地失败线使用：

```ts
GameConfig.CANVAS_H - 6
```

这与画面底部绘制的地面线保持一致。R4.4 中 `GameScene` 显式把 `groundY` 传入 `PhysicsEngine.step()`，避免物理默认世界高度和可见地面线不一致。

## Launch speed max

当前 `LAUNCH_SPEED_MAX` 使用：

```ts
Math.hypot(GameConfig.CANVAS_W, GameConfig.CANVAS_H)
```

也就是按画布对角线设置最大发射速度。这样速度上限与画布尺寸绑定，后续如果调整画布大小，最大发射速度有一个更自然的基准。

## Target detection remains in GameScene

目标检测没有迁移到 `PhysicsEngine` 作为主流程控制。当前做法是：

- `PhysicsEngine` 负责物理 step。
- `GameScene` 继续使用目标区域判断小球是否进入传送门。
- 达成目标后，`GameScene` 切换到 completed 状态，并通知 `GameManager`。

这样可以保持阶段 2 的通关节奏和手感，同时避免物理层直接控制 UI 或关卡流程。

## Corner collision acceptance criteria

当前平台顶角碰撞的接受标准以手测表现为主：

- 小球接触平台顶角时不应出现明显卡顿。
- 小球不应明显穿过平台。
- 反弹方向需要可理解，不要求达到真实物理模拟精度。
- 关卡通关路径不应依赖极端像素级碰撞。

当前测试中暂未发现明显顶角卡顿或穿模 bug。后续如果出现边界 case，应优先补充复现关卡或调试场景，再调整碰撞解算。

## Testing notes

当前测试结果：

- L1 当前可通关。
- L2 当前可通关。
- L3 目前需要关卡布局调校。
- R4.4 物理路径已覆盖 `PhysicsEngine.step()`、fixed timestep accumulator 和 platform bounds collision。

后续建议：

- 对 L3 做 layout tuning。
- 增加平台顶角、薄平台、高速发射的专项测试。
- 保留阶段 2 的失败/完成节奏，不要在物理接入时无意改变手感。
