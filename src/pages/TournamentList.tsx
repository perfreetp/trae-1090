import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trophy, Calendar, Users, Play, Trash2 } from 'lucide-react';
import { useTournamentStore } from '../store';
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import { TournamentFormat } from '../types';

export default function TournamentList() {
  const navigate = useNavigate();
  const { tournaments, loadAll, createTournament, deleteTournament } = useTournamentStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTournament, setNewTournament] = useState({
    name: '',
    format: 'swiss' as TournamentFormat,
    totalRounds: 5
  });

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleCreate = () => {
    if (!newTournament.name.trim()) return;
    const tournament = createTournament(newTournament);
    setIsModalOpen(false);
    setNewTournament({ name: '', format: 'swiss', totalRounds: 5 });
    navigate(`/tournament/${tournament.id}/settings`);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('确定要删除这个赛事吗？此操作不可撤销。')) {
      deleteTournament(id);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'info'> = {
      draft: 'default',
      registration: 'info',
      in_progress: 'success',
      completed: 'warning'
    };
    const labels: Record<string, string> = {
      draft: '草稿',
      registration: '报名中',
      in_progress: '进行中',
      completed: '已结束'
    };
    return <Badge variant={variants[status] || 'default'}>{labels[status] || status}</Badge>;
  };

  const getFormatName = (format: string) => {
    const names: Record<string, string> = {
      swiss: '瑞士轮',
      single_elimination: '单败淘汰',
      double_elimination: '双败淘汰',
      round_robin: '循环赛'
    };
    return names[format] || format;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/20 mb-4">
            <Trophy className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">桌游比赛编排系统</h1>
          <p className="text-slate-400 text-lg">瑞士轮 · 淘汰赛 · 循环赛，打开浏览器即可完成现场编排</p>
        </div>

        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-semibold text-white">我的赛事</h2>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus size={18} />
            新建赛事
          </Button>
        </div>

        {tournaments.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-700/50 mb-4">
                <Trophy className="w-8 h-8 text-slate-500" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">还没有赛事</h3>
              <p className="text-slate-400 mb-6">创建您的第一个比赛，开始组织吧！</p>
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus size={18} />
                创建赛事
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map(tournament => (
              <Card
                key={tournament.id}
                className="cursor-pointer hover:border-amber-500/50 transition-all duration-200 group"
                onClick={() => navigate(`/tournament/${tournament.id}/settings`)}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base">{tournament.name}</CardTitle>
                    <button
                      onClick={(e) => handleDelete(tournament.id, e)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400 flex items-center gap-2">
                        <Calendar size={14} />
                        {new Date(tournament.createdAt).toLocaleDateString('zh-CN')}
                      </span>
                      {getStatusBadge(tournament.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <span>{getFormatName(tournament.format)}</span>
                      <span>第 {tournament.currentRound}/{tournament.totalRounds} 轮</span>
                    </div>
                    <Button
                      variant="secondary"
                      className="w-full mt-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/tournament/${tournament.id}/settings`);
                      }}
                    >
                      <Play size={14} />
                      进入管理
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="创建新赛事"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={!newTournament.name.trim()}>创建</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="赛事名称"
            placeholder="例如：2024夏季桌游公开赛"
            value={newTournament.name}
            onChange={(e) => setNewTournament({ ...newTournament, name: e.target.value })}
          />
          <Select
            label="比赛赛制"
            value={newTournament.format}
            onChange={(e) => setNewTournament({ ...newTournament, format: e.target.value as TournamentFormat })}
            options={[
              { value: 'swiss', label: '瑞士轮' },
              { value: 'single_elimination', label: '单败淘汰赛' },
              { value: 'round_robin', label: '循环赛' }
            ]}
          />
          <Input
            label="总轮数"
            type="number"
            min={1}
            max={20}
            value={newTournament.totalRounds}
            onChange={(e) => setNewTournament({ ...newTournament, totalRounds: parseInt(e.target.value) || 1 })}
          />
        </div>
      </Modal>
    </div>
  );
}
