/**
 * APP 分析模块 - 第四阶段
 * 截图模式：Claude Vision 分析界面结构
 * APK 模式：apktool 反编译 + Claude 分析布局 XML
 * 流量模式：APK 布局 + mitmproxy 抓包 API 端点
 */

export { analyzeAppScreenshots } from './screenshot-analyzer';
export { analyzeApk } from './apk-analyzer';
export { captureTrafficFromApk, isTrafficCaptureAvailable } from './traffic-capture';
