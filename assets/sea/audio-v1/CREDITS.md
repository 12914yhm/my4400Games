# 海上保卫战 · 实录音效来源

本目录中的 MP3 为以下 CC0 素材的剪辑与混音版本，允许随游戏分发。
许可：https://creativecommons.org/publicdomain/zero/1.0/

## 枪械录音

- The Free Firearm Sound Library
- 录制：Ben Jaszczak、Brian Nelson、Kevin Heras、Matthew Nanney
- 来源：https://opengameart.org/node/21826
- 原包：https://opengameart.org/sites/default/files/Prepared%20SFX%20Library.7z
- 轻型机枪：AK-47 / C_28P.wav；双联机枪：Carl Gustav M45 / G_31P.wav；速射机炮：PPSh / P_30P.wav；扩散火炮：Winchester Model 12 / K_22P.wav。
- 从分离的单发录音中选取多次射击，保留环境衰减；双联和扩散做轻微叠层，调整部分音高、增加少量扩散混响，压缩动态并淡出切口。这些是游戏音效配音，不声称与游戏中虚构炮塔的真实型号对应。

## 火炮录音

- Cannon Shot — qubodup / Iwan Gabovitch
- 来源：https://freesound.org/people/qubodup/sounds/187767/
- 作者标注为美国政府机构视频中的炮声，CC0 / Public Domain。
- 本次使用该页面公开提供的高质量 MP3 预览：https://cdn.freesound.org/previews/187/187767_71257-hq.mp3
- 选取两次完整炮响。标准舰炮保留 5.4 秒，重型榴弹炮以 0.86 倍速处理，保留 6 秒；轻微压缩、滤除极低频，保留原始回响。

## 命中与爆炸

- Tiny Naval Battle Sounds Set v2 — qubodup / Iwan Gabovitch
- 来源：https://opengameart.org/content/tiny-naval-battle-sounds-set
- 原包：https://opengameart.org/sites/default/files/qubodup-NavalBattleSoundSet-cc0_0.7z
- 采用 2014 年更新版 ExplosionMetal.wav；原包说明明确其源为 https://www.freesound.org/people/qubodup/sounds/67474/，替换了旧版有争议的素材。
- 降速、轻微压缩及淡出，用于击沉与基地受击。

## 舰船受击与沉没补充素材

- 继续使用上方同一 CC0 v2 素材包的 `ExplosionMetal.wav`、`Splash.wav`、`SplashGverb.wav` 与 `WaterSurfaceExplosion02/04/06/07/08.wav`。
- `hull-small/medium/large/sub` 分别对应小艇、普通舰船、重舰和潜艇的受击声；`sink-small/medium/large/sub` 对应其沉没声。护盾受击采用程序合成，护盾舰沉没使用中型舰船录音。
- 各音轨经过剪辑、轻度变速和分层混音，保留水花与爆炸的自然余韵。可用 `build-impacts.py` 从上述原素材重新生成；文件摘要与来源见 `manifest.json`。
- 炮弹飞行的风切声由 Web Audio 根据实际在场炮弹生成，弹体消失时淡出，暂停或静音时立即停止。这一声效是程序设计音效，并非实录。

各文件剪辑时间、变速和摘要见仓库 manifest.json，可用 build.py 从原素材重建。激光、电弧等虚构武器仍为程序设计音效，并非实录。
