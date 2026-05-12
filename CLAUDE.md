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

---

## 8. 新功能实现计划

### Feature A：多集装箱类型库 + 最低费用优化

**目标：** 用户可自定义多种集装箱规格（尺寸 + 单价），系统对每种集装箱类型分别运行装箱算法，比较总费用（箱数 × 单价），自动推荐最优方案，结果保存到 localStorage。

#### A-1 算法策略
- 对每种用户选中的集装箱类型分别运行独立的 BFD + EP 装箱，得到 `n_bins`
- 总费用 = `n_bins × cost_per_bin`
- 比较所有类型，返回费用最低方案作为主结果，同时附带完整对比列表
- 不做"混箱"组合（不同类型集装箱混用），降低复杂度，实际业务中通常单类型采购

#### A-2 后端改动

| 文件 | 改动内容 |
|------|----------|
| `models.py` | 新增 `ContainerSpec(name, L, W, H, cost_usd)` dataclass；`Bin` 新增 `spec_name: str` 字段记录所属类型 |
| `schemas.py` | 新增 `ContainerTypeIn(name, length, width, height, cost_usd)`；`PackRequest` 新增 `container_types: list[ContainerTypeIn]`（默认含 20GP）；`BinOut` 新增 `container_type: str`；`PackResponse` 新增 `cost_comparison: list[CostComparisonItem]`（每条含 type_name / num_bins / total_cost） |
| `packing_engine.py` | `pack()` 接收 `container_spec: ContainerSpec` 参数（默认 20GP）；新增 `pack_best_cost(items, specs)` 循环所有类型，返回最低费用的 PackResult + 完整对比表 |
| `routers/pack.py` | 调用 `pack_best_cost`，把 `cost_comparison` 写入响应 |

#### A-3 前端改动

| 文件 | 改动内容 |
|------|----------|
| `types/api.ts` | 新增 `ContainerType { id, name, length, width, height, cost }`；`BinOut` 新增 `container_type: string`；`PackResponse` 新增 `cost_comparison` |
| `store/useAppStore.ts` | 新增 `containerTypes: ContainerType[]` + CRUD + localStorage（key: `ice-machine-container-types`）；预置 20GP / 40GP / 40HC；新增 `selectedContainerIds: string[]`（默认全选） |
| `Sidebar/ContainerManager.tsx` | 新组件：列表展示容器规格，支持新增 / 删除 / 勾选参与本次运算；字段：名称、长宽高（mm）、单价（USD） |
| `Sidebar/LeftPanel.tsx` | 左侧 Tab 从"货物清单 / 类型库"扩展为"货物清单 / 类型库 / 集装箱" |
| `api/client.ts` | `packItems()` 增加 `containerTypes` 参数，序列化到请求体 |
| `Controls/BinTabs.tsx` | Tab 标题显示 `容器类型名 #编号`（如 `40GP #2`） |
| `Sidebar/StatsPanel.tsx` | 新增费用对比表：每行显示类型名、箱数、总费用，最优行金色高亮 |
| `Scene/ContainerMesh.tsx` | 根据当前箱的 L/W/H 动态绘制线框，而非硬编码 20GP 尺寸 |

---

### Feature B：货物类型自由旋转（6 朝向）

**目标：** 部分货物型号可以以任意朝向（将任一维度作为竖直方向）放入集装箱，不再限制"竖直高度固定"，但仍须平稳放置（底面水平）。在 TypeManager 中为每种型号设置 `allow_free_rotation` 开关。

#### B-1 旋转编码扩展（6 朝向）

| 编码 | 底面 (eff_l × eff_w) | 实际高度 (eff_h) | 说明 |
|------|----------------------|------------------|------|
| 0 | L × W | H | 原始直立（默认） |
| 1 | W × L | H | 水平旋转 90°（现有逻辑） |
| 2 | L × H | W | W 朝上 |
| 3 | H × L | W | W 朝上 + 底面旋转 |
| 4 | W × H | L | L 朝上 |
| 5 | H × W | L | L 朝上 + 底面旋转 |

#### B-2 后端改动

