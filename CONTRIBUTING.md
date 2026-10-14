# 协作开发

## 开始开发

使用 Node.js 22 或更高版本和 Git。项目使用 Node 内置模块，无第三方 npm 依赖，无需运行 npm install。

```sh
git clone --branch develop git@github.com:12914yhm/my4400Games.git
cd my4400Games
npm run dev
```

打开 http://localhost:5173。默认只监听本机；账号和海战存档自动写入本地 `.data/`，每个开发者使用自己的测试账号。

## 分支和提交

- `develop`：日常开发集成分支，当前完整网站源码在此。
- `main`：目前保留仓库原有初始内容；后续可通过 PR 将经过验证的 develop 合并为稳定版本。
- 各自从最新 develop 建立 `feature/描述` 或 `fix/描述` 分支，再向 develop 提交 Pull Request。

```sh
git switch develop
git pull --ff-only origin develop
git switch -c feature/your-change
# 完成修改并验证后
git add <需要提交的文件>
git commit -m "描述具体改动"
git push -u origin feature/your-change
```

PR 请说明修改内容、验证方式；界面变化附桌面或手机截图。合并前解决冲突并重新测试。

## 提交前验证

```sh
npm run check
npm test
```

游戏逻辑位于 `*-engine.js`，展示和输入位于 `sea.js` / `balls.js`，账号接口位于 `accounts-api.js`。涉及海战进度结构时，需同时检查前后端共享的 `sea-save.js`，保持旧存档可读取。涉及触控或全屏时，检查横屏、竖屏、退出全屏、多指操作和暂停；浏览器模拟不能替代手机实机验证。

素材位于 `assets/sea/`，保留相应生成提示词。新增运行时资源时同步更新 `server.js` 和 `deploy/build.js` 的文件列表。

## 本地数据和发布

不要提交真实账号、存档、密钥、环境文件或服务器备份。`.gitignore` 已排除 `.data/`、日志、发布包、构建目录及本机发布记录。

部署说明见 [deploy/README.md](deploy/README.md)。其中配置针对当前 ECS，换服务器前需要调整域名、路径和服务配置。推送 GitHub 不会自动发布网站，生产发布由具备服务器权限的人单独执行。
