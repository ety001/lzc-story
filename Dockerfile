# 多阶段构建 - 构建阶段
FROM node:20-alpine AS builder

# 设置工作目录
WORKDIR /app

# 设置 HTTP 代理
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY=localhost,127.0.0.1

# 检测代理配置并写入 /etc/apk/proxy
RUN if [ -n "$HTTP_PROXY" ]; then \
        echo "$HTTP_PROXY" > /etc/apk/proxy && \
        echo "$HTTPS_PROXY" >> /etc/apk/proxy && \
        echo "配置 Alpine 代理: $HTTP_PROXY"; \
    else \
        echo "未检测到代理配置"; \
    fi

# 安装 better-sqlite3 所需的系统依赖
RUN apk add --no-cache python3 make g++ sqlite-dev

# 复制 package.json 和 pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# 安装 pnpm
RUN npm install -g pnpm

# 复制源代码
COPY . .

# 清理缓存和编译文件，确保 clean 状态
RUN pnpm clear

# 安装所有依赖（包括 devDependencies）
RUN pnpm install --frozen-lockfile

# 构建应用
RUN pnpm build

# 生产阶段
FROM node:20-alpine AS runner

# 设置 HTTP 代理
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY=localhost,127.0.0.1

# 检测代理配置并写入 /etc/apk/proxy
RUN if [ -n "$HTTP_PROXY" ]; then \
        echo "$HTTP_PROXY" > /etc/apk/proxy && \
        echo "$HTTPS_PROXY" >> /etc/apk/proxy && \
        echo "配置 Alpine 代理: $HTTP_PROXY"; \
    else \
        echo "未检测到代理配置"; \
    fi

# 在生产阶段也需要 sqlite 运行时库
RUN apk add --no-cache sqlite

# 设置工作目录
WORKDIR /app

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制构建产物
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# 创建数据目录并设置权限
RUN mkdir -p data && chown -R nextjs:nodejs /app

# 切换到非 root 用户
USER nextjs

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["node", "server.js"]
