# 广垦沉香 AI 产业大脑 · 前端复刻

## 在线预览

- GitHub Pages：https://xinwei5282-sys.github.io/chenxiang-ai-dashboard/
- 仓库：https://github.com/xinwei5282-sys/chenxiang-ai-dashboard
- Pages 从 `main` 分支根目录自动部署；静态入口无需构建。资源使用相对路径，兼容仓库子目录与本地预览。

按2026-09-11客户提供的选定图 `assets/selected/reference.png` 复刻。当前推荐预览： http://127.0.0.1:4187/ 。前端展示（背景视频自动循环），不接真实业务接口或AI服务。

## 当前背景（2026-09-16）

使用用户提供的8秒1080p山谷光球视频，默认静音自动循环播放，无播放控件。六个溯源图标独立覆盖在视频上，文字、指标、面板及数字人保持原有位置。视频位于 `assets/video/valley-sphere-particles-v2-1080p.mp4`，`server.mjs` 提供 MP4 MIME 和字节范围响应。下方早期静态分层记录以本节为准。

## 运行与验证

- `PORT=4187 npm run dev`：启动当前预览。
- `npm run check`：语法检查。
- `npm test`：原有数据模块13项回归检查，独立于本次静态展示数值。
- `npm run verify:ui`：运行中4187页面的素材、整屏适配、无点击反馈与控制台检查。

## 六类分层（当前）

分层检查页： http://127.0.0.1:4187/layers.html 。可单独显示：纯背景、半透明框、10个icon、树/光球/基座/轨道组合、状态条背景、顶底背景。业务文字和数字始终由前端独立渲染。

底图和中心为独立PNG（中心含透明alpha），10个图标是原稿图集上的独立元素；框体、状态条与顶底装饰是独立CSS层。文件与边界见 `assets/layers/README.md`，样式在 `src/layers.css`。不再使用含节点文字的中央整块截图。

## 当前结构

顶部四项指标；左侧AI能力、实时预警样例和品牌故事；中央六环节与沉香树球；右侧数字人插画和产品TOP3；底部四项展示内容。所有主内容同时可见，无路由切换。中心组合图与山林底图是参考生成的独立素材；10个图标以原稿图集独立定位；数字人复用原稿插画区域。标题、指标、六节点文字、左右列表和底部入口为HTML。右下角产品 TOP3 按顺序使用用户提供的马到福来、祥云雅韵A、心灯长明熏香套装原图，统一66×55px缩略图并等比居中裁切铺满；档案和浏览数沿用静态展示样例。Bootstrap Icons以本地SVG文件使用。

以1671×941参考画布整体缩放，非同纵横比视口保留留白；目标1920×1080、1440×900与4K。不是手机纵向信息流。

## 文件

- 入口：`index.html`、`src/screen.mjs`、`src/screen.css`。
- 当前素材：`assets/selected/`；图标：`assets/icons/`。
- 原版备份：`audit/pre-selected-20260911/`。原有数据模块及前版多页代码保留。
- 当前验证：`audit/selected-browser-report.json`、`audit/selected-1671.png`、`audit/selected-1920.png`、`audit/selected-1440.png`与`design-qa.md`。

大屏不提供点击弹窗、悬停高亮或页内全屏按钮；时间仍自动更新。参考图上的监测正常和预警记录都是静态样例；不代表真实监测结果。角色鉴权、数据筛选、导出、实时AI均不在本轮范围。
