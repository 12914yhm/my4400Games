# 海战武器素材 v1

六张独立透明 PNG，由内置 image_gen 生成，完整提示词及来源保存在 PROMPTS.json。

| 文件 | 用途 |
| --- | --- |
| weapon-cannon-v1.png | 标准舰炮 |
| weapon-spread-v1.png | 扩散火炮 |
| weapon-howitzer-v1.png | 重型榴弹炮 |
| weapon-machinegun-v1.png | 轻型机枪 |
| weapon-twin-v1.png | 双联机枪 |
| weapon-rapid-v1.png | 速射机炮 |

均为 1254 × 1254 像素、俯视朝右，用于武器库卡片及战场炮塔。原始透明通道保留。主炮画布锚点约 (0.35, 0.49)，副武器作为较小的同向炮座绘制。浏览器加载后缓存缩小的 Canvas 纹理，避免每帧处理原始尺寸。新纹理不可用时继续使用旧炮塔与基础绘制。

素材文件部署到 /games/art/sea/，账号服务无需重启。图片不改变武器数值或解锁进度。
