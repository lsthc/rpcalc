import { useState, useMemo, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator,
  ChevronLeft,
  Settings,
  Check,
  RotateCcw,
  TrendingUp,
  Sparkles,
  ShoppingCart,
  ArrowRight
} from 'lucide-react';

// ============ 타입 정의 ============
interface RPPackage {
  id: number;
  rp: number;
  price: number;
}

type Mode = 'home' | 'calculate' | 'plan' | 'efficiency' | 'settings';

interface AppSettings {
  baseTierId: number;
  customPrices: Record<number, number>;
}

// ============ 기본 RP 패키지 ============
const DEFAULT_RP_TIERS: RPPackage[] = [
  { id: 1, rp: 480, price: 4900 },
  { id: 2, rp: 980, price: 9900 },
  { id: 3, rp: 1425, price: 14000 },
  { id: 4, rp: 3700, price: 35000 },
  { id: 5, rp: 7200, price: 65000 },
  { id: 6, rp: 11800, price: 99900 },
];

// ============ 스킨 가격 프리셋 ============
const SKIN_PRESETS = [
  { name: '전설 스킨', rp: 1820 },
  { name: '에픽 스킨', rp: 1350 },
  { name: '슈퍼 스킨', rp: 975 },
  { name: '레거시 스킨', rp: 520 },
  { name: '챔피언', rp: 975 },
  { name: '궁극의 스킨', rp: 3250 },
];

// ============ 설정 Context ============
const SettingsContext = createContext<{
  settings: AppSettings;
  setSettings: (s: AppSettings) => void;
  tiers: RPPackage[];
  baseTier: RPPackage;
}>({
  settings: { baseTierId: 6, customPrices: {} },
  setSettings: () => {},
  tiers: DEFAULT_RP_TIERS,
  baseTier: DEFAULT_RP_TIERS[5],
});

// ============ 최적 구매 알고리즘 ============
const findOptimalPlan = (targetRP: number, tiers: RPPackage[]): { packages: RPPackage[], totalRP: number, totalPrice: number } => {
  if (targetRP <= 0) return { packages: [], totalRP: 0, totalPrice: 0 };

  const maxRP = tiers.reduce((max, t) => Math.max(max, t.rp), 0);
  const maxPossibleRP = targetRP + maxRP;
  const dp = new Array(maxPossibleRP + 1).fill(Infinity);
  const parent = new Array(maxPossibleRP + 1).fill(null);

  dp[0] = 0;

  for (let i = 0; i < maxPossibleRP; i++) {
    if (dp[i] === Infinity) continue;
    for (const tier of tiers) {
      const nextRP = i + tier.rp;
      if (nextRP <= maxPossibleRP) {
        if (dp[i] + tier.price < dp[nextRP]) {
          dp[nextRP] = dp[i] + tier.price;
          parent[nextRP] = { tier, prevRP: i };
        }
      }
    }
  }

  let minPrice = Infinity;
  let bestRP = targetRP;

  for (let i = targetRP; i <= maxPossibleRP; i++) {
    if (dp[i] < minPrice) {
      minPrice = dp[i];
      bestRP = i;
    }
  }

  const resultPackages: RPPackage[] = [];
  let curr = bestRP;
  while (curr > 0 && parent[curr]) {
    resultPackages.push(parent[curr].tier);
    curr = parent[curr].prevRP;
  }

  return {
    packages: resultPackages,
    totalRP: bestRP,
    totalPrice: minPrice,
  };
};

