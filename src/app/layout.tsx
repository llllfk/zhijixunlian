import type { Metadata } from 'next';
import './globals.css';
import { SupabaseConfigProvider } from '@/lib/supabase-config-inject';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  title: {
    default: '空港值机语音陪练',
    template: '%s | 空港值机语音陪练',
  },
  description: '民航旅客地面服务（值机柜台）语音陪练应用 —— 学员端训练、管理端运营',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`antialiased`}>
        <SupabaseConfigProvider>{children}</SupabaseConfigProvider>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}