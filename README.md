# 懒猫故事机

一个简洁的移动端音频播放器应用，使用 Next.js 和 Tailwind CSS 开发。

## 功能特性

- 🎵 **简洁的音频播放器** - 包含上一首、播放/暂停、下一首、列表四个基本按钮
- 🔐 **管理员密码保护** - 首次访问需要设置管理员密码
- 📚 **专辑管理** - 创建、编辑、删除专辑，支持文件系统浏览选择路径
- 🔍 **自动扫描** - 自动扫描指定路径下的音频文件（支持 mp3, wav, m4a, aac, flac, ogg）
- 📱 **移动端优化** - 专为手机端设计的响应式界面
- 📊 **播放历史** - 记录播放历史，按专辑聚合显示
- 🎧 **播放控制** - 支持音量调节、进度条、播放列表

## 技术栈

- **前端**: Next.js 15, React 19, Tailwind CSS 4
- **后端**: Next.js API Routes
- **数据库**: SQLite (better-sqlite3)
- **图标**: Lucide React
- **密码加密**: bcryptjs

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 环境变量配置

创建 `.env.local` 文件来配置应用参数：

```bash
# 专辑创建上限，默认值为10
MAX_ALBUMS=10
```

### 启动开发服务器

```bash
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000) 访问应用。

## 使用说明

### 1. 首次设置

- 首次访问应用时，需要设置管理员密码
- 密码长度至少6位，用于保护管理功能

### 2. 管理专辑

- 点击首页的"管理"按钮进入管理界面
- 点击"创建专辑"按钮创建新专辑
- 输入专辑名称，选择或输入音频文件路径
- 系统会自动扫描指定路径下的音频文件
- 支持编辑专辑名称和路径
- 支持删除专辑（会同时删除相关音频文件记录）

### 3. 播放音频

- 点击首页的"播放器"按钮进入播放器界面
- 选择要播放的专辑
- 使用播放器控制音频播放
- 支持上一首/下一首切换
- 支持音量调节
- 支持播放列表查看和选择

### 4. 播放历史

- 首页显示播放历史记录
- 按专辑聚合显示，每个专辑显示最近的两条记录
- 自动记录播放过的音频文件

## 项目结构

```
src/
├── app/
│   ├── api/                 # API 路由
│   │   ├── admin-password/  # 管理员密码管理
│   │   ├── albums/          # 专辑管理
│   │   ├── audio-files/     # 音频文件管理
│   │   ├── audio-stream/    # 音频流服务
│   │   ├── filesystem/      # 文件系统浏览
│   │   └── play-history/    # 播放历史
│   ├── layout.tsx           # 根布局
│   └── page.tsx             # 主页面
├── components/              # React 组件
│   ├── AdminInterface.tsx   # 管理界面
│   ├── AudioPlayer.tsx      # 音频播放器
│   ├── PasswordSetup.tsx    # 密码设置
│   ├── PasswordVerify.tsx   # 密码验证
│   └── PlayerInterface.tsx  # 播放器界面
└── lib/
    └── sqlite-database.ts    # SQLite数据库配置
```

## 数据库结构

- `admin_config` - 管理员配置
- `albums` - 专辑信息
- `audio_files` - 音频文件信息
- `play_history` - 播放历史记录

## 支持的音频格式

- MP3 (.mp3)
- WAV (.wav)
- M4A (.m4a)
- AAC (.aac)
- FLAC (.flac)
- OGG (.ogg)

## 部署

### 构建生产版本

```bash
pnpm build
```

### 启动生产服务器

```bash
pnpm start
```

## 注意事项

- 确保服务器有访问音频文件路径的权限
- 音频文件路径必须是绝对路径
- 建议在生产环境中使用 HTTPS 以确保音频流的安全传输
- 数据库文件会保存在 `data/lzc-story.db`

## 许可证

MIT License
