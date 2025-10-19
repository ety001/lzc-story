#!/bin/bash

# 懒猫故事机 Docker 构建和部署脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_message() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查 Docker 是否安装
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
    
    print_success "Docker 环境检查通过"
}

# 构建 Docker 镜像
build_image() {
    print_message "开始构建 Docker 镜像..."
    
    # 构建镜像
    docker build -t lzc-story:latest .
    
    if [ $? -eq 0 ]; then
        print_success "Docker 镜像构建成功"
    else
        print_error "Docker 镜像构建失败"
        exit 1
    fi
}

# 启动服务
start_service() {
    print_message "启动服务..."
    
    # 确保数据目录存在
    mkdir -p data
    
    # 启动服务
    docker-compose up -d
    
    if [ $? -eq 0 ]; then
        print_success "服务启动成功"
        print_message "访问地址: http://localhost:3000"
    else
        print_error "服务启动失败"
        exit 1
    fi
}

# 停止服务
stop_service() {
    print_message "停止服务..."
    docker-compose down
    print_success "服务已停止"
}

# 查看服务状态
status_service() {
    print_message "服务状态:"
    docker-compose ps
}

# 查看日志
view_logs() {
    print_message "查看服务日志:"
    docker-compose logs -f
}

# 清理资源
cleanup() {
    print_message "清理 Docker 资源..."
    
    # 停止并删除容器
    docker-compose down
    
    # 删除镜像
    docker rmi lzc-story:latest 2>/dev/null || true
    
    # 清理未使用的镜像
    docker image prune -f
    
    print_success "清理完成"
}

# 显示帮助信息
show_help() {
    echo "懒猫故事机 Docker 部署脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  build     构建 Docker 镜像"
    echo "  start     启动服务"
    echo "  stop      停止服务"
    echo "  restart   重启服务"
    echo "  status    查看服务状态"
    echo "  logs      查看服务日志"
    echo "  cleanup   清理 Docker 资源"
    echo "  help      显示帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 build    # 构建镜像"
    echo "  $0 start    # 启动服务"
    echo "  $0 logs     # 查看日志"
}

# 主函数
main() {
    case "${1:-help}" in
        "build")
            check_docker
            build_image
            ;;
        "start")
            check_docker
            start_service
            ;;
        "stop")
            stop_service
            ;;
        "restart")
            stop_service
            sleep 2
            start_service
            ;;
        "status")
            status_service
            ;;
        "logs")
            view_logs
            ;;
        "cleanup")
            cleanup
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# 执行主函数
main "$@"
