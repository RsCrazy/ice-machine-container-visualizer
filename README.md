# 制冰机集装箱装载可视化工具

专为制冰机出口设计的 20GP 集装箱 3D 装载优化工具。输入货物清单，自动计算最少需要几个集装箱、每件货物放在哪个位置，并在浏览器中实时 3D 可视化。

---

## 功能概览

- **装载优化算法**：三阶段策略（BFD 贪心 + 极点法 + 局部搜索），逼近理论最优箱数
- **物理约束**：货物禁止倒置/侧放，重货优先落底，叠放支撑率 ≥ 80%
- **3D 可视化**：React Three Fiber 渲染，金属线框集装箱，鼠标交互
- **多箱浏览**：结果包含多个集装箱时可逐箱查看
- **分层查看**：Y 轴滑块截面，逐层观察装载方案
- **截面分析**：右侧实时俯视图（X-Z）+ 侧面立面图（X-Y）
- **类型库**：本地保存常用货物型号规格，选类型一键批量添加
- **文件导入**：支持拖拽上传 Excel（.xlsx）或 JSON 货物清单

---

## 快速开始

### 环境要求

| 工具 | 最低版本 |
|------|---------|
| Python | 3.9+ |
| Node.js | 18+ |
| npm | 9+ |

### 第一步：克隆并安装依赖

```bash
# 创建 Python 虚拟环境（项目根目录）
python3 -m venv .venv
source .venv/bin/activate      # macOS / Linux
# .venv\Scripts\activate       # Windows

# 安装后端依赖
pip install -r backend/requirements.txt

# 安装前端依赖
cd frontend && npm install && cd ..
```

### 第二步：一键启动 / 关闭

安装完依赖后，使用项目根目录下的脚本管理服务：

```bash
# 启动前端 + 后端
./start.sh

# 关闭所有服务
./stop.sh
```

| 脚本 | 说明 |
|------|------|
| `start.sh` | 同时启动后端（`:8000`）和前端（`:5173`），日志写入 `.logs/` |
| `stop.sh` | 关闭所有服务，优先按 PID 文件关闭，兜底按端口 kill |

启动后访问：
- **前端界面**：`http://localhost:5173`
- **API 文档**：`http://localhost:8000/docs`

### 手动分步启动（可选）

<details>
<summary>展开查看手动命令</summary>

**后端：**
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

**前端（新开终端）：**
```bash
cd frontend
npm run dev
```

</details>

---

## 使用说明

### 基本流程

```
添加货物 → 点击「开始装载」→ 查看 3D 结果
```

### 货物清单操作

**手动添加货物**

1. 切换到「货物清单」Tab，点击右上角「＋ 添加」
2. 从已保存类型中选择一个（自动填充所有规格），或手动填写
3. 调整数量（支持一次添加多件）
4. 点击「添加 N 件」

**从文件导入**

1. 在左侧面板底部的「导入文件」区域拖入文件，或点击选择文件
2. 支持格式：
   - **Excel**（.xlsx）：需包含列 `name / model / length / width / height / weight`，可选列 `allow_free_rotation`
   - **JSON**（.json）：格式为对象数组，必填字段同上，`allow_free_rotation` 可选
3. 导入后自动运行装箱算法并显示结果

Excel 示例格式：

| name | model | length | width | height | weight | allow_free_rotation |
|------|-------|--------|-------|--------|--------|---------------------|
| A-001 | IcePro-L1500 | 760 | 690 | 1580 | 162 | 0 |
| B-001 | IcePro-M1200 | 640 | 610 | 1280 | 118 | 1 |
| C-001 | IceMini-700 | 500 | 480 | 700 | 60 | （可省略，默认 0）|

> `allow_free_rotation` 列**可省略**（整列不存在等同于全部为 `0`）。合法值：`1` / `0`、`TRUE` / `FALSE`、`YES` / `NO`（不区分大小写）。

JSON 示例格式：

