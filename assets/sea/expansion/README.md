# 扩展战役素材

五种科技武器与四类特殊敌舰使用原创 SVG，生成源为 generate.py 和 generate_distinct.py。导弹舰、护盾双体舰、维修驳船、无畏舰分别采用不同船体轮廓，取代早期共用的船壳。均为透明背景、朝右的俯视图；使用 SVG 保持手机屏幕清晰。

运行 `python assets/sea/expansion/generate.py` 可重新生成。原冲撞艇 SVG 保留为历史源，游戏改用 `assets/sea/fleet-v2/fuel-boat-v2.png`。运行时入口需同步 server.js、sea-art.js 和 deploy/build.js。
