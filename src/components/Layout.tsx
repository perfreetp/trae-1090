import { Link, Outlet, useParams, useNavigate } from 'react-router-dom';
import { 
  Trophy, Users, Shuffle, ClipboardList, 
  BarChart3, Monitor, Database, ArrowLeft,
  Settings
} from 'lucide-react';
import { useTournamentStore } from '../store';
import { useEffect } from 'react';

const navItems = [
  { path: 'settings', label: '赛事设置', icon: Settings },
  { path: 'players', label: '选手报名', icon: Users },
  { path: 'pairing', label: '分组配对', icon: Shuffle },
  { path: 'results', label: '成绩录入', icon: ClipboardList },
  { path: 'ranking', label: '排名榜', icon: BarChart3 },
  { path: 'display', label: '投屏看板', icon: Monitor },
  { path: 'data', label: '数据中心', icon: Database },
];

export default function Layout() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tournaments, currentTournamentId, setCurrentTournament } = useTournamentStore();
  
  const currentTournament = tournaments.find(t => t.id === id);

  useEffect(() => {
    if (id && id !== currentTournamentId) {
      setCurrentTournament(id);
    }
  }, [id, currentTournamentId, setCurrentTournament]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
              <span>返回</span>
            </button>
            <div className="h-6 w-px bg-slate-600" />
            <div className="flex items-center gap-3">
              <Trophy className="text-amber-400" size={24} />
              <div>
                <h1 className="text-lg font-bold text-white">
                  {currentTournament?.name || '加载中...'}
                </h1>
                <p className="text-xs text-slate-400">
                  {currentTournament && (
                    <>
                      {getFormatName(currentTournament.format)} · 
                      第 {currentTournament.currentRound}/{currentTournament.totalRounds} 轮 · 
                      {getStatusName(currentTournament.status)}
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        <nav className="w-56 flex-shrink-0">
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-2 border border-slate-700 sticky top-20">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname.includes(item.path);
              return (
                <Link
                  key={item.path}
                  to={`/tournament/${id}/${item.path}`}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-all duration-200
                    ${isActive 
                      ? 'bg-amber-500/20 text-amber-400 shadow-lg shadow-amber-500/10' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                    }
                  `}
                >
                  <Icon size={18} />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function getFormatName(format: string): string {
  const names: Record<string, string> = {
    swiss: '瑞士轮',
    single_elimination: '单败淘汰',
    double_elimination: '双败淘汰',
    round_robin: '循环赛'
  };
  return names[format] || format;
}

function getStatusName(status: string): string {
  const names: Record<string, string> = {
    draft: '草稿',
    registration: '报名中',
    in_progress: '进行中',
    completed: '已结束'
  };
  return names[status] || status;
}
