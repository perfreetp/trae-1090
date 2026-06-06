import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Plus, Trash2, Upload, FileText, Users, 
  Clock, UserX, Check, ArrowRight, Edit3, X
} from 'lucide-react';
import { useTournamentStore } from '../store';
import { PlayerStatus } from '../types';
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Select from '../components/ui/Select';
import { parsePlayersFromText, importPlayersFromCSV, readFileAsText } from '../utils/import';

export default function PlayerManagement() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { players, addPlayer, addPlayers, updatePlayer, deletePlayer, setPlayers } = useTournamentStore();
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<{ id: string; name: string } | null>(null);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [batchText, setBatchText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const tournamentPlayers = players.filter(p => p.tournamentId === id);
  const filteredPlayers = tournamentPlayers.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddPlayer = () => {
    if (!newPlayerName.trim() || !id) return;
    addPlayer({
      name: newPlayerName.trim(),
      status: 'active',
      tournamentId: id
    });
    setNewPlayerName('');
    setIsAddModalOpen(false);
  };

  const handleBatchAdd = () => {
    if (!batchText.trim() || !id) return;
    const newPlayers = parsePlayersFromText(batchText, id);
    addPlayers(newPlayers);
    setBatchText('');
    setIsBatchModalOpen(false);
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    
    try {
      const content = await readFileAsText(file);
      let importedPlayers;
      
      if (file.name.endsWith('.csv')) {
        importedPlayers = importPlayersFromCSV(content, id);
      } else {
        importedPlayers = parsePlayersFromText(content, id);
      }
      
      if (importedPlayers.length > 0) {
        addPlayers(importedPlayers);
      }
    } catch (error) {
      console.error('导入失败:', error);
    }
    
    e.target.value = '';
  };

  const handleStatusChange = (playerId: string, status: PlayerStatus) => {
    updatePlayer(playerId, { status });
  };

  const handleEditPlayer = () => {
    if (!editingPlayer || !editingPlayer.name.trim()) return;
    updatePlayer(editingPlayer.id, { name: editingPlayer.name.trim() });
    setEditingPlayer(null);
    setIsEditModalOpen(false);
  };

  const getStatusBadge = (status: PlayerStatus) => {
    const config: Record<PlayerStatus, { variant: 'default' | 'success' | 'warning' | 'danger' | 'info'; label: string }> = {
      active: { variant: 'success', label: '正常' },
      late: { variant: 'warning', label: '迟到' },
      dropped: { variant: 'danger', label: '退赛' },
      bye: { variant: 'info', label: '轮空' }
    };
    const { variant, label } = config[status] || config.active;
    return <Badge variant={variant}>{label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">选手报名</h1>
          <p className="text-slate-400 mt-1">
            共 {tournamentPlayers.length} 名选手
            {tournamentPlayers.filter(p => p.status === 'active').length > 0 && (
              <span className="ml-2">
                · {tournamentPlayers.filter(p => p.status === 'active').length} 名可参赛
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setIsBatchModalOpen(true)}>
            <FileText size={16} />
            批量录入
          </Button>
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={handleFileImport}
            />
            <span className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-700 rounded-lg hover:bg-slate-600 transition-all duration-200">
              <Upload size={16} />
              导入文件
            </span>
          </label>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus size={16} />
            添加选手
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4">
            <Input
              placeholder="搜索选手..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {filteredPlayers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 mb-4">
                {searchQuery ? '没有找到匹配的选手' : '还没有添加选手'}
              </p>
              <Button onClick={() => setIsAddModalOpen(true)}>
                <Plus size={16} />
                添加第一位选手
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>选手名称</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlayers.map((player, index) => (
                  <TableRow key={player.id}>
                    <TableCell className="text-slate-500">{index + 1}</TableCell>
                    <TableCell className="font-medium">{player.name}</TableCell>
                    <TableCell>
                      <select
                        value={player.status}
                        onChange={(e) => handleStatusChange(player.id, e.target.value as PlayerStatus)}
                        className="bg-transparent text-sm focus:outline-none cursor-pointer"
                      >
                        <option value="active" className="bg-slate-800">正常</option>
                        <option value="late" className="bg-slate-800">迟到</option>
                        <option value="dropped" className="bg-slate-800">退赛</option>
                      </select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditingPlayer({ id: player.id, name: player.name });
                            setIsEditModalOpen(true);
                          }}
                          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`确定要删除选手「${player.name}」吗？`)) {
                              deletePlayer(player.id);
                            }
                          }}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-white mb-1">下一步：分组配对</h3>
            <p className="text-sm text-slate-400">生成第一轮对阵，开始比赛</p>
          </div>
          <Button onClick={() => navigate(`/tournament/${id}/pairing`)} disabled={tournamentPlayers.length < 2}>
            开始配对
            <ArrowRight size={16} />
          </Button>
        </CardContent>
      </Card>

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="添加选手"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>取消</Button>
            <Button onClick={handleAddPlayer} disabled={!newPlayerName.trim()}>添加</Button>
          </>
        }
      >
        <Input
          label="选手姓名"
          placeholder="请输入选手姓名"
          value={newPlayerName}
          onChange={(e) => setNewPlayerName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()}
          autoFocus
        />
      </Modal>

      <Modal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        title="批量录入选手"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsBatchModalOpen(false)}>取消</Button>
            <Button onClick={handleBatchAdd} disabled={!batchText.trim()}>批量添加</Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-400">每行一个选手姓名，系统会自动按顺序分配种子序号</p>
          <textarea
            className="w-full h-64 px-3 py-2.5 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 resize-none"
            placeholder="张三&#10;李四&#10;王五&#10;..."
            value={batchText}
            onChange={(e) => setBatchText(e.target.value)}
          />
        </div>
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="编辑选手"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>取消</Button>
            <Button onClick={handleEditPlayer} disabled={!editingPlayer?.name.trim()}>保存</Button>
          </>
        }
      >
        <Input
          label="选手姓名"
          value={editingPlayer?.name || ''}
          onChange={(e) => setEditingPlayer(prev => prev ? { ...prev, name: e.target.value } : null)}
          onKeyDown={(e) => e.key === 'Enter' && handleEditPlayer()}
          autoFocus
        />
      </Modal>
    </div>
  );
}
