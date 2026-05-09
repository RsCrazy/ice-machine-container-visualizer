# Claude.md: Ice-Machine Container Loading Visualizer

## 1. 业务上下文 (Business Context)
* **目标：** 开发一个专为"制冰机"设计的 20 尺集装箱（20GP）装载优化工具。
* **容器参数：** 内径 5898mm(L) x 2352mm(W) x 2393mm(H)。
* **货物约束：**
  1. **禁止翻转：** 只能水平 90 度旋转，严禁侧放或倒置。
  2. **物理承重：** 必须遵循"重下轻上"原则。
  3. **堆码稳定性：** 上层货物底面必须有至少 80% 的面积被下层支撑。

## 2. 核心算法要求 (Algorithm Logic)
* **排序策略：** 输入货物后，优先按 `weight` 降序排列。
* **空间搜索：** 使用极点法（Extreme Point）。在放置每个货物时，检查其下方是否有足够的已放置物体提供支撑。
* **计算目标：** 计算每个货物的 `(x, y, z)` 坐标；若装不下，输出所需集装箱最小数量。

## 3. 3D 可视化规范 (Visual Standards)
* **风格：** 现代轻奢感，深灰色背景（`#121212`），金色金属线框集装箱。
* **分层展示：** Y 轴分层滑块，高于滑块的货物变半透明，金色虚线截面平面。
* **交互：** 鼠标悬停 tooltip 显示型号、重量、支撑率、装载序号；点击货物高亮。

## 4. 核心问题定义 (Problem Definition)
* **目标：** 给定 N 件货物，求最少需要几个 20GP 集装箱装完。
* **算法策略：** 下界估算（体积下界 + 占地面积下界）+ BFD 贪心装箱（极点法）+ 局部搜索消除末尾箱。

## 5. 项目结构 (Project Structure)

```
/
├── index.html                    # 单文件 Three.js 可视化样稿（demo）
├── CLAUDE.md
├── README.md
├── backend/                      # FastAPI 后端
│   ├── app/
│   │   ├── main.py               # FastAPI 入口 + CORS
│   │   ├── models.py             # 数据模型（Item / PlacedItem / Bin / PackResult）
│   │   ├── packing_engine.py     # 三阶段装箱算法
│   │   ├── schemas.py            # Pydantic 请求/响应 schema
│   │   ├── importer.py           # Excel / JSON 解析
│   │   └── routers/
│   │       ├── pack.py           # POST /api/pack
│   │       └── import_.py        # POST /api/import
│   ├── tests/
│   │   └── test_packing.py       # 31 个单元测试
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                     # Vite + React + TypeScript 前端
│   ├── src/
│   │   ├── api/client.ts         # fetch 封装（pack / import）
│   │   ├── types/api.ts          # TS 类型（与后端 schema 对齐）
│   │   ├── store/useAppStore.ts  # Zustand 全局状态 + localStorage 类型库
│   │   └── components/
│   │       ├── Scene/            # R3F 3D 场景（ContainerMesh / PlacedItemMesh / LayerPlane / Tooltip）
│   │       ├── Sidebar/          # 左侧面板（CargoList / ItemForm / TypeManager / StatsPanel）
│   │       ├── Controls/         # 分层滑块 / 多箱 Tab
│   │       ├── SectionView/      # 右侧截面视图（Canvas 2D 俯视 + 侧面）
│   │       └── Upload/           # 拖拽上传 Excel / JSON
│   ├── vite.config.ts            # /api 代理到 localhost:8000
│   └── package.json
└── .venv/                        # Python 虚拟环境（项目根）
```

## 6. API 接口 (API Reference)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET  | `/health` | 健康检查 |
| POST | `/api/pack` | 接收货物清单 JSON，返回装箱方案 |
| POST | `/api/import` | 上传 Excel / JSON 文件，解析后直接返回装箱结果 |

交互文档：`http://localhost:8000/docs`

## 7. 任务清单 (Tasks)

### ✅ 已完成

#### 可视化样稿
- [x] `index.html` — 单文件 HTML + Three.js 3D 可视化 demo
  - 深灰背景 + 金属线框 20GP 集装箱
  - 货物按重量降序排列，颜色分型号
  - 鼠标悬停 tooltip（型号、重量、支撑率、装载顺序）
  - 分层滑块（沿 Y 轴截面，金色虚线标注高度）
  - 右侧截面视图：俯视截面图（X-Z）+ 侧面立面图（X-Y）
  - 左侧货物清单，点击高亮
  - 统计面板（件数 / 体积利用率 / 总重量）

#### 后端
- [x] `backend/app/models.py` — 数据模型（Item / PlacedItem / Bin / PackResult）
- [x] `backend/app/packing_engine.py` — 三阶段装箱算法
  - Phase 1: 按重量 DESC、体积 DESC 排序
  - Phase 2: BFD 贪心 + 极点法（Extreme Point）三维放置
  - Phase 3: 局部搜索（尝试消除末尾集装箱）
  - 支撑率校验（≥ 80%）、碰撞检测、容器边界检测
  - `compute_lower_bound()` — 理论最小箱数估算
- [x] `backend/tests/test_packing.py` — 31 个测试用例，全部通过（0.02s）
- [x] `backend/app/schemas.py` — Pydantic 请求/响应 schema
- [x] `backend/app/importer.py` — Excel（openpyxl）和 JSON 解析逻辑
- [x] `backend/app/routers/pack.py` — `POST /api/pack`
- [x] `backend/app/routers/import_.py` — `POST /api/import`
- [x] `backend/app/main.py` — FastAPI 入口，CORS，注册路由
- [x] `backend/Dockerfile` — 容器化部署

#### 前端（正式版）
- [x] 脚手架：Vite + React 18 + TypeScript + Tailwind CSS v3
- [x] React Three Fiber 3D 渲染（金色线框集装箱 + 彩色货物色块）
- [x] OrbitControls 轨道相机 + GizmoHelper 方向指示器
- [x] 悬停 Tooltip（型号 / 重量 / 支撑率 / 装载序号 / 旋转标记）
- [x] 分层滑块（Y 轴截面，高于滑块货物变半透明）
- [x] 多箱 Tab 切换（结果含多个容器时自动显示）
- [x] 左侧双 Tab：「货物清单」+ 「类型库」
- [x] 货物清单：点击高亮 + 3D 场景同步聚焦
- [x] 统计面板（件数 / 填充率 / 重量 / 最优标记）
- [x] 手动添加货物（带类型选择器 + 数量输入，批量添加）
- [x] 类型库（localStorage 持久化，可增删，预置 4 个默认类型）
- [x] 文件上传 UI（拖拽 / 点击，支持 .xlsx / .json）
- [x] 右侧截面视图（Canvas 2D 俯视图 X-Z + 侧面立面图 X-Y，同步高亮）
- [x] 接入后端 API（`/api/pack` + `/api/import`，Vite proxy）
- [x] 导出报告占位按钮
- [x] 前后端联调（CORS 配置 + 数据格式对齐）

---

- [x] 货物清单「删除单件」按钮（悬停显示 ✕，点击移除）
- [x] 货物清单滚动修复（`min-h-0` 修正 flex 布局，货物多时正确滚动）
- [x] 部署方案（`docker-compose.yml` + 前端多阶段 Dockerfile + Nginx 反向代理）

### 🔲 待完成

#### Integration & Polish
- [ ] 结果导出（装箱报告 PDF / Excel）
- [ ] 相机飞向点击货物的动画（useFrame + lerp）