```json
[
  { "name": "A-001", "model": "IcePro-L1500", "length": 760, "width": 690, "height": 1580, "weight": 162 },
  { "name": "B-001", "model": "IcePro-M1200", "length": 640, "width": 610, "height": 1280, "weight": 118, "allow_free_rotation": true }
]
```

> `allow_free_rotation` 键**可省略**，缺失时默认 `false`。  
> 所有尺寸单位为 **毫米（mm）**，重量单位为 **千克（kg）**

### 类型库

切换到「类型库」Tab 可管理常用货物型号：

- 已保存的类型卡片上悬停可看到删除按钮（✕）
- 点击「＋ 新增类型」填写型号名称和规格后保存
- 类型数据保存在浏览器本地（localStorage），刷新页面后保留
- 预置了 4 个默认类型：IcePro-L1500 / IcePro-M1200 / IceMid-S900 / IceMini-700

### 3D 视图交互

| 操作 | 效果 |
|------|------|
| 鼠标左键拖拽 | 旋转视角 |
| 鼠标右键拖拽 / 中键 | 平移 |
| 滚轮 | 缩放 |
| 悬停货物 | 显示 tooltip（型号 / 重量 / 支撑率 / 装载序号） |
| 点击货物 | 高亮该货物（左侧清单同步高亮） |
| 点击左侧货物卡片 | 在 3D 视图中高亮对应货物 |
| 点击空白处 | 取消高亮 |

### 分层查看

拖动底部「分层」滑块，高于截面高度的货物变为半透明，截面位置以金色平面标注。

### 多箱切换

装载结果包含多个集装箱时，顶部出现「箱 1 / 箱 2 / …」标签，点击切换查看各箱详情。左侧统计面板和右侧截面视图随之同步更新。

---

## API 说明

### POST /api/pack

手动传入货物清单，返回装箱方案。

**请求体：**
```json
{
  "items": [
    {
      "name": "A-001",
      "model": "IcePro-L1500",
      "length": 760,
      "width": 690,
      "height": 1580,
      "weight": 162
    }
  ],
  "allow_rotation": true
}
```

**响应：**
```json
{
  "bins": [
    {
      "index": 1,
      "placed": [
        {
          "name": "A-001", "model": "IcePro-L1500",
          "x": 0, "y": 0, "z": 0,
          "eff_l": 760, "eff_w": 690, "height": 1580,
          "rotation": 0, "support_ratio": 1.0, "weight": 162
        }
      ],
      "fill_ratio": 0.0439,
      "total_weight_kg": 162,
      "used_volume_mm3": 832272000
    }
  ],
  "unplaced": [],
  "lower_bound": 1,
  "stats": {
    "num_containers": 1, "lower_bound": 1, "gap": 0,
    "total_weight_kg": 162, "volume_util_pct": 4.39,
    "unplaced_count": 0, "items_packed": 1
  }
}
```

### POST /api/import

上传 Excel 或 JSON 文件，解析后自动运行装箱并返回结果。

```bash
curl -X POST http://localhost:8000/api/import \
  -F "file=@cargo.xlsx" \
  -F "allow_rotation=true"
```

响应额外包含 `parsed_items` 字段（解析出的货物列表）。

---

## 运行测试

```bash
cd backend
pytest tests/ -v
# 31 passed in 0.02s
```

---

## 技术栈

| 层 | 技术 |
|----|------|
| 后端算法 | Python 3.9+，纯标准库实现装箱引擎 |
| 后端 API | FastAPI + Pydantic v2 + uvicorn |
| 文件解析 | openpyxl（Excel）+ json（标准库） |
| 前端框架 | Vite + React 18 + TypeScript |
| 3D 渲染 | React Three Fiber + @react-three/drei + Three.js |
| 状态管理 | Zustand |
| 样式 | Tailwind CSS v3 |

---

## 集装箱参数

| 参数 | 数值 |
|------|------|
| 型号 | 20GP（标准 20 尺干货柜）|
| 内长（X 轴） | 5898 mm |
| 内宽（Z 轴） | 2352 mm |
| 内高（Y 轴） | 2393 mm |
| 最小支撑率 | 80%（上层货物底面被支撑面积占比）|