// ============ 메인 앱 ============
export function App() {
  const [mode, setMode] = useState<Mode>('home');
  const [settings, setSettings] = useState<AppSettings>({
    baseTierId: 6,
    customPrices: {},
  });

  const tiers = useMemo(() => {
    return DEFAULT_RP_TIERS.map(t => ({
      ...t,
      price: settings.customPrices[t.id] ?? t.price,
    }));
  }, [settings.customPrices]);

  const baseTier = useMemo(() => {
    return tiers.find(t => t.id === settings.baseTierId) || tiers[tiers.length - 1];
  }, [tiers, settings.baseTierId]);

  return (
    <SettingsContext.Provider value={{ settings, setSettings, tiers, baseTier }}>
      <div className="min-h-screen bg-black text-white overflow-x-hidden">
        <div className="max-w-md mx-auto min-h-screen relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ x: mode === 'home' ? -30 : 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: mode === 'home' ? 30 : -30, opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              {mode === 'home' && <HomeScreen setMode={setMode} />}
              {mode === 'calculate' && <CalculateScreen setMode={setMode} />}
              {mode === 'plan' && <PlanScreen setMode={setMode} />}
              {mode === 'efficiency' && <EfficiencyScreen setMode={setMode} />}
              {mode === 'settings' && <SettingsScreen setMode={setMode} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </SettingsContext.Provider>
  );
}

// ============ 홈 화면 ============
function HomeScreen({ setMode }: { setMode: (m: Mode) => void }) {
  const { baseTier, tiers } = useContext(SettingsContext);
  const rpPerWon = baseTier.price / baseTier.rp;
  
  // 최고 효율 패키지 찾기
  const bestEfficiency = tiers.reduce((best, tier) => {
    const eff = tier.rp / tier.price;
    return eff > best.eff ? { tier, eff } : best;
  }, { tier: tiers[0], eff: 0 });

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="px-6 pt-12 pb-8">
        <h1 className="text-5xl font-extralight tracking-tight">RP</h1>
        <h2 className="text-3xl font-extralight text-white/60 -mt-1">변환기</h2>
      </div>

      {/* Main Tiles */}
      <div className="px-4 space-y-2">
        {/* 가치 계산기 - Hero Tile */}
        <motion.button
          whileTap={{ scale: 0.98, opacity: 0.9 }}
          onClick={() => setMode('calculate')}
          className="w-full bg-[#0078d7] p-5 text-left relative overflow-hidden"
        >
          <Calculator className="absolute -right-4 -bottom-4 w-28 h-28 opacity-10" />
          <p className="text-sm opacity-70 mb-1">RP → 현금 가치</p>
          <p className="text-3xl font-light">가치 계산기</p>
          <div className="mt-4 flex items-center gap-2 text-sm opacity-70">
            <span>1 RP = ₩{rpPerWon.toFixed(2)}</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </motion.button>

        {/* 2열 타일 */}
        <div className="flex gap-2">
          {/* 구매 설계 */}
          <motion.button
            whileTap={{ scale: 0.97, opacity: 0.9 }}
            onClick={() => setMode('plan')}
            className="flex-1 bg-[#107c10] p-5 text-left relative overflow-hidden"
          >
            <ShoppingCart className="absolute -right-2 -bottom-2 w-16 h-16 opacity-10" />
            <p className="text-xs opacity-70 mb-1">최적 조합</p>
            <p className="text-xl font-light">구매 설계</p>
          </motion.button>

          {/* 효율 계산기 */}
          <motion.button
            whileTap={{ scale: 0.97, opacity: 0.9 }}
            onClick={() => setMode('efficiency')}
            className="flex-1 bg-[#744da9] p-5 text-left relative overflow-hidden"
          >
            <TrendingUp className="absolute -right-2 -bottom-2 w-16 h-16 opacity-10" />
            <p className="text-xs opacity-70 mb-1">패키지 비교</p>
            <p className="text-xl font-light">효율 분석</p>
          </motion.button>
        </div>

        {/* 설정 */}
        <motion.button
          whileTap={{ scale: 0.98, opacity: 0.9 }}
          onClick={() => setMode('settings')}
          className="w-full bg-[#2d2d2d] p-4 text-left flex items-center justify-between"
        >
          <div>
            <p className="text-lg font-light">설정</p>
            <p className="text-xs opacity-40 mt-0.5">기준: {baseTier.rp.toLocaleString()} RP 패키지</p>
          </div>
          <Settings className="w-5 h-5 opacity-40" />
        </motion.button>
      </div>

      {/* Quick Info Card */}
      <div className="mx-4 mt-6 p-4 border-l-2 border-[#0078d7] bg-white/[0.02]">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-[#0078d7] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-light">최고 효율 패키지</p>
            <p className="text-2xl font-light text-[#0078d7]">
              {bestEfficiency.tier.rp.toLocaleString()} RP
            </p>
            <p className="text-xs text-white/40 mt-1">
              ₩1,000당 {(bestEfficiency.tier.rp / (bestEfficiency.tier.price / 1000)).toFixed(1)} RP
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ 가치 계산기 화면 ============
function CalculateScreen({ setMode }: { setMode: (m: Mode) => void }) {
  const [inputRP, setInputRP] = useState('');
  const { baseTier } = useContext(SettingsContext);

  const rpPerWon = baseTier.price / baseTier.rp;
  const calculatedValue = useMemo(() => {
    const val = parseFloat(inputRP);
    if (isNaN(val)) return 0;
    return Math.round(val * rpPerWon);
  }, [inputRP, rpPerWon]);

  const quickPresets = [1350, 1820, 975, 3250];

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <button 
        onClick={() => setMode('home')} 
        className="flex items-center gap-1 px-4 pt-8 pb-4 text-white/60 active:text-white"
      >
        <ChevronLeft className="w-6 h-6" />
        <span className="text-sm">홈</span>
      </button>

      <div className="px-6">
        <h1 className="text-3xl font-light mb-8">가치 계산기</h1>

        {/* 입력 필드 */}
        <div className="mb-6">
          <label className="text-xs text-white/40 uppercase tracking-wider">RP 입력</label>
          <input
            type="number"
            inputMode="numeric"
            value={inputRP}
            onChange={(e) => setInputRP(e.target.value)}
            placeholder="0"
            className="w-full bg-transparent border-b-2 border-white/20 text-5xl font-light py-4 outline-none focus:border-[#0078d7] transition-colors placeholder:text-white/10"
            autoFocus
          />
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap gap-2 mb-8">
          {quickPresets.map((preset) => (
            <button
              key={preset}
              onClick={() => setInputRP(preset.toString())}
              className={`px-4 py-2 text-sm transition-colors ${
                inputRP === preset.toString() 
                  ? 'bg-[#0078d7] text-white' 
                  : 'bg-white/5 text-white/60 active:bg-white/10'
              }`}
            >
              {preset.toLocaleString()}
            </button>
          ))}
        </div>

        {/* 결과 */}
        <AnimatePresence>
          {inputRP && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-[#0078d7] p-6"
            >
              <p className="text-xs opacity-70 mb-1">실제 현금 가치</p>
              <p className="text-5xl font-light">₩{calculatedValue.toLocaleString()}</p>
              
              <div className="mt-6 pt-4 border-t border-white/20 space-y-1 text-sm opacity-70">
                <p>기준: {baseTier.rp.toLocaleString()} RP = ₩{baseTier.price.toLocaleString()}</p>
                <p>환율: 1 RP = ₩{rpPerWon.toFixed(2)}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!inputRP && (
          <div className="py-16 text-center text-white/20">
            <Calculator className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-sm">RP를 입력하면<br/>실제 가치를 계산합니다</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ 구매 설계 화면 ============
function PlanScreen({ setMode }: { setMode: (m: Mode) => void }) {
  const [targetRP, setTargetRP] = useState('');
  const { tiers } = useContext(SettingsContext);

  const planningResult = useMemo(() => {
    const val = parseInt(targetRP);
    if (isNaN(val) || val <= 0) return null;
    return findOptimalPlan(val, tiers);
  }, [targetRP, tiers]);

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <button 
        onClick={() => setMode('home')} 
        className="flex items-center gap-1 px-4 pt-8 pb-4 text-white/60 active:text-white"
      >
        <ChevronLeft className="w-6 h-6" />
        <span className="text-sm">홈</span>
      </button>

      <div className="px-6">
        <h1 className="text-3xl font-light mb-2">구매 설계</h1>
        <p className="text-sm text-white/40 mb-6">목표 RP를 위한 최적의 조합을 찾습니다</p>

        {/* 입력 필드 */}
        <div className="mb-4">
          <label className="text-xs text-white/40 uppercase tracking-wider">목표 RP</label>
          <input
            type="number"
            inputMode="numeric"
            value={targetRP}
            onChange={(e) => setTargetRP(e.target.value)}
            placeholder="예: 1820"
            className="w-full bg-transparent border-b-2 border-white/20 text-5xl font-light py-4 outline-none focus:border-[#107c10] transition-colors placeholder:text-white/10 placeholder:text-3xl"
            autoFocus
          />
        </div>

        {/* Preset Buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          {SKIN_PRESETS.slice(0, 4).map((preset) => (
            <button
              key={preset.rp}
              onClick={() => setTargetRP(preset.rp.toString())}
              className={`px-3 py-2 text-xs transition-colors ${
                targetRP === preset.rp.toString() 
                  ? 'bg-[#107c10] text-white' 
                  : 'bg-white/5 text-white/60 active:bg-white/10'
              }`}
            >
              {preset.name} ({preset.rp})
            </button>
          ))}
        </div>

        {/* 결과 */}
        <AnimatePresence>
          {planningResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* 총액 */}
              <div className="bg-[#107c10] p-6">
                <p className="text-xs opacity-70 mb-1">총 결제 금액</p>
                <p className="text-5xl font-light">₩{planningResult.totalPrice.toLocaleString()}</p>
                
                <div className="mt-4 pt-4 border-t border-white/20 flex justify-between">
                  <div>
                    <p className="text-xs opacity-70">획득 RP</p>
                    <p className="text-2xl font-light">{planningResult.totalRP.toLocaleString()}</p>
                  </div>
                  {planningResult.totalRP > parseInt(targetRP) && (
                    <div className="text-right">
                      <p className="text-xs opacity-70">잔여 RP</p>
                      <p className="text-2xl font-light text-white/80">+{(planningResult.totalRP - parseInt(targetRP)).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 패키지 목록 */}
              <div>
                <p className="text-xs text-white/40 uppercase tracking-wider mb-3">구매 목록</p>
                <div className="space-y-1">
                  {Object.entries(
                    planningResult.packages.reduce((acc, p) => {
                      acc[p.id] = (acc[p.id] || 0) + 1;
                      return acc;
                    }, {} as Record<number, number>)
                  ).map(([id, count]) => {
                    const tier = tiers.find(t => t.id === parseInt(id))!;
                    return (
                      <div 
                        key={id} 
                        className="bg-white/5 p-4 flex justify-between items-center"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[#107c10] flex items-center justify-center text-sm font-medium">
                            {count}
                          </div>
                          <div>
                            <p className="text-lg font-light">{tier.rp.toLocaleString()} RP</p>
                            <p className="text-xs text-white/40">₩{tier.price.toLocaleString()}</p>
                          </div>
                        </div>
                        <p className="text-lg">₩{(tier.price * count).toLocaleString()}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!targetRP && (
          <div className="py-16 text-center text-white/20">
            <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-sm">필요한 RP를 입력하면<br/>최적의 구매 조합을 알려드립니다</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ 효율 계산기 화면 ============
function EfficiencyScreen({ setMode }: { setMode: (m: Mode) => void }) {
  const { tiers, settings } = useContext(SettingsContext);
  const [compareMode, setCompareMode] = useState<'price' | 'rp'>('price');

  // 효율 계산 (1000원당 RP)
  const tiersWithEfficiency = useMemo(() => {
    return tiers.map(tier => ({
      ...tier,
      efficiency: tier.rp / (tier.price / 1000),
      pricePerRP: tier.price / tier.rp,
    })).sort((a, b) => b.efficiency - a.efficiency);
  }, [tiers]);

  const maxEfficiency = tiersWithEfficiency[0].efficiency;
  const minEfficiency = tiersWithEfficiency[tiersWithEfficiency.length - 1].efficiency;

  // 최저 대비 절약 금액 계산
  const calculateSavings = (tier: typeof tiersWithEfficiency[0], targetRP: number) => {
    const worstTier = tiersWithEfficiency[tiersWithEfficiency.length - 1];
    const costWithWorst = targetRP * worstTier.pricePerRP;
    const costWithThis = targetRP * tier.pricePerRP;
    return Math.round(costWithWorst - costWithThis);
  };

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <button 
        onClick={() => setMode('home')} 
        className="flex items-center gap-1 px-4 pt-8 pb-4 text-white/60 active:text-white"
      >
        <ChevronLeft className="w-6 h-6" />
        <span className="text-sm">홈</span>
      </button>

      <div className="px-6">
        <h1 className="text-3xl font-light mb-2">효율 분석</h1>
        <p className="text-sm text-white/40 mb-6">패키지별 RP 효율을 비교합니다</p>

        {/* Toggle */}
        <div className="flex mb-6 bg-white/5">
          <button
            onClick={() => setCompareMode('price')}
            className={`flex-1 py-3 text-sm transition-colors ${
              compareMode === 'price' ? 'bg-[#744da9] text-white' : 'text-white/50'
            }`}
          >
            ₩1,000당 RP
          </button>
          <button
            onClick={() => setCompareMode('rp')}
            className={`flex-1 py-3 text-sm transition-colors ${
              compareMode === 'rp' ? 'bg-[#744da9] text-white' : 'text-white/50'
            }`}
          >
            1 RP당 가격
          </button>
        </div>

        {/* 패키지 목록 */}
        <div className="space-y-2">
          {tiersWithEfficiency.map((tier, index) => {
            const isBase = tier.id === settings.baseTierId;
            const isBest = index === 0;
            const efficiencyPercent = ((tier.efficiency - minEfficiency) / (maxEfficiency - minEfficiency)) * 100;
            const savingsFor10000RP = calculateSavings(tier, 10000);

            return (
              <div 
                key={tier.id} 
                className={`p-4 relative overflow-hidden ${
                  isBest ? 'bg-[#744da9]' : 'bg-white/5'
                }`}
              >
                {/* 효율 바 */}
                <div 
                  className="absolute bottom-0 left-0 h-1 bg-[#744da9]/50"
                  style={{ width: `${efficiencyPercent}%` }}
                />
                
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <p className="text-xl font-light">{tier.rp.toLocaleString()} RP</p>
                    {isBest && (
                      <span className="text-[10px] bg-white/20 px-1.5 py-0.5 uppercase">최고</span>
                    )}
                    {isBase && !isBest && (
                      <span className="text-[10px] bg-[#0078d7] px-1.5 py-0.5 uppercase">기준</span>
                    )}
                  </div>
                  <p className="text-lg">₩{tier.price.toLocaleString()}</p>
                </div>

                <div className="flex justify-between items-end">
                  <div className="text-sm text-white/60">
                    {compareMode === 'price' ? (
                      <span>₩1,000당 <span className={isBest ? 'text-white' : 'text-[#744da9]'}>{tier.efficiency.toFixed(1)}</span> RP</span>
                    ) : (
                      <span>1 RP당 <span className={isBest ? 'text-white' : 'text-[#744da9]'}>₩{tier.pricePerRP.toFixed(2)}</span></span>
                    )}
                  </div>
                  {!isBest && savingsFor10000RP > 0 && (
                    <p className="text-xs text-white/40">
                      10,000 RP 시 ₩{savingsFor10000RP.toLocaleString()} 손해
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 요약 */}
        <div className="mt-6 p-4 border-l-2 border-[#744da9] bg-white/[0.02]">
          <p className="text-sm text-white/60 mb-2">효율 차이</p>
          <p className="text-lg font-light">
            최고 효율 패키지는 최저 대비{' '}
            <span className="text-[#744da9]">
              {((maxEfficiency / minEfficiency - 1) * 100).toFixed(1)}%
            </span>{' '}
            더 효율적
          </p>
          <p className="text-xs text-white/40 mt-2">
            10,000 RP 구매 시 최대 ₩{calculateSavings(tiersWithEfficiency[tiersWithEfficiency.length - 1], 10000).toLocaleString()} 차이
          </p>
        </div>
      </div>
    </div>
  );
}

// ============ 설정 화면 ============
function SettingsScreen({ setMode }: { setMode: (m: Mode) => void }) {
  const { settings, setSettings, tiers } = useContext(SettingsContext);
  const [localPrices, setLocalPrices] = useState<Record<number, string>>({});
  const [showPriceEdit, setShowPriceEdit] = useState(false);

  const handleBaseTierChange = (tierId: number) => {
    setSettings({ ...settings, baseTierId: tierId });
  };

  const handlePriceChange = (tierId: number, value: string) => {
    setLocalPrices({ ...localPrices, [tierId]: value });
  };

  const handlePriceBlur = (tierId: number) => {
    const value = parseInt(localPrices[tierId]);
    if (!isNaN(value) && value > 0) {
      setSettings({
        ...settings,
        customPrices: { ...settings.customPrices, [tierId]: value },
      });
    }
    setLocalPrices({ ...localPrices, [tierId]: '' });
  };

  const resetAll = () => {
    setSettings({ baseTierId: 6, customPrices: {} });
    setLocalPrices({});
  };

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-8 pb-4">
        <button 
          onClick={() => setMode('home')} 
          className="flex items-center gap-1 text-white/60 active:text-white"
        >
          <ChevronLeft className="w-6 h-6" />
          <span className="text-sm">홈</span>
        </button>
        <button 
          onClick={resetAll}
          className="flex items-center gap-1 px-3 py-1.5 text-white/50 active:text-white bg-white/5"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="text-xs">초기화</span>
        </button>
      </div>

      <div className="px-6">
        <h1 className="text-3xl font-light mb-8">설정</h1>

        {/* 기준 패키지 설정 */}
        <div className="mb-8">
          <p className="text-sm text-white/60 mb-1">기준 패키지</p>
          <p className="text-xs text-white/30 mb-4">가치 계산 시 사용할 기준을 선택하세요</p>
          
          <div className="space-y-1">
            {tiers.map((tier) => {
              const isSelected = tier.id === settings.baseTierId;
              const efficiency = tier.rp / (tier.price / 1000);
              
              return (
                <button
                  key={tier.id}
                  onClick={() => handleBaseTierChange(tier.id)}
                  className={`w-full p-4 flex justify-between items-center text-left transition-colors ${
                    isSelected ? 'bg-[#0078d7]' : 'bg-white/5 active:bg-white/10'
                  }`}
                >
                  <div>
                    <p className="text-lg font-light">{tier.rp.toLocaleString()} RP</p>
                    <p className="text-xs text-white/50">₩{tier.price.toLocaleString()} · {efficiency.toFixed(1)} RP/₩1K</p>
                  </div>
                  {isSelected && <Check className="w-5 h-5" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 가격 수정 토글 */}
        <div className="mb-4">
          <button
            onClick={() => setShowPriceEdit(!showPriceEdit)}
            className="w-full p-4 bg-white/5 flex justify-between items-center"
          >
            <span className="text-sm">가격 수정</span>
            <ChevronLeft className={`w-5 h-5 transition-transform ${showPriceEdit ? 'rotate-90' : '-rotate-90'}`} />
          </button>
        </div>

        {/* 가격 커스터마이징 */}
        <AnimatePresence>
          {showPriceEdit && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <p className="text-xs text-white/30 mb-4">패키지 가격이 변경된 경우 수정하세요</p>
              
              <div className="space-y-2">
                {tiers.map((tier) => {
                  const defaultPrice = DEFAULT_RP_TIERS.find(t => t.id === tier.id)!.price;
                  const isModified = tier.price !== defaultPrice;
                  
                  return (
                    <div key={tier.id} className="bg-white/5 p-4">
                      <div className="flex justify-between items-center mb-2">
                        <p className="font-light">{tier.rp.toLocaleString()} RP</p>
                        {isModified && (
                          <span className="text-[10px] text-[#0078d7] uppercase">수정됨</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white/40">₩</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          value={localPrices[tier.id] ?? ''}
                          onChange={(e) => handlePriceChange(tier.id, e.target.value)}
                          onBlur={() => handlePriceBlur(tier.id)}
                          placeholder={tier.price.toLocaleString()}
                          className="flex-1 bg-transparent border-b border-white/20 py-1 outline-none focus:border-[#0078d7] placeholder:text-white/30"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
