# 🎉 Middlewarerblogin

✨ **一个轻量级中间件，将彩虹聚合登录 API 转换为标准 OAuth2 协议**  
🌉 **专为 Cloudflare Workers 设计** | 🔌 **即插即用** | 🚀 **快速部署**

[![Apache-2.0 License](https://img.shields.io/badge/License-Apache%202.0-blue.svg?style=flat)](LICENSE)

---

## 🚀 快速开始

### 📦 前置要求
- **Cloudflare 账号**

### ⚙️ 部署步骤

#### **使用 Cloudflare Web 面板部署**

1. **进入 Cloudflare Workers 面板**  
   - 访问 [Cloudflare Workers](https://dash.cloudflare.com/) 并登录。

2. **创建新的 Worker**  
   - 在左侧菜单选择 **`Workers & Pages`** → **`Create`** → **`Workers`**  
   - 选择 **`Hello World`**  
   - 点击 **`Deploy`**  

3. **创建新的 KV 数据库**  
   - 在左侧菜单选择 **`Storage & Databases`** → **`KV`** → **`Create`**  
   - 输入 **`Namespace`**  
   - 点击 **`Add`**  

4. **绑定 KV 存储**  
   - 在 Worker 编辑页面，点击 **`Settings`** → **`Bindings`**  
   - 点击 **`Add`**  
   - 选择 **`KV namespace`**  
   - **`Variable name`** 填写 **`AUTH_STORE`**  
   - **`KV namespace`** 选择刚刚创建的  
   - 点击 **`Deploy`**  

5. **导入代码**  
   - 复制 **`worker.js`** 文件的内容到编辑器  
   - 替换 **`worker.js`** 中的 **`appid`**、**`appkey`**、**`rblogin_api`** 为你的实际配置  

6. **保存并部署**  
   - 点击 **`Deploy`**  

---

## 🔑 使用指南

### 🌐 标准 OAuth2 端点

| 类型          | 端点地址                  |
|--------------|--------------------------|
| Authorization | `域名/oauth/authorize`  |
| Token        | `域名/oauth/token`       |
| User Info    | `域名/oauth/userinfo`    |

### ⚠️ 重要配置建议

- 🆔 **Client ID**：推荐使用 `1000`
- 🔐 **Client Secret**：推荐使用 `1000`
- 🎯 **Token 认证方式**：`client_secret_post`
- 📄 **响应格式**：`json`
- 📜 **Scope**：参考 [彩虹登录文档](https://rblogin.lucloud.top/doc.php) 选择登录方式

---

## 📜 License

**Apache-2.0 License © 2025 [smikuy]**  

💡 **提示**：部署完成后，建议使用 [Postman](https://www.postman.com/) 测试 OAuth2 流程！
