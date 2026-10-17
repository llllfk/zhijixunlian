# 项目上下文

## 项目定位
民航旅客地面服务（值机柜台）语音陪练 Web 应用：学员选画像 → 全屏背景 → 拨打电话 → 挂断 → 训练总结（雷达图 + 改进建议）；含管理后台。手机优先。

## 扣子双智能体接入（关键）
- 配置位集中在 `src/lib/coze.ts`（`COZE_CONFIG`），密钥一律走环境变量，**禁止写死到仓库**。扣子平台自定义变量**不能以 `COZE_` 开头**，统一用 `ZJ_`：
  - `ZJ_TUTOR_BOT_ID`：陪练通话智能体（通话页 SSE 由 `src/app/api/coze/call/route.ts` 消费，未配置回退 `src/lib/mock.ts` 脚本）
  - `ZJ_EVALUATOR_BOT_ID`：训练评价智能体（挂断后由 `src/lib/evaluator.ts` 调用，未配置回退 `mockEval`）
  - `ZJ_API_BASE_URL` / `ZJ_API_TOKEN` / `ZJ_SPACE_ID` / `ZJ_VOICE_ID` / `ZJ_WS_BASE_URL`
- 前端是否 mock 由 `/api/coze/status` 判断。

## 鉴权与数据
- 登录走 Supabase email/password；前端把 `access_token` 放 `x-session` 头；服务端用 `src/lib/server-auth.ts` 的 `resolveAuth`/`requireAdmin` 校验（数据操作统一用 service_role，RLS 仅做封锁）。
- 表：`user_profiles`、`passenger_profiles`、`training_records`（schema 见 `src/storage/database/shared/schema.ts`）。
- 管理员/dev 演示账号：`admin@coze.dev` / `Admin@123456`（由 `scripts/seed-admin.ts` 创建，仅 DEV）。

## API 路由
- 学员：`/api/auth/register`、`/api/auth/me`、`/api/profiles`、`/api/trainings`、`/api/trainings/[id]`
- Coze：`/api/coze/call`（SSE）、`/api/coze/status`
- 管理：`/api/admin/users`、`/api/admin/users/[id]`、`/api/admin/users/[id]/reset-password`、`/api/admin/profiles`、`/api/admin/profiles/[id]`、`/api/admin/records`、`/api/admin/records/[id]`

## 页面
`/login` `/register` /（学员首页）`/train`（画像选择）`/call/[profileId]`（通话）`/result/[id]`（总结）`/records`（记录）`/admin`（后台）。

### 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4

## 目录结构

```
├── public/                 # 静态资源
├── scripts/                # 构建与启动脚本
│   ├── build.sh            # 构建脚本
│   ├── dev.sh              # 开发环境启动脚本
│   ├── prepare.sh          # 预处理脚本
│   └── start.sh            # 生产环境启动脚本
├── src/
│   ├── app/                # 页面路由与布局
│   ├── components/ui/      # Shadcn UI 组件库
│   ├── hooks/              # 自定义 Hooks
│   ├── lib/                # 工具库
│   │   └── utils.ts        # 通用工具函数 (cn)
│   └── server.ts           # 自定义服务端入口
├── next.config.ts          # Next.js 配置
├── package.json            # 项目依赖管理
└── tsconfig.json           # TypeScript 配置
```

- 项目文件（如 app 目录、pages 目录、components 等）默认初始化到 `src/` 目录下。

## 包管理规范

**仅允许使用 pnpm** 作为包管理器，**严禁使用 npm 或 yarn**。
**常用命令**：
- 安装依赖：`pnpm add <package>`
- 安装开发依赖：`pnpm add -D <package>`
- 安装所有依赖：`pnpm install`
- 移除依赖：`pnpm remove <package>`

## 开发规范

### 编码规范

- 默认按 TypeScript `strict` 心智写代码；优先复用当前作用域已声明的变量、函数、类型和导入，禁止引用未声明标识符或拼错变量名。
- 禁止隐式 `any` 和 `as any`；函数参数、返回值、解构项、事件对象、`catch` 错误在使用前应有明确类型或先完成类型收窄，并清理未使用的变量和导入。

### next.config 配置规范

- 配置的路径不要写死绝对路径，必须使用 path.resolve(__dirname, ...)、import.meta.dirname 或 process.cwd() 动态拼接。

### Hydration 问题防范

1. 严禁在 JSX 渲染逻辑中直接使用 typeof window、Date.now()、Math.random() 等动态数据。**必须使用 'use client' 并配合 useEffect + useState 确保动态内容仅在客户端挂载后渲染**；同时严禁非法 HTML 嵌套（如 <p> 嵌套 <div>）。
2. **禁止使用 head 标签**，优先使用 metadata，详见文档：https://nextjs.org/docs/app/api-reference/functions/generate-metadata
   1. 三方 CSS、字体等资源可在 `globals.css` 中顶部通过 `@import` 引入或使用 next/font
   2. preload, preconnect, dns-prefetch 通过 ReactDOM 的 preload、preconnect、dns-prefetch 方法引入
   3. json-ld 可阅读 https://nextjs.org/docs/app/guides/json-ld

## UI 设计与组件规范 (UI & Styling Standards)

- 模板默认预装核心组件库 `shadcn/ui`，位于`src/components/ui/`目录下
- Next.js 项目**必须默认**采用 shadcn/ui 组件、风格和规范，**除非用户指定用其他的组件和规范。**
