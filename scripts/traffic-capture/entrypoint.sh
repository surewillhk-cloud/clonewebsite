#!/bin/sh
# 流量抓包容器入口脚本
# 1. 启动 mitmdump（代理 8080）
# 2. 启动 Android 模拟器，配置代理
# 3. 安装并启动 APK
# 4. 等待抓取时长后退出

set -e
DURATION=${CAPTURE_DURATION:-90}
APK_PATH="/apk/app.apk"
OUTPUT_DIR="/output"

mkdir -p "$OUTPUT_DIR"

# 若无可执行 emulator（非 Android 镜像），则只运行 mitmdump 做占位
# 生产环境需使用含 Android SDK 的镜像（如 budtmo/docker-android）
if command -v mitmdump &>/dev/null; then
  echo "[traffic-capture] Starting mitmdump..."
  mitmdump -s /scripts/export_flows.py --set export_dir="$OUTPUT_DIR" -p 8080 &
  MITM_PID=$!
  sleep 3
fi

# 若有 adb 和 emulator，则启动模拟器并安装 APK
if command -v adb &>/dev/null && command -v emulator &>/dev/null; then
  echo "[traffic-capture] Starting emulator with proxy..."
  export EMULATOR_ARGS="-http-proxy 127.0.0.1:8080 -no-snapshot-load"
  emulator -avd Pixel_4_API_30 -no-snapshot -http-proxy 127.0.0.1:8080 &
  echo "[traffic-capture] Waiting for device..."
  adb wait-for-device
  # 等待 boot 完成
  while ! adb shell getprop sys.boot_completed 2>/dev/null | grep -q 1; do
    sleep 5
  done
  echo "[traffic-capture] Installing APK..."
  adb install -r "$APK_PATH" || true
  # 启动主 Activity（从 aapt 或默认）
  PKG=$(aapt dump badging "$APK_PATH" 2>/dev/null | grep package | sed "s/.*name='\([^']*\)'.*/\1/" | head -1)
  if [ -n "$PKG" ]; then
    ACTIVITY=$(aapt dump badging "$APK_PATH" 2>/dev/null | grep "launchable-activity" | sed "s/.*name='\([^']*\)'.*/\1/" | head -1)
    if [ -n "$ACTIVITY" ]; then
      adb shell am start -n "$ACTIVITY" || true
    else
      adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 || true
    fi
  fi
fi

echo "[traffic-capture] Capturing for ${DURATION}s..."
sleep "$DURATION"

if [ -n "$MITM_PID" ]; then
  kill "$MITM_PID" 2>/dev/null || true
fi

echo "[traffic-capture] Done."
