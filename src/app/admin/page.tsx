'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Pencil, Trash2, KeyRound, Loader2 } from 'lucide-react';
import { AuthProvider } from '@/components/auth';
import { apiGet, apiSend } from '@/lib/client-api';
import { toast } from 'sonner';
import { UserProfileInfo, PassengerProfile, TrainingRecord, RADAR_DIMENSIONS } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

function fmtDate(s?: string) {
  if (!s) return '';
  const d = new Date(s);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/* ---------- 学员账号 ---------- */
function UsersTab() {
  const [users, setUsers] = useState<UserProfileInfo[]>([]);
  const [resetTarget, setResetTarget] = useState<UserProfileInfo | null>(null);
  const [newPass, setNewPass] = useState('');

  const load = useCallback(() => {
    apiGet<{ users: UserProfileInfo[] }>('/api/admin/users').then((d) => setUsers(d.users ?? [])).catch((e) => toast.error(e?.message));
  }, []);
  useEffect(load, [load]);

  async function toggle(u: UserProfileInfo) {
    try {
      await apiSend(`/api/admin/users/${u.id}`, 'PATCH', { is_active: !u.is_active });
      toast.success(u.is_active ? '已禁用该账号' : '已启用该账号');
      load();
    } catch (e: any) {
      toast.error(e?.message);
    }
  }

  async function setRole(u: UserProfileInfo, role: 'admin' | 'user') {
    try {
      await apiSend(`/api/admin/users/${u.id}`, 'PATCH', { role });
      toast.success(role === 'admin' ? '已设为管理员' : '已设为学员');
      load();
    } catch (e: any) {
      toast.error(e?.message);
    }
  }

  async function doReset() {
    if (!resetTarget) return;
    try {
      await apiSend(`/api/admin/users/${resetTarget.id}/reset-password`, 'POST', { password: newPass });
      toast.success(`已重置 ${resetTarget.name} 的密码`);
      setResetTarget(null);
      setNewPass('');
    } catch (e: any) {
      toast.error(e?.message);
    }
  }

  return (
    <div className="space-y-3">
      {users.map((u) => (
        <div key={u.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/20 font-bold text-sky-300">{u.name?.slice(0, 1)}</div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{u.name}</span>
                  {u.role === 'admin' ? <Badge className="bg-amber-400/20 text-amber-300">管理员</Badge> : <Badge className="bg-slate-500/20 text-slate-300">学员</Badge>}
                  {!u.is_active && <Badge className="bg-red-500/20 text-red-300">已禁用</Badge>}
                </div>
                <p className="text-xs text-slate-300">{u.phone || u.email || '—'}</p>
              </div>
            </div>
            <span className="text-xs text-slate-400">{fmtDate(u.created_at)}</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Switch checked={u.is_active} onCheckedChange={() => toggle(u)} />
            <span className="mr-2 text-xs text-slate-200">{u.is_active ? '启用中' : '已禁用'}</span>
            {u.role === 'user' ? (
              <Button size="sm" variant="outline" className="h-8 border-white/20 bg-transparent text-slate-100 hover:bg-white/10 hover:text-white" onClick={() => setRole(u, 'admin')}>
                设为管理员
              </Button>
            ) : (
              <Button size="sm" variant="outline" className="h-8 border-white/20 bg-transparent text-slate-100 hover:bg-white/10 hover:text-white" onClick={() => setRole(u, 'user')}>
                转为学员
              </Button>
            )}
            <Button size="sm" variant="outline" className="h-8 border-white/20 bg-transparent text-slate-100 hover:bg-white/10 hover:text-white" onClick={() => setResetTarget(u)}>
              <KeyRound className="mr-1 h-3.5 w-3.5" />
              重置密码
            </Button>
          </div>
        </div>
      ))}

      <Dialog open={!!resetTarget} onOpenChange={(o) => !o && setResetTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>重置密码</DialogTitle>
            <DialogDescription>为「{resetTarget?.name}」设置新密码（至少 6 位）</DialogDescription>
          </DialogHeader>
          <Input type="text" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="新密码" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)}>
              取消
            </Button>
            <Button onClick={doReset}>确认重置</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- 乘客画像 ---------- */
interface ProfileDraft {
  id?: string;
  name: string;
  description: string;
  background_url: string;
  is_active: boolean;
  sort_order: number;
}

function ProfilesTab() {
  const [profiles, setProfiles] = useState<PassengerProfile[]>([]);
  const [draft, setDraft] = useState<ProfileDraft | null>(null);

  const load = useCallback(() => {
    apiGet<{ profiles: PassengerProfile[] }>('/api/admin/profiles').then((d) => setProfiles(d.profiles ?? [])).catch((e) => toast.error(e?.message));
  }, []);
  useEffect(load, [load]);

  function openCreate() {
    setDraft({ name: '', description: '', background_url: '', is_active: true, sort_order: profiles.length + 1 });
  }
  function openEdit(p: PassengerProfile) {
    setDraft({ id: p.id, name: p.name, description: p.description || '', background_url: p.background_url || '', is_active: p.is_active, sort_order: p.sort_order });
  }

  async function save() {
    if (!draft) return;
    if (!draft.name.trim()) return toast.error('请填写画像名称');
    try {
      if (draft.id) {
        await apiSend(`/api/admin/profiles/${draft.id}`, 'PUT', draft);
      } else {
        await apiSend('/api/admin/profiles', 'POST', draft);
      }
      toast.success('已保存');
      setDraft(null);
      load();
    } catch (e: any) {
      toast.error(e?.message);
    }
  }

  async function toggle(p: PassengerProfile) {
    try {
      await apiSend(`/api/admin/profiles/${p.id}`, 'PUT', { ...p, is_active: !p.is_active });
      load();
    } catch (e: any) {
      toast.error(e?.message);
    }
  }

  async function remove(p: PassengerProfile) {
    if (!confirm(`确定删除画像「${p.name}」？`)) return;
    try {
      await apiSend(`/api/admin/profiles/${p.id}`, 'DELETE', {});
      toast.success('已删除');
      load();
    } catch (e: any) {
      toast.error(e?.message);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-300">共 {profiles.length} 个画像</p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" />
          新增画像
        </Button>
      </div>

      {profiles.map((p) => (
        <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl">
            {p.background_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.background_url} alt={p.name} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-slate-700" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{p.name}</span>
              {!p.is_active && <Badge className="bg-red-500/20 text-red-300">停用</Badge>}
            </div>
            <p className="truncate text-xs text-slate-300">{p.description}</p>
            <p className="text-[11px] text-slate-400">排序 {p.sort_order}</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Switch checked={p.is_active} onCheckedChange={() => toggle(p)} />
            <div className="flex gap-1">
              <button onClick={() => openEdit(p)} className="rounded-md p-1.5 hover:bg-white/10">
                <Pencil className="h-4 w-4 text-slate-300" />
              </button>
              <button onClick={() => remove(p)} className="rounded-md p-1.5 hover:bg-white/10">
                <Trash2 className="h-4 w-4 text-red-400" />
              </button>
            </div>
          </div>
        </div>
      ))}

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{draft?.id ? '编辑画像' : '新增画像'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>名称 *</Label>
              <Input value={draft?.name || ''} onChange={(e) => setDraft((d) => (d ? { ...d, name: e.target.value } : d))} placeholder="如：老年旅客" />
            </div>
            <div className="space-y-1">
              <Label>描述</Label>
              <Textarea value={draft?.description || ''} onChange={(e) => setDraft((d) => (d ? { ...d, description: e.target.value } : d))} placeholder="一句话介绍该旅客特征与训练要点" />
            </div>
            <div className="space-y-1">
              <Label>背景图 URL</Label>
              <Input value={draft?.background_url || ''} onChange={(e) => setDraft((d) => (d ? { ...d, background_url: e.target.value } : d))} placeholder="/passengers/xxx.jpg 或 https://…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>排序</Label>
                <Input type="number" value={draft?.sort_order || 0} onChange={(e) => setDraft((d) => (d ? { ...d, sort_order: Number(e.target.value) } : d))} />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <Switch checked={draft?.is_active ?? true} onCheckedChange={(v) => setDraft((d) => (d ? { ...d, is_active: v } : d))} />
                <span className="text-xs text-slate-400">启用</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>
              取消
            </Button>
            <Button onClick={save}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- 训练记录 ---------- */
function RecordsTab() {
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [users, setUsers] = useState<UserProfileInfo[]>([]);
  const [userId, setUserId] = useState<string>('all');
  const [view, setView] = useState<TrainingRecord | null>(null);

  const load = useCallback(() => {
    const q = userId && userId !== 'all' ? `?userId=${encodeURIComponent(userId)}` : '';
    apiGet<{ records: TrainingRecord[] }>(`/api/admin/records${q}`).then((d) => setRecords(d.records ?? [])).catch((e) => toast.error(e?.message));
  }, [userId]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    apiGet<{ users: UserProfileInfo[] }>('/api/admin/users').then((d) => setUsers(d.users ?? [])).catch(() => {});
  }, []);

  async function remove(r: TrainingRecord) {
    if (!confirm('确定删除该训练记录？')) return;
    try {
      await apiSend(`/api/admin/records/${r.id}`, 'DELETE', {});
      toast.success('已删除');
      load();
    } catch (e: any) {
      toast.error(e?.message);
    }
  }

  const nameOf = (uid: string) => users.find((u) => u.id === uid)?.name || '—';

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Select value={userId} onValueChange={setUserId}>
          <SelectTrigger className="w-full border-white/15 bg-white/[0.04]">
            <SelectValue placeholder="全部学员" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部学员</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {records.map((r) => (
        <div key={r.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">{r.profile_name || '旅客'}</div>
              <p className="text-xs text-slate-300">学员：{nameOf(r.user_id)} · {fmtDate(r.created_at)}</p>
              <p className="text-xs text-slate-300">时长 {Math.floor((r.duration_seconds || 0) / 60)} 分 {r.duration_seconds % 60} 秒</p>
            </div>
            <span className={`text-xl font-bold ${(r.score ?? 0) >= 85 ? 'text-emerald-400' : (r.score ?? 0) >= 70 ? 'text-amber-300' : 'text-red-400'}`}>{r.score ?? '—'}</span>
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline" className="h-8 border-white/20 bg-transparent text-slate-100 hover:bg-white/10 hover:text-white" onClick={() => setView(r)}>
              查看详情
            </Button>
            <Button size="sm" variant="outline" className="h-8 border-red-500/30 text-red-400" onClick={() => remove(r)}>
              删除
            </Button>
          </div>
        </div>
      ))}

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-h-[80vh] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>训练结果详情</DialogTitle>
          </DialogHeader>
          {view?.result && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-white/[0.05] p-3">
                <span className="text-sm text-slate-400">综合得分</span>
                <span className="text-2xl font-bold">{view.score ?? view.result.total_score}</span>
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold">能力维度</p>
                <div className="space-y-1.5">
                  {RADAR_DIMENSIONS.map((k) => (
                    <div key={k} className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">{k}</span>
                      <span className="font-semibold">{(view.result?.dimensions as any)?.[k] ?? 0}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-sm font-semibold">改进建议</p>
                <ul className="space-y-1.5">
                  {(view.result.suggestions || []).map((s, i) => (
                    <li key={i} className="text-xs leading-relaxed text-slate-300">· {s}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- 主后台 ---------- */
function AdminInner() {
  const router = useRouter();
  return (
    <main className="min-h-screen bg-slate-950 pb-16 text-white">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/10 bg-slate-950/85 px-4 py-4 backdrop-blur">
        <button onClick={() => router.push('/')} className="rounded-lg p-1 hover:bg-white/10">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold">管理后台</h1>
      </header>

      <div className="mx-auto max-w-md px-4 py-4">
        <Tabs defaultValue="users">
          <TabsList className="grid w-full grid-cols-3 bg-white/10 text-slate-300">
            <TabsTrigger
              value="users"
              className="text-slate-300 data-[state=active]:bg-white data-[state=active]:text-slate-900"
            >
              学员账号
            </TabsTrigger>
            <TabsTrigger
              value="profiles"
              className="text-slate-300 data-[state=active]:bg-white data-[state=active]:text-slate-900"
            >
              旅客画像
            </TabsTrigger>
            <TabsTrigger
              value="records"
              className="text-slate-300 data-[state=active]:bg-white data-[state=active]:text-slate-900"
            >
              训练记录
            </TabsTrigger>
          </TabsList>
          <div className="mt-4">
            <TabsContent value="users">
              <UsersTab />
            </TabsContent>
            <TabsContent value="profiles">
              <ProfilesTab />
            </TabsContent>
            <TabsContent value="records">
              <RecordsTab />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </main>
  );
}

export default function AdminPage() {
  return (
    <AuthProvider requireAuth adminOnly>
      <AdminInner />
    </AuthProvider>
  );
}