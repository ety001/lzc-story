# GitHub Actions 设置指南

## Docker 自动构建和推送

本项目配置了 GitHub Actions，当 `master` 分支有新的推送时，会自动构建 Docker 镜像并推送到 Docker Hub。

### 需要设置的 Secrets

在 GitHub 仓库的 Settings > Secrets and variables > Actions 中添加以下 secrets：

1. **DOCKER_USERNAME**: 您的 Docker Hub 用户名
2. **DOCKER_PASSWORD**: 您的 Docker Hub 密码或访问令牌

### 设置步骤

1. 登录 GitHub，进入您的仓库
2. 点击 Settings 标签
3. 在左侧菜单中点击 "Secrets and variables" > "Actions"
4. 点击 "New repository secret"
5. 添加以下两个 secrets：
   - Name: `DOCKER_USERNAME`, Value: 您的 Docker Hub 用户名
   - Name: `DOCKER_PASSWORD`, Value: 您的 Docker Hub 密码或访问令牌

### 工作流程

- **触发条件**: 当代码推送到 `master` 分支时
- **构建平台**: 支持 `linux/amd64` 和 `linux/arm64` 架构
- **镜像标签**: `ety001/lzc-story:latest`
- **缓存**: 使用 GitHub Actions 缓存加速构建

### 查看构建状态

1. 进入 GitHub 仓库的 "Actions" 标签
2. 查看 "Docker Build and Push" 工作流程
3. 点击具体的运行记录查看详细日志

### 使用构建的镜像

```bash
# 拉取最新镜像
docker pull ety001/lzc-story:latest

# 运行容器
docker run -d \
  --name lzc-story \
  -p 3000:3000 \
  -v /path/to/your/data:/app/data \
  -v /path/to/your/music:/app/music \
  ety001/lzc-story:latest
```