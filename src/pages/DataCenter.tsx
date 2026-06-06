import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Download, Upload, FileDown, FileUp, Save, 
  Trash2, FileSpreadsheet, FileJson, Printer
} from 'lucide-react';
import { useTournamentStore } from '../store';
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { sortPlayersByRank } from '../utils/ranking';
import { exportRankingToCSV, exportMatchesToCSV, exportPlayersToCSV, downloadFile, printTableLabels, exportTournamentBackup } from '../utils/export';
import { importPlayersFromCSV, importTournamentBackup, readFileAsText } from '../utils/import';

export default function DataCenter() {
  const { id } = useParams<{ id: string }>();
  const { tournaments, players, matches, playerStats, drafts, saveDraft, deleteDraft, loadDraft, loadAll, setMatches, setPlayers, updateTournament, addPlayers } = useTournamentStore();
  
  const tournament = tournaments.find(t => t.id === id);
  const tournamentPlayers = players.filter(p => p.tournamentId === id);
  const tournamentMatches = matches.filter(m => m.tournamentId === id);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  const rankedPlayers = sortPlayersByRank(tournamentPlayers, playerStats, tournament?.settings.showTiebreakers ?? true);

  const handleExportRanking = () => {
    if (!tournament) return;
    const csv = exportRankingToCSV(tournament, rankedPlayers);
    downloadFile(csv, `${tournament.name}_排名表.csv`);
  };

  const handleExportMatches = () => {
    if (!tournament) return;
    const csv = exportMatchesToCSV(tournament, tournamentMatches, tournamentPlayers);
    downloadFile(csv, `${tournament.name}_对阵表.csv`);
  };

  const handleExportPlayers = () => {
    if (!tournament) return;
    const csv = exportPlayersToCSV(tournamentPlayers);
    downloadFile(csv, `${tournament.name}_选手名单.csv`);
  };

  const handleExportBackup = () => {
    if (!tournament) return;
    const backup = exportTournamentBackup(tournament, tournamentPlayers, tournamentMatches, playerStats);
    downloadFile(backup, `${tournament.name}_备份_${new Date().toLocaleDateString('zh-CN')}.json`, 'application/json');
  };

  const handlePrintLabels = () => {
    if (!tournament) return;
    printTableLabels(tournamentMatches, tournamentPlayers, tournament.currentRound);
  };

  const handlePlayersImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    
    try {
      const content = await readFileAsText(file);
      let importedPlayers;
      
      if (file.name.endsWith('.csv')) {
        importedPlayers = importPlayersFromCSV(content, id);
      } else {
        const parsePlayersFromText = (await import('../utils/import')).parsePlayersFromText;
        importedPlayers = parsePlayersFromText(content, id);
      }
      
      if (importedPlayers.length > 0) {
        addPlayers(importedPlayers);
        alert(`成功导入 ${importedPlayers.length} 名选手`);
        setIsImportModalOpen(false);
      }
    } catch (error) {
      alert('导入失败，请检查文件格式');
    }
    
    e.target.value = '';
  };

  const handleBackupImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    
    try {
      const content = await readFileAsText(file);
      const data = importTournamentBackup(content);
      
      if (data) {
        if (confirm('导入备份将覆盖当前赛事的所有数据，确定继续吗？')) {
          updateTournament(id, data.tournament);
          setPlayers(data.players);
          setMatches(data.matches);
          alert('备份导入成功');
          setIsBackupModalOpen(false);
          loadAll();
        }
      } else {
        alert('无效的备份文件');
      }
    } catch (error) {
      alert('导入失败，请检查文件格式');
    }
    
    e.target.value = '';
  };

  const handleSaveDraft = () => {
    if (!tournament) return;
    const name = prompt('请输入草稿名称：', `${tournament.name}_${new Date().toLocaleString('zh-CN')}`);
    if (name) {
      saveDraft(name, 'tournament', {
        tournament,
        players: tournamentPlayers,
        matches: tournamentMatches
      });
      alert('草稿已保存');
    }
  };

  const handleLoadDraft = (draftId: string) => {
    const data = loadDraft(draftId);
    if (data && id && confirm('加载草稿将覆盖当前数据，确定继续吗？')) {
      if (data.tournament) {
        updateTournament(id, data.tournament);
      }
      if (data.players) {
        setPlayers(data.players);
      }
      if (data.matches) {
        setMatches(data.matches);
      }
      alert('草稿已加载');
      loadAll();
    }
  };

  if (!tournament) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <p className="text-slate-400">赛事不存在</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">数据中心</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setIsImportModalOpen(true)}>
            <Upload size={16} />
            导入选手
          </Button>
          <Button variant="secondary" onClick={() => setIsBackupModalOpen(true)}>
            <FileUp size={16} />
            导入备份
          </Button>
          <Button onClick={handleSaveDraft}>
            <Save size={16} />
            保存草稿
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download size={18} className="text-amber-400" />
              数据导出
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="secondary" className="w-full justify-start" onClick={handleExportRanking}>
              <FileSpreadsheet size={16} />
              导出排名表 (CSV)
            </Button>
            <Button variant="secondary" className="w-full justify-start" onClick={handleExportMatches}>
              <FileSpreadsheet size={16} />
              导出对阵表 (CSV)
            </Button>
            <Button variant="secondary" className="w-full justify-start" onClick={handleExportPlayers}>
              <FileSpreadsheet size={16} />
              导出选手名单 (CSV)
            </Button>
            <Button variant="secondary" className="w-full justify-start" onClick={handlePrintLabels}>
              <Printer size={16} />
              打印桌签
            </Button>
            <Button variant="secondary" className="w-full justify-start" onClick={handleExportBackup}>
              <FileJson size={16} />
              导出完整备份 (JSON)
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Save size={18} className="text-amber-400" />
              本地草稿
            </CardTitle>
          </CardHeader>
          <CardContent>
            {drafts.length === 0 ? (
              <p className="text-center py-8 text-slate-400">暂无保存的草稿</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名称</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drafts.map(draft => (
                    <TableRow key={draft.id}>
                      <TableCell className="font-medium">{draft.name}</TableCell>
                      <TableCell>
                        <Badge variant="info">
                          {draft.type === 'tournament' ? '赛事' : '选手'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-400 text-sm">
                        {new Date(draft.updatedAt).toLocaleString('zh-CN')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => handleLoadDraft(draft.id)}
                            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
                            title="加载草稿"
                          >
                            <FileDown size={16} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('确定要删除这个草稿吗？')) {
                                deleteDraft(draft.id);
                              }
                            }}
                            className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="删除草稿"
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
      </div>

      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="导入选手"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            支持 CSV 或 TXT 格式，CSV 请包含"姓名"或"name"列，TXT 每行一个姓名
          </p>
          <label className="block">
            <input
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={handlePlayersImport}
            />
            <div className="w-full px-4 py-8 border-2 border-dashed border-slate-600 rounded-lg text-center cursor-pointer hover:border-amber-500/50 hover:bg-amber-500/5 transition-colors">
              <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <p className="text-slate-300">点击选择文件或拖拽到此处</p>
              <p className="text-sm text-slate-500 mt-1">支持 .csv, .txt 格式</p>
            </div>
          </label>
        </div>
      </Modal>

      <Modal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        title="导入备份"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-400 text-amber-400">
            ⚠️ 注意：导入备份将覆盖当前赛事的所有数据，请谨慎操作
          </p>
          <label className="block">
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleBackupImport}
            />
            <div className="w-full px-4 py-8 border-2 border-dashed border-slate-600 rounded-lg text-center cursor-pointer hover:border-amber-500/50 hover:bg-amber-500/5 transition-colors">
              <FileJson className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <p className="text-slate-300">点击选择备份文件</p>
              <p className="text-sm text-slate-500 mt-1">支持 .json 格式</p>
            </div>
          </label>
        </div>
      </Modal>
    </div>
  );
}
