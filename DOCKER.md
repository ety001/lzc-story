# 懒猫故事机 Docker 部署指南

## 🐳 Docker 部署

本项目使用 Alpine Linux 作为基础镜像，提供轻量级的容器化部署方案。

### 📋 系统要求

- Docker 20.10+
- Docker Compose 2.0+
- 至少 512MB 内存
- 至少 1GB 磁盘空间

### 🚀 快速开始

#### 方法1: 使用部署脚本（推荐）

```bash
# 构建并启动服务
./docker-deploy.sh build
./docker-deploy.sh start

# 查看服务状态
./docker-deploy.sh status

# 查看日志
./docker-deploy.sh logs
```

#### 方法2: 使用 Docker Compose

```bash
# 构建并启动服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

#### 方法3: 使用 Docker 命令

```bash
# 构建镜像
docker build -t lzc-story:latest .

# 运行容器
docker run -d \
  --name lzc-story \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  lzc-story:latest
```

### 🔧 配置说明

#### 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `NODE_ENV` | `production` | 运行环境 |
| `PORT` | `3000` | 服务端口 |
| `HOSTNAME` | `0.0.0.0` | 绑定地址 |

#### 数据持久化

数据目录 `/app/data` 映射到宿主机的 `./data` 目录，确保数据持久化：

```bash
# 数据目录结构
data/
├── lzc-story.db      # SQLite 数据库
└── lzc-story.json    # JSON 备份（可选）
```

### 📊 服务管理

#### 查看服务状态
```bash
./docker-deploy.sh status
# 或
docker-compose ps
```

#### 查看服务日志
```bash
./docker-deploy.sh logs
# 或
docker-compose logs -f
```

#### 重启服务
```bash
./docker-deploy.sh restart
# 或
docker-compose restart
```

#### 停止服务
```bash
./docker-deploy.sh stop
# 或
docker-compose down
```

### 🔍 健康检查

容器内置健康检查，每30秒检查一次服务状态：

```bash
# 查看健康状态
docker inspect lzc-story --format='{{.State.Health.Status}}'
```

### 🛠️ 故障排除

#### 1. 端口冲突
如果3000端口被占用，修改 `docker-compose.yml`：
```yaml
ports:
  - "8080:3000"  # 使用8080端口
```

#### 2. 权限问题
确保数据目录有正确的权限：
```bash
sudo chown -R 1001:1001 data/
```

#### 3. 内存不足
如果遇到内存不足，可以增加交换空间或调整容器内存限制。

#### 4. 查看详细日志
```bash
docker-compose logs --tail=100 lzc-story
```

### 🧹 清理资源

```bash
# 清理所有资源
./docker-deploy.sh cleanup

# 或手动清理
docker-compose down
docker rmi lzc-story:latest
docker system prune -f
```

### 📈 性能优化

#### 1. 多阶段构建
Dockerfile 使用多阶段构建，减少最终镜像大小。

#### 2. Alpine Linux
使用 Alpine Linux 作为基础镜像，镜像大小约 50MB。

#### 3. 非 root 用户
容器内使用非 root 用户运行，提高安全性。

#### 4. 健康检查
内置健康检查确保服务正常运行。

### 🔒 安全建议

1. **定期更新基础镜像**
2. **使用非 root 用户运行**
3. **限制容器资源使用**
4. **定期备份数据目录**
5. **使用 HTTPS 代理（生产环境）**

### 📝 部署脚本命令

| 命令 | 说明 |
|------|------|
| `./docker-deploy.sh build` | 构建 Docker 镜像 |
| `./docker-deploy.sh start` | 启动服务 |
| `./docker-deploy.sh stop` | 停止服务 |
| `./docker-deploy.sh restart` | 重启服务 |
| `./docker-deploy.sh status` | 查看服务状态 |
| `./docker-deploy.sh logs` | 查看服务日志 |
| `./docker-deploy.sh cleanup` | 清理 Docker 资源 |
| `./docker-deploy.sh help` | 显示帮助信息 |

### 🌐 访问应用

服务启动后，访问以下地址：
- **应用首页**: http://localhost:3000
- **管理界面**: http://localhost:3000/admin
- **播放器**: http://localhost:3000/player

### 📞 支持

如果遇到问题，请检查：
1. Docker 和 Docker Compose 是否正确安装
2. 端口3000是否被占用
3. 数据目录权限是否正确
4. 系统资源是否充足
