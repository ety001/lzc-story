#!/bin/bash

# Docker 构建脚本 - 交互式代理配置
# 使用方法: ./docker-build.sh [镜像标签]

# 设置镜像标签，默认为 ety001/lzc-story
IMAGE_TAG=${1:-"ety001/lzc-story"}

echo "🚀 Docker 镜像构建脚本"
echo "📦 目标镜像: $IMAGE_TAG"
echo ""

# 询问是否配置代理
echo "❓ 是否需要配置 HTTP 代理？"
echo "   1) 是 - 手动输入代理信息"
echo "   2) 否 - 使用环境变量或直连"
echo ""
read -p "请选择 (1/2): " proxy_choice

# 处理代理配置
case $proxy_choice in
    1)
        echo ""
        echo "🔧 代理配置"
        read -p "请输入 HTTP 代理地址 (如: http://192.168.1.100:8080): " http_proxy_input
        read -p "请输入 HTTPS 代理地址 (回车使用 HTTP 代理): " https_proxy_input
        
        # 如果没有输入 HTTPS 代理，使用 HTTP 代理
        if [ -z "$https_proxy_input" ]; then
            https_proxy_input="$http_proxy_input"
        fi
        
        # 设置代理环境变量
        export HTTP_PROXY="$http_proxy_input"
        export HTTPS_PROXY="$https_proxy_input"
        export NO_PROXY="localhost,127.0.0.1"
        
        echo "✅ 代理配置完成:"
        echo "   HTTP_PROXY: $HTTP_PROXY"
        echo "   HTTPS_PROXY: $HTTPS_PROXY"
        ;;
    2)
        echo "ℹ️  使用环境变量或直连模式"
        ;;
    *)
        echo "❌ 无效选择，使用环境变量或直连模式"
        ;;
esac

echo ""

# 检测代理配置
if [ -n "$HTTP_PROXY" ]; then
    echo "🌐 使用代理配置: $HTTP_PROXY"
    PROXY_ARGS="--build-arg HTTP_PROXY=$HTTP_PROXY --build-arg HTTPS_PROXY=$HTTPS_PROXY --build-arg NO_PROXY=$NO_PROXY"
else
    echo "⚠️  未检测到代理配置，将使用默认网络"
    PROXY_ARGS=""
fi

echo ""
echo "🚀 开始构建 Docker 镜像..."

# 构建镜像
docker build \
    $PROXY_ARGS \
    --push \
    -t $IMAGE_TAG \
    .

# 检查构建结果
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 镜像构建成功!"
    echo "📋 镜像信息:"
    docker images $IMAGE_TAG
    echo ""
    echo "🎉 构建完成！"
else
    echo ""
    echo "❌ 镜像构建失败!"
    exit 1
fi