#!/bin/bash

# 懒猫故事机测试脚本

echo "🎵 懒猫故事机测试脚本"
echo "========================"

# 检查依赖
echo "📦 检查依赖..."
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm 未安装，请先安装 pnpm"
    exit 1
fi

# 安装依赖
echo "📥 安装依赖..."
pnpm install

# 检查数据库目录
echo "🗄️ 检查数据库目录..."
if [ ! -d "data" ]; then
    mkdir -p data
    echo "✅ 创建数据库目录"
fi

# 构建项目
echo "🔨 构建项目..."
pnpm build

if [ $? -eq 0 ]; then
    echo "✅ 构建成功"
else
    echo "❌ 构建失败"
    exit 1
fi

echo ""
echo "🎉 测试完成！"
echo ""
echo "启动开发服务器："
echo "  pnpm dev"
echo ""
echo "启动生产服务器："
echo "  pnpm start"
echo ""
echo "访问地址："
echo "  http://localhost:3000"
echo ""
echo "📱 建议在手机浏览器中访问以获得最佳体验"
