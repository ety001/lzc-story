# 懒猫故事机

一个专为[懒猫微服](https://lazycat.cloud/)设计的简洁的移动端音频播放器应用，尤其面向老人给孩子播放故事使用。

## 功能特性

- 🎵 **简洁的音频播放器** - 包含上一首、播放/暂停、下一首、列表四个基本按钮
- 🔐 **管理员密码保护** - 首次访问需要设置管理员密码
- 📚 **专辑管理** - 创建、编辑、删除专辑，支持文件系统浏览选择路径
- 🔍 **自动扫描** - 自动扫描指定路径下的音频文件（支持 mp3, wav, m4a, aac, flac, ogg）
- 📱 **移动端优化** - 专为手机端设计的响应式界面
- 📊 **智能播放历史** - 自动记录播放进度，支持断点续播
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

# 播放历史记录间隔（秒），默认值为5
PLAY_HISTORY_INTERVAL=5

# 数据库文件路径，默认为 data/lzc-story.db
DATABASE_PATH=data/lzc-story.db
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
- **智能播放时间记录**：每5秒自动保存播放进度
- **断点续播**：点击历史记录可从上次播放位置继续
- **自动播放**：从历史记录进入播放器时自动开始播放
- **播放进度显示**：显示播放到的时间点（如：播放至 1:15）

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
│   ├── AlbumSelector.tsx    # 专辑选择器
│   ├── AudioPlayer.tsx      # 音频播放器
│   ├── ClientOnly.tsx       # 客户端渲染组件
│   ├── LazyCatIcon.tsx     # 应用图标
│   ├── PasswordSetup.tsx    # 密码设置
│   ├── PasswordVerify.tsx   # 密码验证
│   └── PlayHistory.tsx     # 播放历史组件
└── lib/
    └── sqlite-database.ts    # SQLite数据库配置
```

## 播放历史技术实现

### 自动记录机制

- **定时记录**：播放时每5秒自动调用API更新播放进度
- **状态管理**：使用React useEffect监听播放状态变化
- **性能优化**：使用useCallback优化函数重新创建
- **错误处理**：优雅处理网络请求失败和浏览器自动播放限制

### 断点续播功能

- **历史记录查询**：支持按音频文件ID和专辑ID查询特定记录
- **播放位置恢复**：自动设置音频播放时间到上次停止位置
- **自动播放**：从历史记录进入时自动开始播放（受浏览器策略限制）

### API接口

- `POST /api/play-history` - 更新播放历史记录
- `GET /api/play-history` - 获取播放历史列表
- `GET /api/play-history?audioFileId=X&albumId=Y` - 查询特定记录

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
- **浏览器自动播放策略**：现代浏览器限制自动播放，用户需要手动交互后才能自动播放
- **移动端优化**：界面专为移动端设计，在桌面端可能显示较小

## 许可证

MIT License