| 文件 | 改动内容 |
|------|----------|
| `models.py` | `Item` 新增 `allow_free_rotation: bool = False`；`PlacedItem` 废弃从 `rotation` 推算 `eff_l/eff_w` 的方式，改为直接存储 `_eff_l, _eff_w, _eff_h`，rotation 字段保留（0-5）用于前端展示 |
| `schemas.py` | `ItemIn` 新增 `allow_free_rotation: bool = False` |
| `packing_engine.py` | `_try_place()` 中：对 `item.allow_free_rotation=True` 的货物，生成全部 6 个 `(eff_l, eff_w, eff_h, rot)` 朝向；支撑率 / 碰撞检测 / 容器边界检测逻辑不变，只需传入不同的 eff_l/eff_w/eff_h |

#### B-3 前端改动

| 文件 | 改动内容 |
|------|----------|
| `types/api.ts` | `ItemType` / `ItemIn` 新增 `allow_free_rotation?: boolean` |
| `store/useAppStore.ts` | `DEFAULT_TYPES` 加入 `allow_free_rotation: false` 字段 |
| `Sidebar/TypeManager.tsx` | 新增"自由旋转"复选框（默认关），保存到类型库 |
| `Sidebar/ItemForm.tsx` | 选中类型后将 `allow_free_rotation` 带入 `ItemIn` |
| `api/client.ts` | `packItems()` 把 `allow_free_rotation` 透传到后端 |
| `Scene/PlacedItemMesh.tsx` | Tooltip 旋转标记扩展至 6 种描述（如"横放 (W向上)"） |

---

### 执行顺序

1. **Feature B-backend**：扩展旋转编码（改动最小，纯后端，先上）
2. **Feature A-backend**：ContainerSpec + pack_best_cost
3. **Feature A-frontend**：ContainerManager + StatsPanel 费用对比
4. **Feature B-frontend**：TypeManager 开关 + Tooltip 描述
5. 端到端联调 + 回归测试

### ✅ 已完成（新功能）

#### Feature A — 集装箱类型库 + 费用优化
- [x] `models.py` — ContainerSpec dataclass；Bin.spec_name；PlacedItem 重构为 eff_l/eff_w/eff_h
- [x] `schemas.py` — ContainerTypeIn / CostComparisonItem；PackRequest / BinOut / PackResponse 扩展
- [x] `packing_engine.py` — pack() 接收 ContainerSpec；pack_best_cost() 多类型比较
- [x] `routers/pack.py` — 接入 pack_best_cost，_build_response 更新
- [x] `types/api.ts` — ContainerType / CostComparisonItem / cost_comparison 类型
- [x] `store/useAppStore.ts` — containerTypes + selectedContainerIds + localStorage；setPackResult 动态 layerHeight
- [x] `Sidebar/ContainerManager.tsx` — 新组件（预置 20GP/40GP/40HC，勾选参与计算）
- [x] `Sidebar/LeftPanel.tsx` — 添加"集装箱"Tab；handlePack 传递 selectedContainers
- [x] `api/client.ts` — containerTypes 参数透传
- [x] `Controls/BinTabs.tsx` — Tab 标题含容器类型名（如"20GP #1"）
- [x] `Sidebar/StatsPanel.tsx` — 费用对比表（金色高亮最优方案）
- [x] `Scene/ContainerMesh.tsx` — 动态尺寸线框（接收 l/w/h props）
- [x] `Scene/ContainerScene.tsx` — 从活跃箱读取 container_l/w/h
- [x] `Controls/LayerSlider.tsx` — 动态 maxH 从活跃箱 container_h
- [x] `SectionView/SectionView.tsx` — 动态容器尺寸 props
- [x] `SectionView/RightPanel.tsx` — 传递容器尺寸；图例显示实际尺寸

