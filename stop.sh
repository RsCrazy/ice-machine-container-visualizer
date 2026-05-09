#!/bin/bash

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$PROJECT_DIR/.logs"

stop_by_pid_file() {
  local name="$1"
  local pid_file="$LOG_DIR/$2.pid"
  if [ -f "$pid_file" ]; then
    local pid
    pid=$(cat "$pid_file")
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid"
      echo "⏹  $name (PID $pid) 已停止"
    else
      echo "ℹ️  $name (PID $pid) 已不在运行"
    fi
    rm -f "$pid_file"
  else
    echo "ℹ️  未找到 $name 的 PID 文件，尝试按端口关闭..."
  fi
}

stop_by_port() {
  local name="$1"
  local port="$2"
  local pids
  pids=$(lsof -ti:"$port" 2>/dev/null)
  if [ -n "$pids" ]; then
    echo "$pids" | xargs kill
    echo "⏹  $name (端口 $port，PID $pids) 已停止"
  fi
}

stop_by_pid_file "后端 (FastAPI)" "backend"
stop_by_port "后端 (FastAPI)" 8000

stop_by_pid_file "前端 (Vite)" "frontend"
stop_by_port "前端 (Vite)" 5173

echo ""
echo "✅ 所有服务已关闭"
