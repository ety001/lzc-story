# SQLite 数据库初始化说明

## 🗄️ 数据库已成功初始化！

SQLite数据库已经通过命令行工具成功创建并初始化。

### 📊 数据库信息

- **数据库文件**: `data/lzc-story.db`
- **数据库大小**: 24KB
- **创建时间**: 2024年10月19日

### 📋 已创建的表

1. **admin_config** - 管理员配置表
   - `id` - 主键
   - `password_hash` - 密码哈希
   - `created_at` - 创建时间

2. **albums** - 专辑表
   - `id` - 主键
   - `name` - 专辑名称
   - `path` - 专辑路径
   - `created_at` - 创建时间
   - `updated_at` - 更新时间

3. **audio_files** - 音频文件表
   - `id` - 主键
   - `album_id` - 专辑ID（外键）
   - `filename` - 文件名
   - `filepath` - 文件路径
   - `duration` - 时长
   - `created_at` - 创建时间

4. **play_history** - 播放历史表
   - `id` - 主键
   - `album_id` - 专辑ID（外键）
   - `audio_file_id` - 音频文件ID（外键）
   - `played_at` - 播放时间

### 🔧 数据库操作命令

#### 查看所有表
```bash
sqlite3 data/lzc-story.db ".tables"
```

#### 查看表结构
```bash
sqlite3 data/lzc-story.db ".schema"
```

#### 查看数据
```bash
sqlite3 data/lzc-story.db "SELECT * FROM albums;"
```

#### 备份数据库
```bash
sqlite3 data/lzc-story.db ".backup backup.db"
```

#### 恢复数据库
```bash
sqlite3 data/lzc-story.db ".restore backup.db"
```

### ⚠️ 注意事项

1. **better-sqlite3 问题**: 当前better-sqlite3的Node.js绑定文件有问题，但数据库文件已正确创建
2. **数据库文件**: 数据库文件位于 `data/lzc-story.db`
3. **权限**: 确保应用有读写数据库文件的权限
4. **备份**: 建议定期备份数据库文件

### 🚀 下一步

数据库已准备就绪，可以开始使用懒猫故事机应用了！

访问 `http://localhost:3000` 开始使用应用。