#### Feature B — 自由旋转
- [x] `models.py` — Item.allow_free_rotation；PlacedItem 直接存 eff_l/eff_w/eff_h（__post_init__ 向后兼容）
- [x] `schemas.py` — ItemIn.allow_free_rotation
- [x] `packing_engine.py` — _get_orientations() 生成 6 朝向（含去重）；rotation 编码 0-5
- [x] `types/api.ts` — ItemType/ItemIn allow_free_rotation 字段
- [x] `store/useAppStore.ts` — DEFAULT_TYPES 含 allowFreeRotation 字段
- [x] `Sidebar/TypeManager.tsx` — 自由旋转复选框 + 列表显示"自由旋转"徽章
- [x] `Sidebar/ItemForm.tsx` — 从类型读取 allowFreeRotation 并透传
- [x] `api/client.ts` — allow_free_rotation 透传
- [x] `Scene/Tooltip3D.tsx` — 6 种旋转描述（ROTATION_LABELS 字典）

---

## 9. 最优化求解计划（Feature C）

### 背景
当前算法为 BFD 贪心 + EP + 局部搜索（启发式），不保证全局最优。3D-BPP 是 NP-hard 问题，需按规模选择不同策略。

### 三档求解模式

#### C-A：多次随机重启贪心（Multi-Restart Greedy）
- **原理：** 对物品排列加随机扰动，跑 K 次贪心，取最少箱数结果
- **适用规模：** n ≤ 100，K=30 时通常 1-3 秒内完成
- **实现复杂度：** 低（在现有算法外套循环 + 随机 shuffle）

#### C-B：模拟退火（Simulated Annealing on Permutation）
- **原理：** 以物品排列为搜索空间，SA 扰动排列 → 重新运行 EP 装箱 → Metropolis 准则接受/拒绝
- **适用规模：** n ≤ 100，设超时 15 秒
- **实现复杂度：** 中（需调参：初温 / 冷却率 / 邻域操作）

#### C-C：精确 Branch & Bound（真最优）
- **原理：** 枚举放置顺序 + 剪枝（下界 ≥ 当前最优时剪掉）
- **适用规模：** n ≤ 15（超过后指数爆炸，不可用）
- **实现复杂度：** 高

### 落地策略（实际实现）

四档独立模式，用户可自由切换，无规模限制：

```
solve_mode = "fast"         → BFD 贪心（<100ms，默认）
solve_mode = "multi_restart"→ 随机重启贪心 ×30（C-A）
solve_mode = "optimized"    → 模拟退火，每类型 ≤10s（C-B）
solve_mode = "exact"        → 分支限界，无时间限制（C-C）
```

### ✅ 已完成（Feature C）

- [x] `packing_engine.py` — `multi_restart_pack(k=30)`（C-A）
- [x] `packing_engine.py` — `simulated_annealing_pack(time_limit=10)`（C-B）
- [x] `packing_engine.py` — `branch_and_bound_pack()`，前瞻剪枝 + 严格 `>` 条件（C-C）
- [x] `packing_engine.py` — `pack_best_cost()` 统一分发入口，支持 `cancel: threading.Event`
- [x] `packing_engine.py` — 所有求解函数接受 `cancel` 参数，热循环内检查 `cancel.is_set()`
- [x] `schemas.py` — `solve_mode: Literal["fast","multi_restart","optimized","exact"]`；`solve_time_ms` / `solve_mode_used`
- [x] `routers/pack.py` — async handler，`run_in_executor` + 300ms 轮询 `request.is_disconnected()`，客户端断开时设置 cancel 事件
- [x] `types/api.ts` — `solve_mode` / `solve_time_ms` / `solve_mode_used` TS 类型
- [x] `store/useAppStore.ts` — `solveMode` 四档状态 + setter
- [x] `Sidebar/LeftPanel.tsx` — 四档求解模式 Toggle + B&B 大规模警告（>15 件）+ 终止运算按钮
- [x] `Sidebar/StatsPanel.tsx` — 显示实际求解耗时 + 算法名
- [x] 修复 B&B 剪枝条件 `>=` → `>`（原条件导致退化为贪心结果）
- [x] 修复体积下界非法使用占地面积（堆叠时占地下界无效，改为纯体积 LB）
- [x] 43 个单元测试全部通过（新增 TestMultiRestart / TestSimulatedAnnealing / TestBranchAndBound）
