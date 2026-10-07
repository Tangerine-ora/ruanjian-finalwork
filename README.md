# 智慧自习室信息与数据展示中心

软件开发综合实践期末大作业（个人独立完成）。作品围绕**校园自习室**这一学习生活场景，
构建一个信息与数据展示中心响应式前端应用：查空闲自习室、看座位与人流统计、
逛三维楼层导览，一个站点完成。

纯静态前端项目，**不需要后端服务器、不需要安装任何依赖**；所有第三方库均为本地离线文件。

## 功能模块

| 页面 | 文件 | 功能 |
| --- | --- | --- |
| 信息首页 | `index.html` | 主题横幅、基于 JSON 的实时概况卡片、四模块导航、入馆须知 |
| 自习室查询 | `rooms.html` | 关键词搜索、楼宇/状态组合筛选、空结果提示；模态框**添加**自习室（表单校验、localStorage 持久化、可删除本地登记） |
| 数据统计 | `stats.html` | ECharts 三类图表：各楼宇座位堆叠**柱状图**、开放状态**饼图**、一周人次与上座率双轴**折线图** |
| 三维导览 | `scene.html` | Three.js 三维自习区沙盘：按上座率着色、悬停高亮、**点击房间查看实时座位**、自动旋转、视角复位，支持触屏 |

响应式：基于 Bootstrap 栅格与折叠导航栏，适配手机（390px）到桌面（1280px+）。

## 技术栈

- HTML5 语义化结构 + CSS3
- Bootstrap 5（布局、组件、表单校验样式、模态框、Toast）
- jQuery 3.7.1（AJAX 加载 JSON、DOM 操作、事件委托）
- ECharts 5（三类数据图表）
- Three.js + OrbitControls（三维场景、射线拾取交互）
- 数据：本地 JSON（`data/rooms.json`、`data/flow.json`）
- 本地存储：localStorage（保存用户自行添加的自习室）

## 目录结构

```
ruanjian-finalwork/
├── index.html          信息首页
├── rooms.html          自习室查询 / 管理
├── stats.html          数据统计
├── scene.html          三维导览
├── favicon.svg         站点图标
├── css/
│   └── style.css       全站自定义样式
├── js/
│   ├── common.js       公共：导航高亮、JSON 统一加载与错误提示、HTML 转义
│   ├── index.js        首页概况
│   ├── rooms.js        查询、筛选、添加/删除
│   ├── stats.js        三个 ECharts 图表
│   └── scene.js        Three.js 三维场景
├── data/
│   ├── rooms.json      12 间自习室的实时信息（座位、状态、标签等）
│   └── flow.json       一周入馆人次、上座率等统计数据
└── libs/               Bootstrap / jQuery / ECharts / Three.js 本地离线库
```

## 快速开始

> ⚠️ 不要直接双击打开 HTML。`file://` 协议下浏览器会拦截 `fetch/AJAX` 读取本地 JSON，
> 页面会提示“请用本地服务器访问”。请任选下面一种方式启动本地 HTTP 服务。

### 方式一：Python（推荐，Python 3 自带）

在**项目根目录**打开命令行，执行：

```bash
python -m http.server 8000
```

然后浏览器访问：<http://localhost:8000/index.html>

停止服务：在命令行窗口按 `Ctrl + C`。

### 方式二：VS Code Live Server

1. 在 VS Code 扩展市场安装 “Live Server”；
2. 用 VS Code 打开本项目文件夹；
3. 右键 `index.html` → “Open with Live Server”，浏览器会自动打开页面。

### 方式三：任意静态服务器

Node.js 环境可用 `npx serve .`；其它如 nginx、IIS、phpStudy 等，
只要把站点根目录指向本文件夹即可。

## 数据说明

- `data/rooms.json`：12 间自习室，字段包括名称、楼宇、楼层、类型、总座位、
  当前已占用、开放状态、开放时间、设施标签。
- `data/flow.json`：本周每日入馆人次、平均上座率、时段人流与满意度。

数据均为课程模拟数据，并非真实统计。替换 JSON 内容后刷新页面即可看到新数据，
无需修改代码（新增/删除房间时图表与三维场景会自动重新聚合）。

## 错误提示设计

| 异常情况 | 页面表现 |
| --- | --- |
| 直接双击打开（file:// 协议） | 红色错误条明确提示“请用本地服务器访问”，附重新加载按钮 |
| 网络失败 / 404 / 请求超时 | 错误条给出具体原因与“重新加载”按钮，页面不白屏 |
| JSON 格式错误 | 提示解析失败原因；统计页还会校验字段数量是否一致 |
| 数据为空 | 提示“数据为空，请联系管理员更新”，不显示误导性的 0 |
| 搜索无结果 | 卡片区域显示“没有符合条件的自习室”空状态 |
| 表单非法输入（名称长度、楼层范围、占用数大于座位数等） | 字段级红框 + 原因说明 + 顶部 Toast，拒绝提交 |
| 添加同名自习室 | 名称字段标红并提示，拒绝重复登记 |

## 浏览器要求

Edge / Chrome / Firefox 近两年的版本均可。三维场景需要支持 WebGL
（默认开启）；手机浏览器支持单指旋转、双指缩放。

## Git 提交规范

提交记录使用 Conventional Commits 风格：`type(scope): 中文说明`，
type 包括 `chore`、`feat`、`fix`、`docs`。查看历史：

```bash
git log --oneline
```

仓库地址：<https://github.com/Tangerine-ora/ruanjian-finalwork>
