# Third-Party Notices

This document records third-party software and media included in the
LaunchPuzzleGame source tree or generated Web distribution. 本文件仅记录第三方材料及其许可，
不代表对项目原创代码、文档、截图或游戏设计授予统一许可。

## LayaAir 3.3.11

- Project: LayaAir Engine
- Copyright: Copyright (c) 2022 layabox
- License: MIT License
- Source: https://github.com/layabox/LayaAir/tree/v3.3.11
- Full license text: `LICENSES/LayaAir-MIT.txt`

The project uses LayaAir for rendering, input, UI, timers, scene execution, and
Web publishing. LayaAir material present in the source tree or generated output
includes engine type declarations, generated runtime libraries, generated
internal UI files, and default project-template images such as the component
atlas and `layaAir.png`.

LaunchPuzzleGame does not use LayaAir Box2D, `RigidBody`, or `Collider`
components for gameplay physics. Its launch and platform collision behavior is
implemented by the project's custom lightweight `PhysicsEngine`.

## Audio

The following audio is dedicated to the public domain under CC0 1.0 Universal.
Attribution is not required by CC0, but source details are retained for
traceability.

| Packaged file | Work | Author | Source | License |
| --- | --- | --- | --- | --- |
| `resources/audio/bgm.mp3` | Cozy Puzzle In-Game 3 | MintoDog | https://opengameart.org/content/cozy-puzzle-in-game-3 | CC0 1.0 |
| `resources/audio/sfx_launch.mp3` | Boost or Launch or Thruster Sound Effect (`boost.mp3`) | EZduzziteh | https://opengameart.org/content/boost-or-launch-or-thruster-sound-effect | CC0 1.0 |
| `resources/audio/sfx_collision.wav` | Metal Impact Sounds (`thud3.wav`) | BMacZero | https://opengameart.org/content/metal-impact-sounds | CC0 1.0 |
| `resources/audio/sfx_portal.wav` | Teleport (`172206__fins__teleport.wav`) | fins | https://opengameart.org/content/teleport | CC0 1.0 |
| `resources/audio/sfx_fail.mp3` | Game Over (`gameover.mp3`) | GreyFrogGames | https://opengameart.org/content/game-over-10 | CC0 1.0 |

CC0 1.0 Universal: https://creativecommons.org/publicdomain/zero/1.0/

## Project Licensing Boundary

No project-wide license is currently declared for LaunchPuzzleGame. Unless a
file states otherwise, this notice documents third-party terms only and does
not grant permission to reuse the project's original material.
