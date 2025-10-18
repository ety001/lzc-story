import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/database';
import bcrypt from 'bcryptjs';

interface AdminConfig {
  id: number;
  password_hash: string;
  created_at: string;
}

// 检查管理员密码是否已设置
export async function GET() {
  try {
    const config = db.getOne('admin_config', () => true) as AdminConfig | null;
    return NextResponse.json({ 
      hasPassword: !!config,
      message: config ? '密码已设置' : '密码未设置'
    });
  } catch (error) {
    return NextResponse.json({ error: '检查密码状态失败' }, { status: 500 });
  }
}

// 设置管理员密码
export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    
    if (!password) {
      return NextResponse.json({ error: '密码不能为空' }, { status: 400 });
    }

    // 检查是否已有密码
    const existingConfig = db.getOne('admin_config', () => true) as AdminConfig | null;
    if (existingConfig) {
      return NextResponse.json({ error: '密码已设置，无法重复设置' }, { status: 400 });
    }

    // 加密密码
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 保存到数据库
    db.insert('admin_config', { password_hash: passwordHash });

    return NextResponse.json({ message: '密码设置成功' });
  } catch (error) {
    return NextResponse.json({ error: '设置密码失败' }, { status: 500 });
  }
}

// 验证管理员密码
export async function PUT(request: NextRequest) {
  try {
    const { password } = await request.json();
    
    if (!password) {
      return NextResponse.json({ error: '密码不能为空' }, { status: 400 });
    }

    const config = db.getOne('admin_config', () => true) as AdminConfig | null;
    if (!config) {
      return NextResponse.json({ error: '密码未设置' }, { status: 400 });
    }

    const isValid = await bcrypt.compare(password, config.password_hash);
    
    if (isValid) {
      return NextResponse.json({ message: '密码验证成功' });
    } else {
      return NextResponse.json({ error: '密码错误' }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ error: '验证密码失败' }, { status: 500 });
  }
}
