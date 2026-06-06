import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, Settings as SettingsIcon, Play, ArrowRight } from 'lucide-react';
import { useTournamentStore } from '../store';
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Toggle from '../components/ui/Toggle';
import Badge from '../components/ui/Badge';

export default function TournamentSettings() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tournaments, updateTournament, setCurrentTournament } = useTournamentStore();
  const tournament = tournaments.find(t => t.id === id);

  const [formData, setFormData] = useState({
    name: '',
    format: 'swiss',
    totalRounds: 5,
    status: 'draft',
    winPoints: 3,
    drawPoints: 1,
    lossPoints: 0,
    byePoints: 3,
    avoidRepeatMatches: true,
    autoBye: true,
    showTiebreakers: true
  });

  useEffect(() => {
    if (tournament) {
      setFormData({
        name: tournament.name,
        format: tournament.format,
        totalRounds: tournament.totalRounds,
        status: tournament.status,
        winPoints: tournament.scoring.winPoints,
        drawPoints: tournament.scoring.drawPoints,
        lossPoints: tournament.scoring.lossPoints,
        byePoints: tournament.scoring.byePoints,
        avoidRepeatMatches: tournament.settings.avoidRepeatMatches,
        autoBye: tournament.settings.autoBye,
        showTiebreakers: tournament.settings.showTiebreakers
      });
    }
  }, [tournament]);

  const handleSave = () => {
    if (!id) return;
    updateTournament(id, {
      name: formData.name,
      format: formData.format as any,
      totalRounds: formData.totalRounds,
      status: formData.status as any,
      scoring: {
        winPoints: formData.winPoints,
        drawPoints: formData.drawPoints,
        lossPoints: formData.lossPoints,
        byePoints: formData.byePoints
      },
      settings: {
        avoidRepeatMatches: formData.avoidRepeatMatches,
        autoBye: formData.autoBye,
        showTiebreakers: formData.showTiebreakers
      }
    });
  };

  const handleStart = () => {
    if (!id) return;
    updateTournament(id, { status: 'in_progress' });
    navigate(`/tournament/${id}/players`);
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

  if (!tournament) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <p className="text-slate-400">赛事不存在或已被删除</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">赛事设置</h1>
        <div className="flex items-center gap-3">
          {getStatusBadge(tournament.status)}
          <Button onClick={handleSave}>
            <Save size={16} />
            保存设置
          </Button>
          {tournament.status === 'draft' && (
            <Button variant="success" onClick={handleStart}>
              <Play size={16} />
              开始比赛
            </Button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon size={18} className="text-amber-400" />
              基本信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="赛事名称"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <Select
              label="比赛赛制"
              value={formData.format}
              onChange={(e) => setFormData({ ...formData, format: e.target.value })}
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
              value={formData.totalRounds}
              onChange={(e) => setFormData({ ...formData, totalRounds: parseInt(e.target.value) || 1 })}
            />
            <Select
              label="赛事状态"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              options={[
                { value: 'draft', label: '草稿' },
                { value: 'registration', label: '报名中' },
                { value: 'in_progress', label: '进行中' },
                { value: 'completed', label: '已结束' }
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon size={18} className="text-amber-400" />
              计分规则
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="胜场积分"
                type="number"
                value={formData.winPoints}
                onChange={(e) => setFormData({ ...formData, winPoints: parseInt(e.target.value) || 0 })}
              />
              <Input
                label="平局积分"
                type="number"
                value={formData.drawPoints}
                onChange={(e) => setFormData({ ...formData, drawPoints: parseInt(e.target.value) || 0 })}
              />
              <Input
                label="败场积分"
                type="number"
                value={formData.lossPoints}
                onChange={(e) => setFormData({ ...formData, lossPoints: parseInt(e.target.value) || 0 })}
              />
              <Input
                label="轮空积分"
                type="number"
                value={formData.byePoints}
                onChange={(e) => setFormData({ ...formData, byePoints: parseInt(e.target.value) || 0 })}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon size={18} className="text-amber-400" />
              高级设置
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Toggle
                checked={formData.avoidRepeatMatches}
                onChange={(checked) => setFormData({ ...formData, avoidRepeatMatches: checked })}
                label="避免重复交手（瑞士轮）"
              />
              <Toggle
                checked={formData.autoBye}
                onChange={(checked) => setFormData({ ...formData, autoBye: checked })}
                label="自动分配轮空"
              />
              <Toggle
                checked={formData.showTiebreakers}
                onChange={(checked) => setFormData({ ...formData, showTiebreakers: checked })}
                label="显示破同分数据"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-white mb-1">下一步：选手报名</h3>
            <p className="text-sm text-slate-400">添加参赛选手，准备开始比赛</p>
          </div>
          <Button onClick={() => navigate(`/tournament/${id}/players`)}>
            选手报名
            <ArrowRight size={16} />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
