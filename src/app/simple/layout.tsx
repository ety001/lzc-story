import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '懒猫故事机 - 简单版',
  description: '简洁的音频播放器（兼容老版本 WebView）',
};

export default function SimpleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          body {
            margin: 0 !important;
            padding: 0 !important;
            font-family: Arial, sans-serif !important;
            background-color: #f5f5f5 !important;
          }
          body > div {
            min-height: 100vh !important;
            display: block !important;
          }
          body > div > main {
            display: block !important;
            flex: none !important;
          }
        `
      }} />
      {children}
    </>
  );
}

