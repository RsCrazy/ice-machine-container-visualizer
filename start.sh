#!/bin/bash

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$PROJECT_DIR/.logs"
mkdir -p "$LOG_DIR"

# 检查端口是否已被占用
check_port() {
  lsof -ti:"$1" > /dev/null 2>&1
}

if check_port 8000; then
  echo "⚠️  端口 8000 已被占用，后端可能已在运行"
else
  echo "▶ 启动后端 (FastAPI @ :8000)..."
  cd "$PROJECT_DIR/backend"
  "$PROJECT_DIR/.venv/bin/uvicorn" app.main:app --host 127.0.0.1 --port 8000 \
    > "$LOG_DIR/backend.log" 2>&1 &
  echo $! > "$LOG_DIR/backend.pid"
  echo "  PID: $(cat "$LOG_DIR/backend.pid")"
fi

if check_port 5173; then
  echo "⚠️  端口 5173 已被占用，前端可能已在运行"
else
  echo "▶ 启动前端 (Vite @ :5173)..."
  cd "$PROJECT_DIR/frontend"
  npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
  echo $! > "$LOG_DIR/frontend.pid"
  echo "  PID: $(cat "$LOG_DIR/frontend.pid")"
fi

echo ""
echo "✅ 服务启动完成"
echo "   前端: http://localhost:5173"
echo "   后端: http://localhost:8000/docs"
echo ""
echo "日志目录: $LOG_DIR"
echo "使用 ./stop.sh 关闭服务"
