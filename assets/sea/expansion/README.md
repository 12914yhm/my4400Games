# 扩展战役素材

五种科技武器与四类特殊敌舰保留原创 SVG 源，生成源为 generate.py 和 generate_distinct.py。导弹舰、护盾舰、维修舰已改用 `assets/sea/fleet-v2/` 中的写实透明 PNG，旧 SVG 留作历史素材；无畏舰继续使用独立 SVG 舰型。

运行 `python assets/sea/expansion/generate.py` 可重新生成 SVG。原冲撞艇 SVG 也保留为历史源，游戏改用 `assets/sea/fleet-v2/fuel-boat-v2.png`。运行时入口需同步 server.js、sea-art.js 和 deploy/build.js。
