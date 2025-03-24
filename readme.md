# 🎉 Middlewarerblogin

✨ **一个轻量级中间件，将彩虹聚合登录 API 转换为标准 OAuth2 协议**  
🌉 专为 Cloudflare Workers 设计 | 🔌 即插即用 | 🚀 快速部署

[![Apache-2.0 License](https://img.shields.io/badge/License-Apache%202.0-blue.svg?style=flat)](LICENSE)

---

## 🚀 快速开始

### 📦 前置要求
- Cloudflare 账号
- 已安装 [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)(可选)

### ⚙️ 部署步骤

#### **方式一：使用 Wrangler CLI 部署**

1. **导入代码**  
   📥 将仓库中的 `worker.js` 文件复制到您的 Cloudflare Workers 项目中。

2. **修改配置信息**  
   🔧 编辑 `worker.js` 中的配置数组：
   
   ```javascript
   const configs = [
     {
       appid: "YOUR_APP_ID",          // 🆔 替换为你的应用 ID
       appkey: "YOUR_APP_SECRET",     // 🔑 替换为你的应用密钥
       rblogin_api: "RBLOGIN_API_URL" // 🌈 替换为彩虹登录 API 地址
     }
   ];
   ```

3. **绑定 KV 数据库**  
   执行以下命令创建 KV 命名空间：
   
   ```bash
   wrangler kv:namespace create AUTH_STORE
   ```

   📝 复制生成的命名空间 ID，并添加到 `wrangler.toml` 配置文件中：
   
   ```toml
   kv_namespaces = [
     { binding = "AUTH_STORE", id = "YOUR_NAMESPACE_ID" }
   ]
   ```

4. **部署 Worker**  
   🚀 执行以下命令进行部署：
   
   ```bash
   wrangler deploy
   ```

---

#### **方式二：使用 Cloudflare Web 面板部署**

1. **进入 Cloudflare Workers 面板**  
   访问 [Cloudflare Workers](https://dash.cloudflare.com/) 并登录。

2. **创建新的 Worker**  
   - 在左侧菜单选择 `Workers & Pages` → `Create Application`
   - 选择 `Create Worker`

3. **导入代码**  
   - 复制 `worker.js` 文件的内容到编辑器
   - 替换 `worker.js` 中的 `appid`、`appkey`、`rblogin_api` 为你的实际配置

4. **绑定 KV 存储**  
   - 在 Worker 编辑页面，点击 `Variables` → `KV Namespace`
   - 创建 `AUTH_STORE` 命名空间
   - 绑定到 Worker

5. **保存并部署**  
   - 点击 `Save and Deploy`

---

## 🔑 使用指南

### 🌐 标准 OAuth2 端点

| 类型              | 端点地址                   |
|-------------------|--------------------------|
| Authorization     | `域名/oauth/authorize`   |
| Token             | `域名/oauth/token`       |
| User Info         | `域名/oauth/userinfo`    |

### ⚠️ 重要配置建议

- 🆔 **Client ID**: 推荐使用 `1000`
- 🔐 **Client Secret**: 推荐使用 `1000`
- 🎯 **Token 认证方式**: `client_secret_post`
- 📄 **响应格式**: `json`
- 📜 **Scope**: 参考 [彩虹登录文档](https://rblogin.lucloud.top/doc.php) 选择登录方式

---

## 📜 License
Apache-2.0 License © 2025 [smikuy]  

💡 **提示**：部署完成后，建议使用 [Postman](https://www.postman.com/) 测试 OAuth2 流程！
