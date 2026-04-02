#!/usr/bin/env python3
"""
mitmproxy addon: 将捕获的 flows 导出为 JSONL，供 traffic-capture.ts 解析。
用法: mitmdump -s export_flows.py --set export_dir=/output
需在 addon 加载后设置 export_dir。
"""
import json
import os
from mitmproxy import http
from mitmproxy import ctx


def load(loader):
    loader.add_option(
        name="export_dir",
        typespec=str,
        default="/output",
        help="Directory to write flows.jsonl",
    )


def response(flow: http.HTTPFlow) -> None:
    """每个 HTTP 响应时追加写入 JSONL"""
    export_dir = ctx.options.export_dir
    if not export_dir:
        return
    os.makedirs(export_dir, exist_ok=True)
    path = os.path.join(export_dir, "flows.jsonl")

    # 跳过静态资源
    url = flow.request.pretty_url
    if any(
        url.endswith(ext)
        for ext in (
            ".js",
            ".css",
            ".png",
            ".jpg",
            ".jpeg",
            ".gif",
            ".webp",
            ".ico",
            ".woff",
            ".woff2",
            ".ttf",
        )
    ):
        return

    try:
        req_body = ""
        if flow.request.content:
            try:
                req_body = flow.request.content.decode("utf-8", errors="replace")[:5000]
            except Exception:
                req_body = "(binary)"

        resp_body = ""
        if flow.response and flow.response.content:
            try:
                resp_body = flow.response.content.decode("utf-8", errors="replace")[:10000]
            except Exception:
                resp_body = "(binary)"

        entry = {
            "url": url,
            "method": flow.request.method,
            "path": flow.request.path,
            "requestHeaders": dict(flow.request.headers),
            "requestBody": req_body,
            "responseBody": resp_body,
            "responseStatus": flow.response.status if flow.response else 0,
        }
        with open(path, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except Exception as e:
        ctx.log.warn(f"export_flows: {e}")
