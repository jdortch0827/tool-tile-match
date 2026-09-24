import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import {
  Hammer,
  Volume2,
  VolumeX,
  RotateCcw,
  Shuffle,
  Lightbulb,
  Play,
  Trophy,
  AlertTriangle,
  TimerReset,
  Lock,
  Star,
  ChevronsRight,
  MapPinned,
  Undo2,
  Sparkles,
  Settings,
  X,
  HelpCircle,
  Info,
  Trash2,
  Smartphone,
  CheckCircle2,
  Target,
} from 'lucide-react';

type DifficultyStyle = 'apprentice' | 'journeyman' | 'foreman';
type PackId = 'apprentice-yard' | 'journeyman-shop';
type Screen = 'loading' | 'start' | 'game';
type GameMode = 'level' | 'daily' | 'quick';
type QuickJobSize = 'small' | 'medium' | 'big';
type SettingsPanel = 'main' | 'how' | 'stats' | 'feedback' | 'about' | 'reset';

type ToolType = {
  key: string;
  iconSrc: string;
  label: string;
};

type TileData = ToolType & {
  id: string;
  x: number;
  y: number;
  z: number;
  matched: boolean;
};

type Position = Pick<TileData, 'x' | 'y' | 'z'>;

type LevelStarTargets = {
  threeStarTime: number;
  twoStarTime: number;
  idealMoves: number;
  maxHintsForThree: number;
  maxShufflesForThree: number;
  maxUndosForThree: number;
  undoPenalty: number;
};

type LevelDefinition = {
  id: number;
  name: string;
  subtitle: string;
  goal: string;
  difficulty: DifficultyStyle;
  pack: PackId;
  boardTheme: string;
  cols: number;
  rows: number;
  typeCount: number;
  starTargets: LevelStarTargets;
  positions: Position[];
};

type GameStats = {
  time: number;
  moves: number;
  score: number;
  bonus: number;
  stars: number;
  hintsUsed: number;
  shufflesUsed: number;
  undosUsed: number;
  bestScore: number;
  bestTime: number;
  bestMoves: number;
  bestStars: number;
  newBestScore: boolean;
  newBestTime: boolean;
  newFewestMoves: boolean;
  nextUnlocked: boolean;
  saveVerified?: boolean;
};

type LevelRecord = {
  completed: boolean;
  stars: number;
  bestScore: number;
  bestTime: number;
  fewestMoves: number;
  noHintsClear?: boolean;
  noShufflesClear?: boolean;
  noUndoClear?: boolean;
};

type LevelRecords = Record<number, LevelRecord>;

type AchievementKey =
  | 'first-job-complete'
  | 'three-star-worker'
  | 'no-help-needed'
  | 'clean-sweep'
  | 'fast-hands'
  | 'apprentice-complete'
  | 'perfect-apprentice'
  | 'journeyman-started'
  | 'journeyman-complete'
  | 'daily-worker'
  | 'three-day-streak'
  | 'quick-job'
  | 'no-mistakes'
  | 'shop-regular';

type AchievementDefinition = {
  key: AchievementKey;
  title: string;
  description: string;
};

type TotalStats = {
  jobsCompleted: number;
  totalMoves: number;
  totalHints: number;
  totalShuffles: number;
  totalUndos: number;
};

type DailyRecord = {
  date: string;
  completed: boolean;
  stars: number;
  bestScore: number;
  bestTime: number;
  fewestMoves: number;
};

type DailyRecords = Record<string, DailyRecord>;

type QuickPlayStats = {
  completed: number;
  bestScore: number;
  fastestTime: number;
  fewestMoves: number;
};

type StatsSummary = {
  jobsCompleted: number;
  totalStars: number;
  totalPossibleStars: number;
  bestScore: number;
  fastestTime: number;
  fewestMoves: number;
  totalMoves: number;
  totalHints: number;
  totalShuffles: number;
  totalUndos: number;
  achievementsUnlocked: number;
  dailyJobsCompleted: number;
  currentDailyStreak: number;
  bestDailyStreak: number;
  quickPlayCompleted: number;
  bestQuickPlayScore: number;
  fastestQuickPlayTime: number;
};

type PackSummary = {
  packId: PackId;
  packName: string;
  completed: number;
  total: number;
  stars: number;
  possibleStars: number;
  bestScore: number;
  fastestTime: number;
};

type PackCompletionData = PackSummary & {
  isFinalPack: boolean;
};

type AchievementToastData = {
  key: AchievementKey;
  title: string;
  description: string;
};


type MatchedMove = {
  pairIds: [string, string];
};

type SoundName = 'select' | 'match' | 'invalid' | 'hint' | 'shuffle' | 'undo' | 'win';

const APP_VERSION = '0.21.0-beta.1';
const BRAND_ICON_SRC = '/branding/tool-tile-match-icon-512.png';
const STORAGE_KEY = 'toolTileMatchUnlockedLevelV3';
const RECORDS_STORAGE_KEY = 'toolTileMatchLevelRecordsV4';
const TUTORIAL_STORAGE_KEY = 'toolTileMatchTutorialCompleteV1';
const VIBRATION_STORAGE_KEY = 'toolTileMatchVibrationOnV1';
const TOTAL_STATS_STORAGE_KEY = 'toolTileMatchTotalStatsV1';
const ACHIEVEMENTS_STORAGE_KEY = 'toolTileMatchAchievementsV1';
const DAILY_RECORDS_STORAGE_KEY = 'toolTileMatchDailyRecordsV1';
const QUICK_STATS_STORAGE_KEY = 'toolTileMatchQuickStatsV1';

const TOOL_TILE_SAVE_KEYS = [
  STORAGE_KEY,
  RECORDS_STORAGE_KEY,
  TUTORIAL_STORAGE_KEY,
  VIBRATION_STORAGE_KEY,
  TOTAL_STATS_STORAGE_KEY,
  ACHIEVEMENTS_STORAGE_KEY,
  DAILY_RECORDS_STORAGE_KEY,
  QUICK_STATS_STORAGE_KEY,
] as const;

const PACKS: Array<{ id: PackId; name: string; description: string; levelRange: string }> = [
  {
    id: 'apprentice-yard',
    name: 'Apprentice Yard',
    description: 'The first job pack. Smaller boards, lighter blocking, and basic jobsite rhythm.',
    levelRange: 'Levels 1-9',
  },
  {
    id: 'journeyman-shop',
    name: 'Journeyman Shop',
    description: 'The second job pack. Bigger shop layouts, more tools, and tighter matching decisions.',
    levelRange: 'Levels 10-18',
  },
];

const DIFFICULTY_LABELS: Record<DifficultyStyle, { name: string; description: string }> = {
  apprentice: {
    name: 'Apprentice',
    description: 'Smaller jobs with fewer tools and lighter blocking.',
  },
  journeyman: {
    name: 'Journeyman',
    description: 'Bigger boards with more layers and tighter decisions.',
  },
  foreman: {
    name: 'Foreman',
    description: 'Large jobsite layouts with fewer obvious matches.',
  },
};

const ACHIEVEMENTS: AchievementDefinition[] = [
  { key: 'first-job-complete', title: 'First Job Complete', description: 'Finish your first job.' },
  { key: 'three-star-worker', title: 'Three-Star Worker', description: 'Earn 3 stars on any level.' },
  { key: 'no-help-needed', title: 'No Help Needed', description: 'Finish a level without using a hint.' },
  { key: 'clean-sweep', title: 'Clean Sweep', description: 'Finish a level without using shuffle.' },
  { key: 'fast-hands', title: 'Fast Hands', description: 'Finish a level under the 3-star target time.' },
  { key: 'apprentice-complete', title: 'Apprentice Complete', description: 'Complete every Apprentice Yard job.' },
  { key: 'perfect-apprentice', title: 'Perfect Apprentice', description: 'Earn 3 stars on every Apprentice Yard job.' },
  { key: 'journeyman-started', title: 'Journeyman Started', description: 'Start the Journeyman Shop pack.' },
  { key: 'journeyman-complete', title: 'Journeyman Complete', description: 'Complete every Journeyman Shop job.' },
  { key: 'daily-worker', title: 'Daily Worker', description: 'Complete one Daily Job.' },
  { key: 'three-day-streak', title: 'Three-Day Streak', description: 'Complete Daily Jobs 3 days in a row.' },
  { key: 'quick-job', title: 'Quick Job', description: 'Complete one Quick Play board.' },
  { key: 'no-mistakes', title: 'No Mistakes', description: 'Complete any board with no hints, no shuffles, and no undo.' },
  { key: 'shop-regular', title: 'Shop Regular', description: 'Complete 25 total jobs across all modes.' },
];

const TOOL_TYPES: ToolType[] = [
  { key: 'hammer', iconSrc: '/tool-icons/hammer.png', label: 'Hammer' },
  { key: 'wrench', iconSrc: '/tool-icons/wrench.png', label: 'Wrench' },
  { key: 'screwdriver', iconSrc: '/tool-icons/screwdriver.png', label: 'Driver' },
  { key: 'measure', iconSrc: '/tool-icons/measure.png', label: 'Measure' },
  { key: 'drill', iconSrc: '/tool-icons/drill.png', label: 'Drill' },
  { key: 'saw', iconSrc: '/tool-icons/saw.png', label: 'Saw Blade' },
  { key: 'hardhat', iconSrc: '/tool-icons/hardhat.png', label: 'Hard Hat' },
  { key: 'vest', iconSrc: '/tool-icons/vest.png', label: 'Vest' },
  { key: 'pliers', iconSrc: '/tool-icons/pliers.png', label: 'Pliers' },
  { key: 'level', iconSrc: '/tool-icons/level.png', label: 'Level' },
  { key: 'roller', iconSrc: '/tool-icons/roller.png', label: 'Roller' },
  { key: 'knife', iconSrc: '/tool-icons/knife.png', label: 'Knife' },
  { key: 'ladder', iconSrc: '/tool-icons/ladder.png', label: 'Ladder' },
  { key: 'toolbox', iconSrc: '/tool-icons/toolbox.png', label: 'Toolbox' },
  { key: 'cone', iconSrc: '/tool-icons/cone.png', label: 'Cone' },
  { key: 'bolts', iconSrc: '/tool-icons/bolts.png', label: 'Bolts' },
];

const createGrid = (startX: number, startY: number, cols: number, rows: number, z: number): Position[] => {
  const positions: Position[] = [];
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      positions.push({ x: startX + x, y: startY + y, z });
    }
  }
  return positions;
};

const createRow = (startX: number, y: number, count: number, z: number): Position[] =>
  Array.from({ length: count }, (_, index) => ({ x: startX + index, y, z }));

const ladderPositions = (): Position[] => {
  const rails = Array.from({ length: 6 }, (_, y) => [
    { x: 0, y, z: 0 },
    { x: 5, y, z: 0 },
  ]).flat();

  return [
    ...rails,
    ...createRow(1, 1, 4, 0),
    ...createRow(1, 3, 4, 0),
    ...createRow(1, 5, 4, 0),
    ...createRow(2, 2, 2, 1),
    ...createRow(2, 4, 2, 1),
  ];
};

const stormPositions = (): Position[] => [
  ...createRow(0, 0, 4, 0),
  ...createRow(6, 0, 4, 0),
  ...createRow(1, 1, 8, 0),
  ...createRow(0, 2, 3, 0),
  ...createRow(5, 2, 5, 0),
  ...createRow(1, 3, 8, 0),
  ...createRow(0, 4, 4, 0),
  ...createRow(6, 4, 4, 0),
  ...createGrid(2, 1, 3, 2, 1),
  ...createGrid(5, 2, 3, 2, 1),
];

const LEVELS: LevelDefinition[] = [
  {
    id: 1,
    name: 'Tool Check',
    subtitle: 'Clear the starter bench and learn the rhythm.',
    goal: 'Clear all tiles. Try to finish under 1:30 with no undo.',
    difficulty: 'apprentice',
    pack: 'apprentice-yard',
    boardTheme: 'Starter rectangle',
    cols: 6,
    rows: 4,
    typeCount: 7,
    starTargets: { threeStarTime: 90, twoStarTime: 150, idealMoves: 8, maxHintsForThree: 1, maxShufflesForThree: 0, maxUndosForThree: 0, undoPenalty: 2 },
    positions: [...createGrid(1, 0, 4, 3, 0), ...createGrid(2, 1, 2, 1, 1)],
  },
  {
    id: 2,
    name: 'Framing Prep',
    subtitle: 'A wider workbench with a small raised stack.',
    goal: 'Clear the workbench. Use no more than 1 shuffle for a strong score.',
    difficulty: 'apprentice',
    pack: 'apprentice-yard',
    boardTheme: 'Wide workbench',
    cols: 8,
    rows: 4,
    typeCount: 9,
    starTargets: { threeStarTime: 120, twoStarTime: 195, idealMoves: 15, maxHintsForThree: 1, maxShufflesForThree: 0, maxUndosForThree: 0, undoPenalty: 2 },
    positions: [...createGrid(0, 1, 8, 2, 0), ...createRow(1, 3, 6, 0), ...createRow(2, 2, 4, 1)],
  },
  {
    id: 3,
    name: 'Shop Cleanup',
    subtitle: 'A toolbox-shaped board with tools buried in the middle.',
    goal: 'Open the middle stack early and clear the toolbox.',
    difficulty: 'apprentice',
    pack: 'apprentice-yard',
    boardTheme: 'Toolbox shape',
    cols: 8,
    rows: 4,
    typeCount: 11,
    starTargets: { threeStarTime: 160, twoStarTime: 245, idealMoves: 20, maxHintsForThree: 1, maxShufflesForThree: 0, maxUndosForThree: 1, undoPenalty: 2 },
    positions: [
      ...createRow(2, 0, 4, 0),
      ...createRow(0, 1, 8, 0),
      ...createRow(0, 2, 8, 0),
      ...createRow(1, 3, 6, 0),
      ...createGrid(2, 1, 4, 2, 1),
    ],
  },
  {
    id: 4,
    name: 'Safety Walkdown',
    subtitle: 'A cone-shaped walkdown with a few stacked hazards.',
    goal: 'Clear the cone layout and keep shuffles to 1 or less.',
    difficulty: 'journeyman',
    pack: 'apprentice-yard',
    boardTheme: 'Safety cone shape',
    cols: 10,
    rows: 5,
    typeCount: 13,
    starTargets: { threeStarTime: 210, twoStarTime: 320, idealMoves: 29, maxHintsForThree: 1, maxShufflesForThree: 1, maxUndosForThree: 1, undoPenalty: 2 },
    positions: [
      ...createRow(4, 0, 2, 0),
      ...createRow(3, 1, 4, 0),
      ...createRow(2, 2, 6, 0),
      ...createRow(1, 3, 8, 0),
      ...createRow(0, 4, 10, 0),
      ...createRow(3, 2, 4, 1),
      ...createRow(4, 2, 2, 2),
    ],
  },
  {
    id: 5,
    name: 'Scaffold Setup',
    subtitle: 'A ladder-inspired layout with open rails and rungs.',
    goal: 'Clear the ladder without leaning too hard on undo.',
    difficulty: 'journeyman',
    pack: 'apprentice-yard',
    boardTheme: 'Ladder shape',
    cols: 6,
    rows: 6,
    typeCount: 12,
    starTargets: { threeStarTime: 180, twoStarTime: 275, idealMoves: 18, maxHintsForThree: 1, maxShufflesForThree: 1, maxUndosForThree: 0, undoPenalty: 2 },
    positions: ladderPositions(),
  },
  {
    id: 6,
    name: 'Concrete Pour',
    subtitle: 'A wide slab board with a heavy center stack.',
    goal: 'Break down the center stack and finish under the 2-star target.',
    difficulty: 'journeyman',
    pack: 'apprentice-yard',
    boardTheme: 'Layered slab',
    cols: 10,
    rows: 5,
    typeCount: 15,
    starTargets: { threeStarTime: 275, twoStarTime: 420, idealMoves: 36, maxHintsForThree: 1, maxShufflesForThree: 1, maxUndosForThree: 1, undoPenalty: 2 },
    positions: [...createGrid(0, 1, 10, 4, 0), ...createGrid(2, 2, 6, 2, 1), ...createRow(4, 2, 2, 2)],
  },
  {
    id: 7,
    name: 'Foreman Inspection',
    subtitle: 'A bigger inspection board with a raised middle section.',
    goal: 'Make tight decisions and avoid more than 1 hint.',
    difficulty: 'foreman',
    pack: 'apprentice-yard',
    boardTheme: 'Inspection board',
    cols: 8,
    rows: 5,
    typeCount: 16,
    starTargets: { threeStarTime: 310, twoStarTime: 465, idealMoves: 42, maxHintsForThree: 1, maxShufflesForThree: 1, maxUndosForThree: 1, undoPenalty: 2 },
    positions: [...createGrid(0, 0, 8, 5, 0), ...createGrid(1, 1, 6, 3, 1), ...createRow(2, 2, 4, 2)],
  },
  {
    id: 8,
    name: 'Storm Delay',
    subtitle: 'An uneven jobsite layout with scattered openings.',
    goal: 'Work the scattered openings and recover smartly if the board locks.',
    difficulty: 'foreman',
    pack: 'apprentice-yard',
    boardTheme: 'Scattered jobsite',
    cols: 10,
    rows: 5,
    typeCount: 16,
    starTargets: { threeStarTime: 345, twoStarTime: 520, idealMoves: 44, maxHintsForThree: 1, maxShufflesForThree: 1, maxUndosForThree: 1, undoPenalty: 2 },
    positions: stormPositions(),
  },
  {
    id: 9,
    name: 'Final Cleanup',
    subtitle: 'The largest board. Clear every last tool from the site.',
    goal: 'Final challenge: clear the full site and earn at least 2 stars.',
    difficulty: 'foreman',
    pack: 'apprentice-yard',
    boardTheme: 'Final layered cleanup',
    cols: 10,
    rows: 6,
    typeCount: 16,
    starTargets: { threeStarTime: 420, twoStarTime: 640, idealMoves: 60, maxHintsForThree: 2, maxShufflesForThree: 1, maxUndosForThree: 1, undoPenalty: 2 },
    positions: [
      ...createGrid(0, 0, 10, 6, 0),
      ...createGrid(2, 1, 6, 4, 1),
      ...createGrid(3, 2, 4, 2, 2),
      ...createRow(4, 2, 2, 3),
    ],
  },
  {
    id: 10,
    name: 'Parts Counter',
    subtitle: 'A longer counter layout with a raised parts tray.',
    goal: 'Clear the parts counter with no more than 1 hint.',
    difficulty: 'journeyman',
    pack: 'journeyman-shop',
    boardTheme: 'Parts counter',
    cols: 10,
    rows: 5,
    typeCount: 16,
    starTargets: { threeStarTime: 300, twoStarTime: 455, idealMoves: 40, maxHintsForThree: 1, maxShufflesForThree: 1, maxUndosForThree: 1, undoPenalty: 2 },
    positions: [...createGrid(0, 1, 10, 3, 0), ...createGrid(2, 2, 6, 2, 1), ...createRow(4, 2, 2, 2)],
  },
  {
    id: 11,
    name: 'Tool Cage',
    subtitle: 'A locked-cage layout with narrow openings on both sides.',
    goal: 'Open the side lanes first and avoid unnecessary shuffles.',
    difficulty: 'journeyman',
    pack: 'journeyman-shop',
    boardTheme: 'Tool cage',
    cols: 10,
    rows: 5,
    typeCount: 16,
    starTargets: { threeStarTime: 325, twoStarTime: 490, idealMoves: 44, maxHintsForThree: 1, maxShufflesForThree: 1, maxUndosForThree: 1, undoPenalty: 2 },
    positions: [
      ...createRow(0, 0, 10, 0),
      ...createRow(0, 1, 3, 0),
      ...createRow(7, 1, 3, 0),
      ...createRow(0, 2, 10, 0),
      ...createRow(0, 3, 3, 0),
      ...createRow(7, 3, 3, 0),
      ...createRow(0, 4, 10, 0),
      ...createGrid(3, 1, 4, 3, 1),
    ],
  },
  {
    id: 12,
    name: 'Pipe Rack',
    subtitle: 'Long horizontal rows stacked like pipe joints on a rack.',
    goal: 'Clear the outer racks before working the center stack.',
    difficulty: 'journeyman',
    pack: 'journeyman-shop',
    boardTheme: 'Pipe rack',
    cols: 12,
    rows: 5,
    typeCount: 16,
    starTargets: { threeStarTime: 360, twoStarTime: 545, idealMoves: 48, maxHintsForThree: 1, maxShufflesForThree: 1, maxUndosForThree: 1, undoPenalty: 2 },
    positions: [
      ...createRow(0, 0, 12, 0),
      ...createRow(1, 1, 10, 0),
      ...createRow(0, 2, 12, 0),
      ...createRow(1, 3, 10, 0),
      ...createRow(0, 4, 12, 0),
      ...createRow(3, 1, 6, 1),
      ...createRow(4, 2, 4, 2),
    ],
  },
  {
    id: 13,
    name: 'Shop Bench',
    subtitle: 'A busy bench layout with tools stacked across the middle.',
    goal: 'Clear the bench and keep undo use low.',
    difficulty: 'journeyman',
    pack: 'journeyman-shop',
    boardTheme: 'Shop bench',
    cols: 10,
    rows: 6,
    typeCount: 16,
    starTargets: { threeStarTime: 370, twoStarTime: 560, idealMoves: 50, maxHintsForThree: 1, maxShufflesForThree: 1, maxUndosForThree: 1, undoPenalty: 2 },
    positions: [...createGrid(0, 1, 10, 4, 0), ...createGrid(2, 2, 6, 3, 1), ...createRow(4, 3, 2, 2)],
  },
  {
    id: 14,
    name: 'Equipment Check',
    subtitle: 'A wide inspection layout with raised check points.',
    goal: 'Finish under the 2-star target and use no more than 1 shuffle.',
    difficulty: 'foreman',
    pack: 'journeyman-shop',
    boardTheme: 'Equipment check',
    cols: 12,
    rows: 5,
    typeCount: 16,
    starTargets: { threeStarTime: 390, twoStarTime: 590, idealMoves: 54, maxHintsForThree: 1, maxShufflesForThree: 1, maxUndosForThree: 1, undoPenalty: 2 },
    positions: [
      ...createGrid(0, 0, 12, 5, 0),
      ...createGrid(2, 1, 8, 3, 1),
      ...createRow(4, 2, 4, 2),
    ],
  },
  {
    id: 15,
    name: 'Material Staging',
    subtitle: 'Staged materials create two heavy piles with an open lane.',
    goal: 'Work both piles evenly so the board does not lock early.',
    difficulty: 'foreman',
    pack: 'journeyman-shop',
    boardTheme: 'Material staging',
    cols: 12,
    rows: 6,
    typeCount: 16,
    starTargets: { threeStarTime: 405, twoStarTime: 610, idealMoves: 56, maxHintsForThree: 1, maxShufflesForThree: 1, maxUndosForThree: 1, undoPenalty: 2 },
    positions: [
      ...createGrid(0, 0, 5, 5, 0),
      ...createGrid(7, 0, 5, 5, 0),
      ...createGrid(1, 1, 3, 3, 1),
      ...createGrid(8, 1, 3, 3, 1),
      ...createRow(5, 2, 2, 0),
      ...createRow(5, 3, 2, 0),
    ],
  },
  {
    id: 16,
    name: 'Hot Work Prep',
    subtitle: 'A tighter safety layout with stacked center controls.',
    goal: 'Clear the hot-work board with careful pair selection.',
    difficulty: 'foreman',
    pack: 'journeyman-shop',
    boardTheme: 'Hot work prep',
    cols: 10,
    rows: 6,
    typeCount: 16,
    starTargets: { threeStarTime: 420, twoStarTime: 640, idealMoves: 58, maxHintsForThree: 1, maxShufflesForThree: 1, maxUndosForThree: 1, undoPenalty: 2 },
    positions: [
      ...createRow(3, 0, 4, 0),
      ...createRow(2, 1, 6, 0),
      ...createRow(1, 2, 8, 0),
      ...createRow(0, 3, 10, 0),
      ...createRow(1, 4, 8, 0),
      ...createRow(2, 5, 6, 0),
      ...createGrid(3, 2, 4, 2, 1),
      ...createRow(4, 3, 2, 2),
    ],
  },
  {
    id: 17,
    name: 'Night Shift',
    subtitle: 'A staggered board with uneven openings and fewer easy pairs.',
    goal: 'Use hints only when the board is truly blocked.',
    difficulty: 'foreman',
    pack: 'journeyman-shop',
    boardTheme: 'Night shift',
    cols: 12,
    rows: 6,
    typeCount: 16,
    starTargets: { threeStarTime: 455, twoStarTime: 690, idealMoves: 62, maxHintsForThree: 1, maxShufflesForThree: 1, maxUndosForThree: 1, undoPenalty: 2 },
    positions: [
      ...createRow(0, 0, 5, 0),
      ...createRow(7, 0, 5, 0),
      ...createRow(1, 1, 10, 0),
      ...createRow(0, 2, 12, 0),
      ...createRow(1, 3, 10, 0),
      ...createRow(0, 4, 5, 0),
      ...createRow(7, 4, 5, 0),
      ...createGrid(3, 1, 6, 3, 1),
      ...createRow(4, 2, 4, 2),
    ],
  },
  {
    id: 18,
    name: 'Final Shop Walkdown',
    subtitle: 'The second-pack finish: a large layered shop board.',
    goal: 'Final shop challenge: clear the board and try for 2 stars or better.',
    difficulty: 'foreman',
    pack: 'journeyman-shop',
    boardTheme: 'Final shop walkdown',
    cols: 12,
    rows: 6,
    typeCount: 16,
    starTargets: { threeStarTime: 500, twoStarTime: 760, idealMoves: 70, maxHintsForThree: 2, maxShufflesForThree: 1, maxUndosForThree: 1, undoPenalty: 2 },
    positions: [
      ...createGrid(0, 0, 12, 6, 0),
      ...createGrid(2, 1, 8, 4, 1),
      ...createGrid(4, 2, 4, 2, 2),
      ...createRow(5, 2, 2, 3),
    ],
  }
];

const classNames = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

const shuffleArray = <T,>(items: T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${secs}`;
};

const getStoredUnlockedLevel = () => {
  if (typeof window === 'undefined') return 1;
  try {
    const stored = Number(window.localStorage.getItem(STORAGE_KEY));
    if (Number.isFinite(stored) && stored > 0) return Math.min(stored, LEVELS.length);
  } catch {
    return 1;
  }
  return 1;
};

const getStoredLevelRecords = (): LevelRecords => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(RECORDS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as LevelRecords;
  } catch {
    return {};
  }
};

const saveLevelRecords = (records: LevelRecords) => {
  try {
    window.localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Records are optional. The game still plays if localStorage is unavailable.
  }
};


const getStoredTotalStats = (): TotalStats => {
  if (typeof window === 'undefined') return { jobsCompleted: 0, totalMoves: 0, totalHints: 0, totalShuffles: 0, totalUndos: 0 };
  try {
    const raw = window.localStorage.getItem(TOTAL_STATS_STORAGE_KEY);
    if (!raw) return { jobsCompleted: 0, totalMoves: 0, totalHints: 0, totalShuffles: 0, totalUndos: 0 };
    const parsed = JSON.parse(raw) as Partial<TotalStats>;
    return {
      jobsCompleted: parsed.jobsCompleted ?? 0,
      totalMoves: parsed.totalMoves ?? 0,
      totalHints: parsed.totalHints ?? 0,
      totalShuffles: parsed.totalShuffles ?? 0,
      totalUndos: parsed.totalUndos ?? 0,
    };
  } catch {
    return { jobsCompleted: 0, totalMoves: 0, totalHints: 0, totalShuffles: 0, totalUndos: 0 };
  }
};

const saveTotalStats = (stats: TotalStats) => {
  try {
    window.localStorage.setItem(TOTAL_STATS_STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // Total stats are optional.
  }
};

const getStoredAchievements = (): AchievementKey[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(ACHIEVEMENTS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AchievementKey[];
  } catch {
    return [];
  }
};

const saveAchievements = (achievements: AchievementKey[]) => {
  try {
    window.localStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(achievements));
  } catch {
    // Achievement saves are optional.
  }
};


const getStoredDailyRecords = (): DailyRecords => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(DAILY_RECORDS_STORAGE_KEY);
    return raw ? JSON.parse(raw) as DailyRecords : {};
  } catch {
    return {};
  }
};

const saveDailyRecords = (records: DailyRecords) => {
  try {
    window.localStorage.setItem(DAILY_RECORDS_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Daily records are optional.
  }
};

const getStoredQuickStats = (): QuickPlayStats => {
  if (typeof window === 'undefined') return { completed: 0, bestScore: 0, fastestTime: 0, fewestMoves: 0 };
  try {
    const raw = window.localStorage.getItem(QUICK_STATS_STORAGE_KEY);
    if (!raw) return { completed: 0, bestScore: 0, fastestTime: 0, fewestMoves: 0 };
    const parsed = JSON.parse(raw) as Partial<QuickPlayStats>;
    return {
      completed: parsed.completed ?? 0,
      bestScore: parsed.bestScore ?? 0,
      fastestTime: parsed.fastestTime ?? 0,
      fewestMoves: parsed.fewestMoves ?? 0,
    };
  } catch {
    return { completed: 0, bestScore: 0, fastestTime: 0, fewestMoves: 0 };
  }
};

const saveQuickStats = (stats: QuickPlayStats) => {
  try {
    window.localStorage.setItem(QUICK_STATS_STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // Quick play records are optional.
  }
};

const getDailyProgress = (records: DailyRecords) => {
  const completedDates = Object.keys(records).filter((key) => records[key]?.completed).sort();
  let bestStreak = 0;
  let running = 0;
  let previous = '';

  completedDates.forEach((dateKey) => {
    const expectedPrevious = previous ? offsetDateFromKey(dateKey, -1) : '';
    running = previous && expectedPrevious === previous ? running + 1 : 1;
    bestStreak = Math.max(bestStreak, running);
    previous = dateKey;
  });

  // Keep an active streak visible through today when yesterday was completed,
  // so a missed day does not make the UI look broken before today's job is played.
  const todayKey = getTodayKey();
  const streakStart = records[todayKey]?.completed ? todayKey : offsetDateFromKey(todayKey, -1);
  let currentStreak = 0;
  for (let dateKey = streakStart; currentStreak < 365; dateKey = offsetDateFromKey(dateKey, -1)) {
    if (records[dateKey]?.completed) currentStreak += 1;
    else break;
  }

  return { completed: completedDates.length, currentStreak, bestStreak };
};

const getLevelsByPack = (packId: PackId) => LEVELS.filter((level) => level.pack === packId);

const computeRecordAchievements = (records: LevelRecords): AchievementKey[] => {
  const unlocked = new Set<AchievementKey>();
  const completedLevels = LEVELS.filter((level) => records[level.id]?.completed);
  const apprenticeLevels = getLevelsByPack('apprentice-yard');
  const journeymanLevels = getLevelsByPack('journeyman-shop');

  if (completedLevels.length > 0) unlocked.add('first-job-complete');
  if (Object.values(records).some((record) => record.stars >= 3)) unlocked.add('three-star-worker');
  if (apprenticeLevels.every((level) => records[level.id]?.completed)) unlocked.add('apprentice-complete');
  if (apprenticeLevels.every((level) => (records[level.id]?.stars ?? 0) >= 3)) unlocked.add('perfect-apprentice');
  if (completedLevels.some((level) => level.pack === 'journeyman-shop') || (records[10]?.completed ?? false)) unlocked.add('journeyman-started');
  if (journeymanLevels.every((level) => records[level.id]?.completed)) unlocked.add('journeyman-complete');

  return Array.from(unlocked);
};

const mergeAchievements = (...groups: AchievementKey[][]): AchievementKey[] => Array.from(new Set(groups.flat()));

const getPackSummary = (packId: PackId, records: LevelRecords): PackSummary => {
  const pack = PACKS.find((item) => item.id === packId) ?? PACKS[0];
  const levels = getLevelsByPack(packId);
  const completedRecords = levels.map((level) => records[level.id]).filter((record): record is LevelRecord => Boolean(record?.completed));
  const stars = levels.reduce((sum, level) => sum + (records[level.id]?.stars ?? 0), 0);
  const bestScore = completedRecords.reduce((best, record) => Math.max(best, record.bestScore), 0);
  const fastestTime = completedRecords.reduce((best, record) => {
    if (!record.bestTime) return best;
    return best === 0 ? record.bestTime : Math.min(best, record.bestTime);
  }, 0);

  return {
    packId,
    packName: pack.name,
    completed: completedRecords.length,
    total: levels.length,
    stars,
    possibleStars: levels.length * 3,
    bestScore,
    fastestTime,
  };
};

const getStatsSummary = (records: LevelRecords, totalStats: TotalStats, achievements: AchievementKey[], dailyRecords: DailyRecords = {}, quickStats: QuickPlayStats = { completed: 0, bestScore: 0, fastestTime: 0, fewestMoves: 0 }): StatsSummary => {
  const completedRecords = Object.values(records).filter((record) => record.completed);
  const totalStars = LEVELS.reduce((sum, level) => sum + (records[level.id]?.stars ?? 0), 0);
  const bestScore = completedRecords.reduce((best, record) => Math.max(best, record.bestScore), 0);
  const fastestTime = completedRecords.reduce((best, record) => {
    if (!record.bestTime) return best;
    return best === 0 ? record.bestTime : Math.min(best, record.bestTime);
  }, 0);
  const fewestMoves = completedRecords.reduce((best, record) => {
    if (!record.fewestMoves) return best;
    return best === 0 ? record.fewestMoves : Math.min(best, record.fewestMoves);
  }, 0);

  const dailyProgress = getDailyProgress(dailyRecords);

  return {
    jobsCompleted: completedRecords.length,
    totalStars,
    totalPossibleStars: LEVELS.length * 3,
    bestScore,
    fastestTime,
    fewestMoves,
    totalMoves: totalStats.totalMoves,
    totalHints: totalStats.totalHints,
    totalShuffles: totalStats.totalShuffles,
    totalUndos: totalStats.totalUndos,
    achievementsUnlocked: achievements.length,
    dailyJobsCompleted: dailyProgress.completed,
    currentDailyStreak: dailyProgress.currentStreak,
    bestDailyStreak: dailyProgress.bestStreak,
    quickPlayCompleted: quickStats.completed,
    bestQuickPlayScore: quickStats.bestScore,
    fastestQuickPlayTime: quickStats.fastestTime,
  };
};

const getLevelReplayBadges = (record?: LevelRecord) => {
  if (!record?.completed) return [] as string[];
  const badges = ['Completed'];
  if (record.stars >= 3) badges.push('3★ clear');
  if (record.noHintsClear) badges.push('No hints');
  if (record.noShufflesClear) badges.push('No shuffle');
  if (record.noUndoClear) badges.push('No undo');
  if (record.stars < 3) badges.push('Replay for 3★');
  return badges;
};

const getModeLabel = (mode: GameMode, quickSize?: QuickJobSize) => {
  if (mode === 'daily') return 'Daily Job';
  if (mode === 'quick') return `${quickSize ? quickSize.charAt(0).toUpperCase() + quickSize.slice(1) : 'Quick'} Play`;
  return 'Job Map';
};

const getModeWinTitle = (mode: GameMode, isLastLevel: boolean) => {
  if (mode === 'daily') return 'Daily Job Complete';
  if (mode === 'quick') return 'Quick Job Complete';
  return isLastLevel ? 'Final cleanup complete' : 'Job Complete';
};

const getModeStampText = (mode: GameMode, isLastLevel: boolean) => {
  if (mode === 'daily') return 'Daily Done';
  if (mode === 'quick') return 'Quick Clear';
  return isLastLevel ? 'Final Sign-Off' : 'Job Complete';
};

const getAchievementByKey = (key: AchievementKey) => ACHIEVEMENTS.find((achievement) => achievement.key === key);

const createDebugReport = (
  records: LevelRecords,
  totalStats: TotalStats,
  achievements: AchievementKey[],
  selectedLevelId = 1,
  unlockedLevel = 1,
  dailyRecords: DailyRecords = {},
  quickStats: QuickPlayStats = { completed: 0, bestScore: 0, fastestTime: 0, fewestMoves: 0 },
  currentMode: GameMode = 'level',
  currentLevelName = '',
) => {
  const summary = getStatsSummary(records, totalStats, achievements, dailyRecords, quickStats);
  const storageKeys = getToolTileStorageSnapshot().map(([key]) => key).join(', ') || 'None';
  const completedLevels = LEVELS.filter((level) => records[level.id]?.completed).map((level) => level.id).join(', ') || 'None';
  const starsByLevel = LEVELS.map((level) => `L${level.id}:${records[level.id]?.stars ?? 0}`).join(' ');
  const achievementTitles = achievements.map((key) => getAchievementByKey(key)?.title ?? key).join(', ') || 'None';
  const generatedAt = new Date().toLocaleString();
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unavailable';
  const todayKey = getTodayKey();
  const todayDaily = dailyRecords[todayKey];
  const dailyDates = Object.keys(dailyRecords).filter((key) => dailyRecords[key]?.completed).sort().join(', ') || 'None';

  return [
    `Tool Tile Match ${APP_VERSION}`,
    `Generated: ${generatedAt}`,
    `Current mode: ${getModeLabel(currentMode)}`,
    `Selected level: ${selectedLevelId}${currentLevelName ? ` · ${currentLevelName}` : ''}`,
    `Unlocked levels: ${unlockedLevel}/${LEVELS.length}`,
    `Completed levels: ${completedLevels}`,
    `Stars by level: ${starsByLevel}`,
    `Jobs completed: ${summary.jobsCompleted}/${LEVELS.length}`,
    `Stars: ${summary.totalStars}/${summary.totalPossibleStars}`,
    `Best score: ${summary.bestScore}`,
    `Fastest time: ${summary.fastestTime ? formatTime(summary.fastestTime) : 'None'}`,
    `Fewest moves: ${summary.fewestMoves || 'None'}`,
    `Total moves: ${summary.totalMoves}`,
    `Hints/Shuffles/Undo: ${summary.totalHints}/${summary.totalShuffles}/${summary.totalUndos}`,
    `Daily jobs: ${summary.dailyJobsCompleted} · Current streak: ${summary.currentDailyStreak} · Best streak: ${summary.bestDailyStreak}`,
    `Today daily: ${todayDaily?.completed ? `complete · ${todayDaily.stars} stars · best ${todayDaily.bestScore}` : 'not complete'}`,
    `Completed daily dates: ${dailyDates}`,
    `Quick play: ${summary.quickPlayCompleted} completions · Best score: ${summary.bestQuickPlayScore} · Fastest: ${summary.fastestQuickPlayTime ? formatTime(summary.fastestQuickPlayTime) : 'None'} · Fewest moves: ${quickStats.fewestMoves || 'None'}`,
    `Achievements: ${summary.achievementsUnlocked}/${ACHIEVEMENTS.length}`,
    `Achievement names: ${achievementTitles}`,
    `Expected save keys: ${TOOL_TILE_SAVE_KEYS.join(', ')}`,
    `localStorage keys: ${storageKeys}`,
    `Browser: ${userAgent}`,
  ].join('\n');
};

const getStoredVibration = () => {
  if (typeof window === 'undefined') return true;
  try {
    const stored = window.localStorage.getItem(VIBRATION_STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  } catch {
    return true;
  }
};

const isTutorialComplete = () => {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(TUTORIAL_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

const saveTutorialComplete = () => {
  try {
    window.localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
  } catch {
    // Tutorial state is optional.
  }
};

const getDebugMode = () => {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('debug') === 'true';
};

const getToolTileStorageSnapshot = () => {
  if (typeof window === 'undefined') return [] as Array<[string, string]>;
  return Object.keys(window.localStorage)
    .filter((key) => key.startsWith('toolTileMatch'))
    .sort()
    .map((key) => [key, window.localStorage.getItem(key) ?? '']);
};

const vibrate = (pattern: number | number[], enabled: boolean) => {
  if (!enabled || typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Vibration support varies by browser.
  }
};

const getLevelById = (levelId: number) => LEVELS.find((level) => level.id === levelId) ?? LEVELS[0];
const getDifficultyName = (difficulty: DifficultyStyle) => DIFFICULTY_LABELS[difficulty].name;

const calculateStars = ({
  level,
  time,
  moves,
  hintsUsed,
  shufflesUsed,
  undosUsed,
}: {
  level: LevelDefinition;
  time: number;
  moves: number;
  hintsUsed: number;
  shufflesUsed: number;
  undosUsed: number;
}) => {
  const targets = level.starTargets;
  const penaltyScore = hintsUsed + shufflesUsed * 2 + undosUsed * targets.undoPenalty;
  const twoStarMoveLimit = Math.ceil(targets.idealMoves * 1.65);

  if (
    time <= targets.threeStarTime &&
    moves <= targets.idealMoves &&
    hintsUsed <= targets.maxHintsForThree &&
    shufflesUsed <= targets.maxShufflesForThree &&
    undosUsed <= targets.maxUndosForThree
  ) {
    return 3;
  }

  if (time <= targets.twoStarTime && moves <= twoStarMoveLimit && penaltyScore <= 7) {
    return 2;
  }

  return 1;
};

const getStarText = (stars: number) => '★'.repeat(stars) + '☆'.repeat(Math.max(0, 3 - stars));

const getWinMessage = (stats: GameStats) => {
  if (stats.stars === 3) return 'Clean run. That is the kind of finish that makes this level feel polished and fair.';
  if (stats.stars === 2) return 'Solid finish. Replay it with fewer penalties or a faster time to chase the third star.';
  return 'Job cleared. This level is playable, but the score shows where the beta balance can still be tightened.';
};

let audioContext: AudioContext | null = null;

const playTone = (sound: SoundName, enabled: boolean) => {
  if (!enabled || typeof window === 'undefined') return;

  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;

  audioContext = audioContext ?? new AudioContextClass();
  const context = audioContext;
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  const settings: Record<SoundName, { frequency: number; duration: number; type: OscillatorType; volume: number }> = {
    select: { frequency: 520, duration: 0.055, type: 'sine', volume: 0.045 },
    match: { frequency: 720, duration: 0.11, type: 'triangle', volume: 0.065 },
    invalid: { frequency: 170, duration: 0.13, type: 'sawtooth', volume: 0.045 },
    hint: { frequency: 900, duration: 0.12, type: 'sine', volume: 0.052 },
    shuffle: { frequency: 330, duration: 0.14, type: 'square', volume: 0.035 },
    undo: { frequency: 240, duration: 0.11, type: 'triangle', volume: 0.045 },
    win: { frequency: 980, duration: 0.22, type: 'triangle', volume: 0.075 },
  };

  const setting = settings[sound];
  oscillator.type = setting.type;
  oscillator.frequency.setValueAtTime(setting.frequency, now);
  if (sound === 'win') oscillator.frequency.exponentialRampToValueAtTime(1320, now + setting.duration);
  if (sound === 'match') oscillator.frequency.exponentialRampToValueAtTime(920, now + setting.duration);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(setting.volume, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + setting.duration);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + setting.duration + 0.02);
};

const tileHasSameSpot = (a: TileData, b: TileData) => a.x === b.x && a.y === b.y;

const isTileFree = (tile: TileData, tiles: TileData[]) => {
  if (tile.matched) return false;

  const activeTiles = tiles.filter((candidate) => !candidate.matched && candidate.id !== tile.id);

  const blockedFromAbove = activeTiles.some(
    (candidate) => candidate.z > tile.z && tileHasSameSpot(candidate, tile),
  );

  if (blockedFromAbove) return false;

  const blockedLeft = activeTiles.some(
    (candidate) => candidate.z === tile.z && candidate.y === tile.y && candidate.x === tile.x - 1,
  );

  const blockedRight = activeTiles.some(
    (candidate) => candidate.z === tile.z && candidate.y === tile.y && candidate.x === tile.x + 1,
  );

  return !blockedLeft || !blockedRight;
};

const getAvailablePairs = (tiles: TileData[]) => {
  const freeTiles = tiles.filter((tile) => isTileFree(tile, tiles));
  const pairs: Array<[TileData, TileData]> = [];

  for (let i = 0; i < freeTiles.length; i += 1) {
    for (let j = i + 1; j < freeTiles.length; j += 1) {
      if (freeTiles[i].key === freeTiles[j].key) {
        pairs.push([freeTiles[i], freeTiles[j]]);
      }
    }
  }

  return pairs;
};


const hashStringToSeed = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const seededRandom = (seedText: string) => {
  let seed = hashStringToSeed(seedText) || 1;
  return () => {
    seed = Math.imul(1664525, seed) + 1013904223;
    return ((seed >>> 0) / 4294967296);
  };
};

const seededShuffleArray = <T,>(items: T[], seedText: string) => {
  const copy = [...items];
  const random = seededRandom(seedText);
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
};

const getTodayKey = () => new Date().toISOString().slice(0, 10);

const getReadableDate = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const offsetDateKey = (offsetDays: number) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
};

const offsetDateFromKey = (dateKey: string, offsetDays: number) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
};

const createDailyLevel = (dateKey = getTodayKey()): LevelDefinition => {
  const seed = hashStringToSeed(`daily-${dateKey}`);
  const baseOptions = LEVELS.filter((level) => level.id >= 5 && level.id <= 14);
  const base = baseOptions[seed % baseOptions.length];
  return {
    ...base,
    id: -100,
    name: 'Daily Job',
    subtitle: `One seeded jobsite board for ${getReadableDate(dateKey)}. Replay it locally to improve your record.`,
    goal: 'Clear today\'s board and chase a clean daily record.',
    boardTheme: `Daily ${base.boardTheme}`,
    difficulty: base.id >= 10 ? 'journeyman' : base.difficulty,
    typeCount: Math.min(TOOL_TYPES.length, base.typeCount + 1),
    starTargets: {
      ...base.starTargets,
      threeStarTime: base.starTargets.threeStarTime + 20,
      twoStarTime: base.starTargets.twoStarTime + 35,
      idealMoves: base.starTargets.idealMoves + 2,
    },
  };
};

const createQuickLevel = (size: QuickJobSize = 'medium'): LevelDefinition => {
  const configs: Record<QuickJobSize, { baseId: number; name: string; subtitle: string; goal: string; id: number }> = {
    small: { baseId: 3, id: -201, name: 'Small Quick Job', subtitle: 'A short job for fast testing or a quick phone session.', goal: 'Clear a small board without affecting level unlock progress.' },
    medium: { baseId: 8, id: -202, name: 'Medium Quick Job', subtitle: 'A balanced board for normal casual play.', goal: 'Clear a medium board and chase a clean no-mistakes run.' },
    big: { baseId: 13, id: -203, name: 'Big Quick Job', subtitle: 'A larger quick board with more blocking and more tools.', goal: 'Clear a bigger board and try to beat your quick-play best score.' },
  };
  const config = configs[size];
  const base = getLevelById(config.baseId);
  return {
    ...base,
    id: config.id,
    name: config.name,
    subtitle: config.subtitle,
    goal: config.goal,
    boardTheme: `Quick Play ${base.boardTheme}`,
    difficulty: size === 'small' ? 'apprentice' : size === 'medium' ? 'journeyman' : 'foreman',
  };
};

const ensurePlayableStart = (tiles: TileData[]) => {
  const existingPairs = getAvailablePairs(tiles);
  if (existingPairs.length > 0) return tiles;

  const freeTiles = tiles.filter((tile) => isTileFree(tile, tiles));
  if (freeTiles.length < 2) return tiles;

  const [first, second] = freeTiles;
  const donor = tiles.find((tile) => tile.id !== first.id && tile.id !== second.id && tile.key === first.key) ?? first;

  return tiles.map((tile) => {
    if (tile.id === second.id) {
      return { ...tile, key: donor.key, iconSrc: donor.iconSrc, label: donor.label };
    }
    return tile;
  });
};

const buildTilePool = (totalTiles: number, typeCount: number, seedText?: string) => {
  const pairCount = Math.floor(totalTiles / 2);
  const selectedTools = TOOL_TYPES.slice(0, typeCount);
  const pool: ToolType[] = [];

  for (let i = 0; i < pairCount; i += 1) {
    const tool = selectedTools[i % selectedTools.length];
    pool.push(tool, tool);
  }

  return seedText ? seededShuffleArray(pool, seedText) : shuffleArray(pool);
};

const createTiles = (level: LevelDefinition, seedText?: string): TileData[] => {
  let attempt = 0;

  while (attempt < 75) {
    const pool = buildTilePool(level.positions.length, level.typeCount, seedText ? `${seedText}-${attempt}` : undefined);
    const tiles = level.positions.map((position, index) => ({
      id: seedText ? `seed-${seedText}-${attempt}-${index}` : `level-${level.id}-${Date.now()}-${attempt}-${index}`,
      ...pool[index],
      ...position,
      matched: false,
    }));

    const pairOptions = getAvailablePairs(tiles).length;
    const minimumPairs = level.id <= 2 ? 2 : 1;
    if (pairOptions >= minimumPairs) return tiles;
    attempt += 1;
  }

  const fallbackPool = buildTilePool(level.positions.length, level.typeCount, seedText ? `${seedText}-fallback` : undefined);
  const fallbackTiles = level.positions.map((position, index) => ({
    id: seedText ? `seed-${seedText}-fallback-${index}` : `level-${level.id}-fallback-${Date.now()}-${index}`,
    ...fallbackPool[index],
    ...position,
    matched: false,
  }));
  return ensurePlayableStart(fallbackTiles);
};

const reshuffleUnmatchedTiles = (tiles: TileData[]) => {
  const unmatched = tiles.filter((tile) => !tile.matched);
  const shuffledTools = shuffleArray(unmatched.map(({ key, iconSrc, label }) => ({ key, iconSrc, label })));
  let toolIndex = 0;

  const nextTiles = tiles.map((tile) => {
    if (tile.matched) return tile;
    const nextTool = shuffledTools[toolIndex];
    toolIndex += 1;
    return { ...tile, ...nextTool };
  });

  return ensurePlayableStart(nextTiles);
};

function App() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [tiles, setTiles] = useState<TileData[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hintIds, setHintIds] = useState<string[]>([]);
  const [invalidId, setInvalidId] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const [vibrationOn, setVibrationOn] = useState(getStoredVibration);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [removingIds, setRemovingIds] = useState<string[]>([]);
  const [noMovesOpen, setNoMovesOpen] = useState(false);
  const [winnerStats, setWinnerStats] = useState<GameStats | null>(null);
  const [unlockedLevel, setUnlockedLevel] = useState(getStoredUnlockedLevel);
  const [levelRecords, setLevelRecords] = useState<LevelRecords>(getStoredLevelRecords);
  const [selectedLevelId, setSelectedLevelId] = useState(1);
  const [currentLevelId, setCurrentLevelId] = useState(1);
  const [dragOriginId, setDragOriginId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [shufflesUsed, setShufflesUsed] = useState(0);
  const [undosUsed, setUndosUsed] = useState(0);
  const [matchHistory, setMatchHistory] = useState<MatchedMove[]>([]);
  const [sparkleIds, setSparkleIds] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsPanel, setSettingsPanel] = useState<SettingsPanel>('main');
  const [debugMode] = useState(getDebugMode);
  const [debugRevision, setDebugRevision] = useState(0);
  const [totalStats, setTotalStats] = useState<TotalStats>(getStoredTotalStats);
  const [achievements, setAchievements] = useState<AchievementKey[]>(() => mergeAchievements(getStoredAchievements(), computeRecordAchievements(getStoredLevelRecords())));
  const [achievementToast, setAchievementToast] = useState<AchievementToastData | null>(null);
  const [packCompletion, setPackCompletion] = useState<PackCompletionData | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>('level');
  const [quickJobSize, setQuickJobSize] = useState<QuickJobSize>('medium');
  const [dailyDateKey, setDailyDateKey] = useState(getTodayKey);
  const [customLevel, setCustomLevel] = useState<LevelDefinition | null>(null);
  const [dailyRecords, setDailyRecords] = useState<DailyRecords>(getStoredDailyRecords);
  const [quickStats, setQuickStats] = useState<QuickPlayStats>(getStoredQuickStats);

  const timerRef = useRef<number | null>(null);
  const dragStateRef = useRef<{ id: string; startX: number; startY: number; moved: boolean } | null>(null);
  const suppressNextClickRef = useRef(false);

  const currentLevel = customLevel ?? getLevelById(currentLevelId);
  const selectedLevel = getLevelById(selectedLevelId);
  const remainingTiles = tiles.filter((tile) => !tile.matched).length;
  const availablePairs = useMemo(() => getAvailablePairs(tiles), [tiles]);
  const progressPercent = Math.round((unlockedLevel / LEVELS.length) * 100);
  const clearPercent = tiles.length ? Math.round(((tiles.length - remainingTiles) / tiles.length) * 100) : 0;
  const statsSummary = useMemo(() => getStatsSummary(levelRecords, totalStats, achievements, dailyRecords, quickStats), [levelRecords, totalStats, achievements, dailyRecords, quickStats]);

  const showAchievementToast = (newAchievementKeys: AchievementKey[]) => {
    const firstNew = newAchievementKeys.map(getAchievementByKey).find(Boolean);
    if (!firstNew) return;
    setAchievementToast(firstNew);
    window.setTimeout(() => {
      setAchievementToast((current) => current?.key === firstNew.key ? null : current);
    }, 3200);
  };

  useEffect(() => {
    if (screen !== 'loading') return;
    const timeout = window.setTimeout(() => setScreen('start'), 850);
    return () => window.clearTimeout(timeout);
  }, [screen]);

  useEffect(() => {
    if (screen !== 'game' || winnerStats) return;

    timerRef.current = window.setInterval(() => {
      setElapsed((seconds) => seconds + 1);
    }, 1000);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [screen, winnerStats]);

  useEffect(() => {
    if (screen !== 'game' || winnerStats || busy || selectedIds.length > 0) return;
    if (remainingTiles > 0 && availablePairs.length === 0) {
      const timeout = window.setTimeout(() => setNoMovesOpen(true), 500);
      return () => window.clearTimeout(timeout);
    }
  }, [screen, winnerStats, busy, selectedIds.length, remainingTiles, availablePairs.length]);

  useEffect(() => {
    if (screen !== 'game' || winnerStats || remainingTiles !== 0 || tiles.length === 0) return;

    const bonus = Math.max(0, 1000 - elapsed * 5 - hintsUsed * 35 - shufflesUsed * 60 - undosUsed * 75);
    const finalScore = Math.max(0, score + bonus);
    const stars = calculateStars({ level: currentLevel, time: elapsed, moves, hintsUsed, shufflesUsed, undosUsed });
    let nextUnlocked = false;
    let bestScore = finalScore;
    let bestTime = elapsed;
    let bestMoves = moves;
    let bestStars = stars;
    let updatedRecords = levelRecords;
    let updatedDailyRecords = dailyRecords;
    let updatedQuickStats = quickStats;
    let newBestScore = true;
    let newBestTime = true;
    let newFewestMoves = true;

    if (gameMode === 'level') {
      const nextUnlockedLevel = Math.min(currentLevelId + 1, LEVELS.length);
      nextUnlocked = nextUnlockedLevel > unlockedLevel;

      if (nextUnlocked) {
        setUnlockedLevel(nextUnlockedLevel);
        try {
          window.localStorage.setItem(STORAGE_KEY, String(nextUnlockedLevel));
        } catch {
          // The game still works if saved progress is unavailable.
        }
      }

      const previousRecord = levelRecords[currentLevelId];
      newBestScore = !previousRecord || finalScore > previousRecord.bestScore;
      newBestTime = !previousRecord?.bestTime || elapsed < previousRecord.bestTime;
      newFewestMoves = !previousRecord?.fewestMoves || moves < previousRecord.fewestMoves;

      const updatedRecord: LevelRecord = {
        completed: true,
        stars: Math.max(previousRecord?.stars ?? 0, stars),
        bestScore: Math.max(previousRecord?.bestScore ?? 0, finalScore),
        bestTime: previousRecord?.bestTime ? Math.min(previousRecord.bestTime, elapsed) : elapsed,
        fewestMoves: previousRecord?.fewestMoves ? Math.min(previousRecord.fewestMoves, moves) : moves,
        noHintsClear: Boolean(previousRecord?.noHintsClear || hintsUsed === 0),
        noShufflesClear: Boolean(previousRecord?.noShufflesClear || shufflesUsed === 0),
        noUndoClear: Boolean(previousRecord?.noUndoClear || undosUsed === 0),
      };

      updatedRecords = { ...levelRecords, [currentLevelId]: updatedRecord };
      setLevelRecords(updatedRecords);
      saveLevelRecords(updatedRecords);

      bestScore = updatedRecord.bestScore;
      bestTime = updatedRecord.bestTime;
      bestMoves = updatedRecord.fewestMoves;
      bestStars = updatedRecord.stars;

      const previousPackSummary = getPackSummary(currentLevel.pack, levelRecords);
      const updatedPackSummary = getPackSummary(currentLevel.pack, updatedRecords);
      if (previousPackSummary.completed < previousPackSummary.total && updatedPackSummary.completed === updatedPackSummary.total) {
        setPackCompletion({
          ...updatedPackSummary,
          isFinalPack: currentLevel.pack === PACKS[PACKS.length - 1].id,
        });
      }
    }

    if (gameMode === 'daily') {
      const todayKey = dailyDateKey;
      const previousDaily = dailyRecords[todayKey];
      newBestScore = !previousDaily || finalScore > previousDaily.bestScore;
      newBestTime = !previousDaily?.bestTime || elapsed < previousDaily.bestTime;
      newFewestMoves = !previousDaily?.fewestMoves || moves < previousDaily.fewestMoves;

      const updatedDaily: DailyRecord = {
        date: todayKey,
        completed: true,
        stars: Math.max(previousDaily?.stars ?? 0, stars),
        bestScore: Math.max(previousDaily?.bestScore ?? 0, finalScore),
        bestTime: previousDaily?.bestTime ? Math.min(previousDaily.bestTime, elapsed) : elapsed,
        fewestMoves: previousDaily?.fewestMoves ? Math.min(previousDaily.fewestMoves, moves) : moves,
      };
      updatedDailyRecords = { ...dailyRecords, [todayKey]: updatedDaily };
      setDailyRecords(updatedDailyRecords);
      saveDailyRecords(updatedDailyRecords);
      bestScore = updatedDaily.bestScore;
      bestTime = updatedDaily.bestTime;
      bestMoves = updatedDaily.fewestMoves;
      bestStars = updatedDaily.stars;
    }

    if (gameMode === 'quick') {
      updatedQuickStats = {
        completed: quickStats.completed + 1,
        bestScore: Math.max(quickStats.bestScore, finalScore),
        fastestTime: quickStats.fastestTime ? Math.min(quickStats.fastestTime, elapsed) : elapsed,
        fewestMoves: quickStats.fewestMoves ? Math.min(quickStats.fewestMoves, moves) : moves,
      };
      setQuickStats(updatedQuickStats);
      saveQuickStats(updatedQuickStats);
      bestScore = updatedQuickStats.bestScore;
      bestTime = updatedQuickStats.fastestTime;
      bestMoves = updatedQuickStats.fewestMoves;
      bestStars = stars;
      newBestScore = !quickStats.bestScore || finalScore > quickStats.bestScore;
      newBestTime = !quickStats.fastestTime || elapsed < quickStats.fastestTime;
      newFewestMoves = !quickStats.fewestMoves || moves < quickStats.fewestMoves;
    }

    const updatedTotalStats: TotalStats = {
      jobsCompleted: totalStats.jobsCompleted + 1,
      totalMoves: totalStats.totalMoves + moves,
      totalHints: totalStats.totalHints + hintsUsed,
      totalShuffles: totalStats.totalShuffles + shufflesUsed,
      totalUndos: totalStats.totalUndos + undosUsed,
    };
    setTotalStats(updatedTotalStats);
    saveTotalStats(updatedTotalStats);

    const dailyProgress = getDailyProgress(updatedDailyRecords);
    const runAchievements: AchievementKey[] = [
      hintsUsed === 0 ? 'no-help-needed' : null,
      shufflesUsed === 0 ? 'clean-sweep' : null,
      elapsed <= currentLevel.starTargets.threeStarTime ? 'fast-hands' : null,
      hintsUsed === 0 && shufflesUsed === 0 && undosUsed === 0 ? 'no-mistakes' : null,
      gameMode === 'daily' ? 'daily-worker' : null,
      gameMode === 'daily' && dailyProgress.currentStreak >= 3 ? 'three-day-streak' : null,
      gameMode === 'quick' ? 'quick-job' : null,
      updatedTotalStats.jobsCompleted >= 25 ? 'shop-regular' : null,
    ].filter(Boolean) as AchievementKey[];

    const updatedAchievements = mergeAchievements(achievements, computeRecordAchievements(updatedRecords), runAchievements);
    const newAchievementKeys = updatedAchievements.filter((key) => !achievements.includes(key));
    setAchievements(updatedAchievements);
    saveAchievements(updatedAchievements);
    showAchievementToast(newAchievementKeys);

    setScore(finalScore);
    setWinnerStats({
      time: elapsed,
      moves,
      score: finalScore,
      bonus,
      stars,
      hintsUsed,
      shufflesUsed,
      undosUsed,
      bestScore,
      bestTime,
      bestMoves,
      bestStars,
      newBestScore,
      newBestTime,
      newFewestMoves,
      nextUnlocked,
      saveVerified: true,
    });
    playTone('win', soundOn);
    vibrate([90, 45, 120], vibrationOn);
  }, [
    screen,
    winnerStats,
    remainingTiles,
    tiles.length,
    elapsed,
    moves,
    score,
    currentLevelId,
    currentLevel,
    gameMode,
    unlockedLevel,
    hintsUsed,
    shufflesUsed,
    undosUsed,
    levelRecords,
    dailyRecords,
    quickStats,
    dailyDateKey,
    totalStats,
    achievements,
    soundOn,
    vibrationOn,
  ]);


  const startLevel = (levelId: number, forceUnlock = false) => {
    const level = getLevelById(levelId);
    if (!forceUnlock && level.id > unlockedLevel) return;

    setGameMode('level');
    setCustomLevel(null);
    setCurrentLevelId(level.id);
    setSelectedLevelId(level.id);
    setTiles(createTiles(level));
    setSelectedIds([]);
    setHintIds([]);
    setInvalidId(null);
    setScore(0);
    setMoves(0);
    setElapsed(0);
    setBusy(false);
    setRemovingIds([]);
    setNoMovesOpen(false);
    setWinnerStats(null);
    setDragOriginId(null);
    setDragging(false);
    setHintsUsed(0);
    setShufflesUsed(0);
    setUndosUsed(0);
    setMatchHistory([]);
    setSparkleIds([]);
    setPackCompletion(null);
    dragStateRef.current = null;
    setScreen('game');
    if (level.id === 1 && !isTutorialComplete()) {
      window.setTimeout(() => setTutorialOpen(true), 250);
    }
  };

  const startCustomGame = (mode: GameMode, level: LevelDefinition, seedText: string, quickSize: QuickJobSize = 'medium') => {
    setGameMode(mode);
    setQuickJobSize(quickSize);
    setCustomLevel(level);
    setCurrentLevelId(level.id);
    setTiles(createTiles(level, seedText));
    setSelectedIds([]);
    setHintIds([]);
    setInvalidId(null);
    setScore(0);
    setMoves(0);
    setElapsed(0);
    setBusy(false);
    setRemovingIds([]);
    setNoMovesOpen(false);
    setWinnerStats(null);
    setDragOriginId(null);
    setDragging(false);
    setHintsUsed(0);
    setShufflesUsed(0);
    setUndosUsed(0);
    setMatchHistory([]);
    setSparkleIds([]);
    setPackCompletion(null);
    dragStateRef.current = null;
    setScreen('game');
  };

  const startDailyJob = () => {
    const todayKey = getTodayKey();
    setDailyDateKey(todayKey);
    startCustomGame('daily', createDailyLevel(todayKey), `daily-${todayKey}`);
  };

  const startQuickPlay = (size: QuickJobSize) => {
    startCustomGame('quick', createQuickLevel(size), `quick-${size}-${Date.now()}`, size);
  };

  const restartGame = () => {
    if (gameMode === 'daily') return startDailyJob();
    if (gameMode === 'quick') return startQuickPlay(quickJobSize);
    return startLevel(currentLevelId, true);
  };

  const showInvalidClick = (tileId: string) => {
    playTone('invalid', soundOn);
    vibrate([40, 25, 40], vibrationOn);
    setInvalidId(tileId);
    window.setTimeout(() => setInvalidId(null), 450);
  };

  const clearDragState = () => {
    dragStateRef.current = null;
    setDragOriginId(null);
    setDragging(false);
  };

  const attemptPair = (firstTile: TileData, secondTile: TileData) => {
    if (busy || firstTile.id === secondTile.id || winnerStats) return;

    if (!isTileFree(firstTile, tiles)) {
      showInvalidClick(firstTile.id);
      return;
    }

    if (!isTileFree(secondTile, tiles)) {
      showInvalidClick(secondTile.id);
      return;
    }

    setHintIds([]);
    setMoves((currentMoves) => currentMoves + 1);

    if (firstTile.key === secondTile.key) {
      const pairIds: [string, string] = [firstTile.id, secondTile.id];
      playTone('match', soundOn);
      vibrate(45, vibrationOn);
      setBusy(true);
      setRemovingIds(pairIds);
      setSparkleIds(pairIds);
      setSelectedIds(pairIds);
      setMatchHistory((history) => [...history, { pairIds }]);
      setScore((currentScore) => currentScore + 100);

      window.setTimeout(() => {
        setTiles((currentTiles) =>
          currentTiles.map((candidate) =>
            pairIds.includes(candidate.id) ? { ...candidate, matched: true } : candidate,
          ),
        );
        setSelectedIds([]);
        setRemovingIds([]);
        setBusy(false);
      }, 300);
      window.setTimeout(() => setSparkleIds([]), 520);
      return;
    }

    setBusy(true);
    setSelectedIds([firstTile.id, secondTile.id]);
    showInvalidClick(secondTile.id);
    window.setTimeout(() => {
      setSelectedIds([]);
      setBusy(false);
    }, 650);
  };

  const handleTileClick = (tile: TileData) => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }

    if (busy || tile.matched || removingIds.includes(tile.id) || winnerStats) return;

    if (!isTileFree(tile, tiles)) {
      showInvalidClick(tile.id);
      return;
    }

    setHintIds([]);

    if (selectedIds.includes(tile.id)) {
      setSelectedIds([]);
      return;
    }

    if (selectedIds.length === 0) {
      playTone('select', soundOn);
      vibrate(15, vibrationOn);
      setSelectedIds([tile.id]);
      return;
    }

    const firstTile = tiles.find((candidate) => candidate.id === selectedIds[0]);
    if (!firstTile) {
      setSelectedIds([tile.id]);
      return;
    }

    attemptPair(firstTile, tile);
  };

  const handleTilePointerDown = (tile: TileData, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (busy || tile.matched || removingIds.includes(tile.id) || winnerStats) return;

    if (!isTileFree(tile, tiles)) {
      showInvalidClick(tile.id);
      return;
    }

    dragStateRef.current = { id: tile.id, startX: event.clientX, startY: event.clientY, moved: false };
    setDragOriginId(tile.id);
  };

  const handleBoardPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag) return;

    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (distance > 12) {
      drag.moved = true;
      setDragging(true);
      event.preventDefault();
    }
  };

  const handleBoardPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag) return;

    const elementAtPoint = document.elementFromPoint(event.clientX, event.clientY);
    const targetButton = elementAtPoint?.closest<HTMLButtonElement>('[data-tile-id]');
    const targetId = targetButton?.dataset.tileId;
    const startTile = tiles.find((tile) => tile.id === drag.id);
    const endTile = targetId ? tiles.find((tile) => tile.id === targetId) : undefined;

    if (drag.moved) {
      suppressNextClickRef.current = true;

      if (startTile && endTile && startTile.id !== endTile.id) {
        attemptPair(startTile, endTile);
      } else if (startTile) {
        showInvalidClick(startTile.id);
      }

      window.setTimeout(() => {
        suppressNextClickRef.current = false;
      }, 0);
    }

    clearDragState();
  };

  const handleHint = () => {
    if (busy || winnerStats || remainingTiles === 0) return;
    const [pair] = availablePairs;

    if (!pair) {
      setNoMovesOpen(true);
      return;
    }

    playTone('hint', soundOn);
    setHintsUsed((count) => count + 1);
    setHintIds([pair[0].id, pair[1].id]);
    setScore((currentScore) => Math.max(0, currentScore - 25));
    window.setTimeout(() => setHintIds([]), 1600);
  };

  const handleShuffle = () => {
    if (busy || winnerStats || remainingTiles === 0) return;

    let shuffled = tiles;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      shuffled = reshuffleUnmatchedTiles(shuffled);
      if (getAvailablePairs(shuffled).length > 0) break;
    }

    playTone('shuffle', soundOn);
    setShufflesUsed((count) => count + 1);
    setTiles(shuffled);
    setSelectedIds([]);
    setHintIds([]);
    setScore((currentScore) => Math.max(0, currentScore - 50));
    setNoMovesOpen(false);
  };

  const handleUndo = () => {
    if (busy || winnerStats || matchHistory.length === 0) return;

    const lastMove = matchHistory[matchHistory.length - 1];
    playTone('undo', soundOn);
    setTiles((currentTiles) =>
      currentTiles.map((tile) =>
        lastMove.pairIds.includes(tile.id) ? { ...tile, matched: false } : tile,
      ),
    );
    setMatchHistory((history) => history.slice(0, -1));
    setUndosUsed((count) => count + 1);
    setScore((currentScore) => Math.max(0, currentScore - 75));
    setSelectedIds([]);
    setHintIds([]);
    setNoMovesOpen(false);
  };

  const handleSelectLevel = (levelId: number) => {
    if (levelId > unlockedLevel) return;
    setSelectedLevelId(levelId);
  };

  const handleNextLevel = () => {
    if (gameMode !== 'level') {
      setScreen('start');
      return;
    }
    const nextLevelId = Math.min(currentLevelId + 1, LEVELS.length);
    startLevel(nextLevelId, true);
  };

  const openSettings = (panel: SettingsPanel = 'main') => {
    setSettingsPanel(panel);
    setSettingsOpen(true);
  };

  const closeSettings = () => {
    setSettingsOpen(false);
    setSettingsPanel('main');
  };

  const resetProgress = () => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(RECORDS_STORAGE_KEY);
      window.localStorage.removeItem(TUTORIAL_STORAGE_KEY);
      window.localStorage.removeItem(TOTAL_STATS_STORAGE_KEY);
      window.localStorage.removeItem(ACHIEVEMENTS_STORAGE_KEY);
      window.localStorage.removeItem(DAILY_RECORDS_STORAGE_KEY);
      window.localStorage.removeItem(QUICK_STATS_STORAGE_KEY);
    } catch {
      // Reset still updates the current session even if storage is unavailable.
    }
    setUnlockedLevel(1);
    setSelectedLevelId(1);
    setCurrentLevelId(1);
    setLevelRecords({});
    setTotalStats({ jobsCompleted: 0, totalMoves: 0, totalHints: 0, totalShuffles: 0, totalUndos: 0 });
    setAchievements([]);
    setDailyRecords({});
    setQuickStats({ completed: 0, bestScore: 0, fastestTime: 0, fewestMoves: 0 });
    setPackCompletion(null);
    setAchievementToast(null);
    setSettingsPanel('main');
  };

  const toggleVibration = () => {
    setVibrationOn((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(VIBRATION_STORAGE_KEY, String(next));
      } catch {
        // Vibration setting is optional.
      }
      if (next) vibrate(25, true);
      return next;
    });
  };

  const closeTutorial = () => {
    saveTutorialComplete();
    setTutorialOpen(false);
  };

  const replayTutorial = () => {
    setSettingsOpen(false);
    setSettingsPanel('main');
    setTutorialOpen(true);
  };

  return (
    <main className={classNames('app-shell', screen === 'start' && 'start-mode')}>
      <div className="background-grid" />
      {screen === 'loading' ? (
        <LoadingScreen />
      ) : screen === 'start' ? (
        <StartScreen
          selectedLevel={selectedLevel}
          selectedLevelId={selectedLevelId}
          unlockedLevel={unlockedLevel}
          progressPercent={progressPercent}
          levelRecords={levelRecords}
          statsSummary={statsSummary}
          achievements={achievements}
          dailyRecords={dailyRecords}
          quickStats={quickStats}
          onStartDaily={startDailyJob}
          onStartQuick={startQuickPlay}
          onOpenStats={() => openSettings('stats')}
          onSelectLevel={handleSelectLevel}
          onStart={() => startLevel(selectedLevelId)}
          onOpenSettings={() => openSettings('main')}
        />
      ) : (
        <section className="game-layout">
          <GameHeader
            level={currentLevel}
            gameMode={gameMode}
            quickJobSize={quickJobSize}
            score={score}
            moves={moves}
            elapsed={elapsed}
            remainingTiles={remainingTiles}
            soundOn={soundOn}
            onToggleSound={() => setSoundOn((current) => !current)}
            onBackToStart={() => setScreen('start')}
          />

          <GameBoard
            tiles={tiles}
            level={currentLevel}
            selectedIds={selectedIds}
            hintIds={hintIds}
            invalidId={invalidId}
            removingIds={removingIds}
            dragOriginId={dragOriginId}
            dragging={dragging}
            sparkleIds={sparkleIds}
            availablePairsCount={availablePairs.length}
            clearPercent={clearPercent}
            selectedTileLabel={selectedIds.length === 1 ? tiles.find((tile) => tile.id === selectedIds[0])?.label : undefined}
            onTileClick={handleTileClick}
            onTilePointerDown={handleTilePointerDown}
            onBoardPointerMove={handleBoardPointerMove}
            onBoardPointerUp={handleBoardPointerUp}
          />

          <GameControls
            onHint={handleHint}
            onShuffle={handleShuffle}
            onUndo={handleUndo}
            onRestart={restartGame}
            canHint={!busy && !winnerStats && remainingTiles > 0 && availablePairs.length > 0}
            canShuffle={!busy && !winnerStats && remainingTiles > 0}
            canUndo={matchHistory.length > 0 && !busy && !winnerStats}
            hintsUsed={hintsUsed}
            shufflesUsed={shufflesUsed}
            undosUsed={undosUsed}
          />

          <section className="instructions-card">
            <div>
              <strong>Goal:</strong> {currentLevel.goal}<br />
              <strong>How to play:</strong> Tap one free tile, then tap its match. Or drag one free tile onto a matching free tile.
            </div>
            <div className="legend">
              <span><b className="dot free-dot" /> Free</span>
              <span><b className="dot locked-dot" /> Blocked</span>
              <span><b className="dot hint-dot" /> Hint</span>
            </div>
          </section>

          {winnerStats && (
            <WinModal
              stats={winnerStats}
              level={currentLevel}
              gameMode={gameMode}
              quickJobSize={quickJobSize}
              dailyProgress={getDailyProgress(dailyRecords)}
              dailyDate={getReadableDate(dailyDateKey)}
              isLastLevel={gameMode === 'level' && currentLevelId >= LEVELS.length}
              onPlayAgain={restartGame}
              onNextLevel={handleNextLevel}
              onJobMap={() => setScreen('start')}
            />
          )}
          {noMovesOpen && !winnerStats && (
            <NoMovesModal onShuffle={handleShuffle} onRestart={restartGame} onClose={() => setNoMovesOpen(false)} />
          )}
          {packCompletion && winnerStats && (
            <PackCompletionModal pack={packCompletion} onClose={() => setPackCompletion(null)} onJobMap={() => { setPackCompletion(null); setScreen('start'); }} />
          )}
        </section>
      )}
      {tutorialOpen && (
        <TutorialModal onClose={closeTutorial} />
      )}
      {settingsOpen && (
        <SettingsModal
          panel={settingsPanel}
          soundOn={soundOn}
          appVersion={APP_VERSION}
          statsSummary={statsSummary}
          levelRecords={levelRecords}
          achievements={achievements}
          dailyRecords={dailyRecords}
          quickStats={quickStats}
          onSetPanel={setSettingsPanel}
          vibrationOn={vibrationOn}
          onToggleSound={() => setSoundOn((current) => !current)}
          onToggleVibration={toggleVibration}
          onReplayTutorial={replayTutorial}
          onResetProgress={resetProgress}
          onClose={closeSettings}
        />
      )}
      {achievementToast && (
        <AchievementToast achievement={achievementToast} onClose={() => setAchievementToast(null)} />
      )}
      {debugMode && (
        <DebugPanel
          appVersion={APP_VERSION}
          revision={debugRevision}
          onUnlockAll={() => {
            setUnlockedLevel(LEVELS.length);
            setSelectedLevelId((current) => Math.min(Math.max(current, 1), LEVELS.length));
            window.localStorage.setItem(STORAGE_KEY, String(LEVELS.length));
            setDebugRevision((current) => current + 1);
          }}
          onResetProgress={() => {
            resetProgress();
            setDebugRevision((current) => current + 1);
          }}
          onResetTutorial={() => {
            window.localStorage.removeItem(TUTORIAL_STORAGE_KEY);
            setTutorialOpen(false);
            setDebugRevision((current) => current + 1);
          }}
          onClearRecords={() => {
            window.localStorage.removeItem(RECORDS_STORAGE_KEY);
            setLevelRecords({});
            setDebugRevision((current) => current + 1);
          }}
          onForceNoMoves={() => setNoMovesOpen(true)}
          onCompleteSelected={() => {
            const level = getLevelById(selectedLevelId);
            const updatedRecords = {
              ...levelRecords,
              [level.id]: {
                completed: true,
                stars: Math.max(levelRecords[level.id]?.stars ?? 0, 2),
                bestScore: Math.max(levelRecords[level.id]?.bestScore ?? 0, 1500 + level.id * 25),
                bestTime: levelRecords[level.id]?.bestTime ? Math.min(levelRecords[level.id].bestTime, level.starTargets.twoStarTime) : level.starTargets.twoStarTime,
                fewestMoves: levelRecords[level.id]?.fewestMoves ? Math.min(levelRecords[level.id].fewestMoves, level.starTargets.idealMoves + 4) : level.starTargets.idealMoves + 4,
                noHintsClear: levelRecords[level.id]?.noHintsClear ?? true,
                noShufflesClear: levelRecords[level.id]?.noShufflesClear ?? true,
                noUndoClear: levelRecords[level.id]?.noUndoClear ?? true,
              },
            };
            setLevelRecords(updatedRecords);
            saveLevelRecords(updatedRecords);
            const nextUnlock = Math.min(Math.max(unlockedLevel, level.id + 1), LEVELS.length);
            setUnlockedLevel(nextUnlock);
            window.localStorage.setItem(STORAGE_KEY, String(nextUnlock));
            const updatedAchievements = mergeAchievements(achievements, computeRecordAchievements(updatedRecords));
            setAchievements(updatedAchievements);
            saveAchievements(updatedAchievements);
            setDebugRevision((current) => current + 1);
          }}
          onGiveSelectedThreeStars={() => {
            const level = getLevelById(selectedLevelId);
            const updatedRecords = {
              ...levelRecords,
              [level.id]: {
                completed: true,
                stars: 3,
                bestScore: Math.max(levelRecords[level.id]?.bestScore ?? 0, 2500 + level.id * 50),
                bestTime: levelRecords[level.id]?.bestTime ? Math.min(levelRecords[level.id].bestTime, level.starTargets.threeStarTime) : level.starTargets.threeStarTime,
                fewestMoves: levelRecords[level.id]?.fewestMoves ? Math.min(levelRecords[level.id].fewestMoves, level.starTargets.idealMoves) : level.starTargets.idealMoves,
                noHintsClear: true,
                noShufflesClear: true,
                noUndoClear: true,
              },
            };
            setLevelRecords(updatedRecords);
            saveLevelRecords(updatedRecords);
            const nextUnlock = Math.min(Math.max(unlockedLevel, level.id + 1), LEVELS.length);
            setUnlockedLevel(nextUnlock);
            window.localStorage.setItem(STORAGE_KEY, String(nextUnlock));
            const updatedAchievements = mergeAchievements(achievements, computeRecordAchievements(updatedRecords), ['three-star-worker']);
            setAchievements(updatedAchievements);
            saveAchievements(updatedAchievements);
            setDebugRevision((current) => current + 1);
          }}
          onTestWinModal={() => {
            startLevel(selectedLevelId, true);
            window.setTimeout(() => {
              const level = getLevelById(selectedLevelId);
              setWinnerStats({
                time: level.starTargets.threeStarTime,
                moves: level.starTargets.idealMoves,
                score: 2400,
                bonus: 500,
                stars: 3,
                hintsUsed: 0,
                shufflesUsed: 0,
                undosUsed: 0,
                bestScore: 2400,
                bestTime: level.starTargets.threeStarTime,
                bestMoves: level.starTargets.idealMoves,
                bestStars: 3,
                newBestScore: true,
                newBestTime: true,
                newFewestMoves: true,
                nextUnlocked: false,
                saveVerified: true,
              });
            }, 50);
          }}
          onTestAchievements={() => {
            const allAchievements = ACHIEVEMENTS.map((achievement) => achievement.key);
            const newAchievementKeys = allAchievements.filter((key) => !achievements.includes(key));
            setAchievements(allAchievements);
            saveAchievements(allAchievements);
            showAchievementToast(newAchievementKeys);
            setDebugRevision((current) => current + 1);
          }}
          onResetDailyData={() => {
            window.localStorage.removeItem(DAILY_RECORDS_STORAGE_KEY);
            setDailyRecords({});
            setDebugRevision((current) => current + 1);
          }}
          onCompleteDailyJob={() => {
            const todayKey = getTodayKey();
            const updated = {
              ...dailyRecords,
              [todayKey]: { date: todayKey, completed: true, stars: 3, bestScore: 2800, bestTime: 120, fewestMoves: 18 },
            };
            setDailyRecords(updated);
            saveDailyRecords(updated);
            setDebugRevision((current) => current + 1);
          }}
          onSimulateDailyStreak={() => {
            const updated = { ...dailyRecords };
            [0, -1, -2].forEach((offset, index) => {
              const dateKey = offsetDateKey(offset);
              updated[dateKey] = { date: dateKey, completed: true, stars: 3 - Math.min(index, 1), bestScore: 2200 - index * 100, bestTime: 130 + index * 20, fewestMoves: 20 + index };
            });
            setDailyRecords(updated);
            saveDailyRecords(updated);
            setDebugRevision((current) => current + 1);
          }}
          onResetQuickRecords={() => {
            window.localStorage.removeItem(QUICK_STATS_STORAGE_KEY);
            setQuickStats({ completed: 0, bestScore: 0, fastestTime: 0, fewestMoves: 0 });
            setDebugRevision((current) => current + 1);
          }}
          onStartSmallQuick={() => startQuickPlay('small')}
          onStartMediumQuick={() => startQuickPlay('medium')}
          onStartBigQuick={() => startQuickPlay('big')}
          onCopyReport={() => {
            const report = createDebugReport(levelRecords, totalStats, achievements, selectedLevelId, unlockedLevel, dailyRecords, quickStats, gameMode, currentLevel.name);
            navigator.clipboard?.writeText(report);
            setDebugRevision((current) => current + 1);
          }}
        />
      )}
    </main>
  );
}


type DebugPanelProps = {
  appVersion: string;
  revision: number;
  onUnlockAll: () => void;
  onResetProgress: () => void;
  onResetTutorial: () => void;
  onClearRecords: () => void;
  onForceNoMoves: () => void;
  onCompleteSelected: () => void;
  onGiveSelectedThreeStars: () => void;
  onTestWinModal: () => void;
  onTestAchievements: () => void;
  onResetDailyData: () => void;
  onCompleteDailyJob: () => void;
  onSimulateDailyStreak: () => void;
  onResetQuickRecords: () => void;
  onStartSmallQuick: () => void;
  onStartMediumQuick: () => void;
  onStartBigQuick: () => void;
  onCopyReport: () => void;
};

function DebugPanel({ appVersion, revision, onUnlockAll, onResetProgress, onResetTutorial, onClearRecords, onForceNoMoves, onCompleteSelected, onGiveSelectedThreeStars, onTestWinModal, onTestAchievements, onResetDailyData, onCompleteDailyJob, onSimulateDailyStreak, onResetQuickRecords, onStartSmallQuick, onStartMediumQuick, onStartBigQuick, onCopyReport }: DebugPanelProps) {
  const storageItems = getToolTileStorageSnapshot();

  return (
    <aside className="debug-panel" aria-label="Local beta testing tools">
      <div className="debug-header">
        <strong>Beta Debug Tools</strong>
        <small>v{appVersion} · refresh {revision}</small>
      </div>
      <div className="debug-actions">
        <button onClick={onUnlockAll} type="button">Unlock all</button>
        <button onClick={onResetProgress} type="button">Reset progress</button>
        <button onClick={onResetTutorial} type="button">Reset tutorial</button>
        <button onClick={onClearRecords} type="button">Clear records</button>
        <button onClick={onCompleteSelected} type="button">Complete selected</button>
        <button onClick={onGiveSelectedThreeStars} type="button">3★ selected</button>
        <button onClick={onForceNoMoves} type="button">Force no-moves</button>
        <button onClick={onTestWinModal} type="button">Test win modal</button>
        <button onClick={onTestAchievements} type="button">Test achievements</button>
        <button onClick={onResetDailyData} type="button">Reset daily</button>
        <button onClick={onCompleteDailyJob} type="button">Complete daily</button>
        <button onClick={onSimulateDailyStreak} type="button">3-day streak</button>
        <button onClick={onResetQuickRecords} type="button">Reset quick</button>
        <button onClick={onStartSmallQuick} type="button">Small quick</button>
        <button onClick={onStartMediumQuick} type="button">Medium quick</button>
        <button onClick={onStartBigQuick} type="button">Big quick</button>
        <button onClick={onCopyReport} type="button">Copy report</button>
      </div>
      <details>
        <summary>Saved localStorage keys</summary>
        {storageItems.length === 0 ? (
          <p>No Tool Tile Match keys saved yet.</p>
        ) : (
          <ul>
            {storageItems.map(([key, value]) => (
              <li key={key}><b>{key}</b><code>{value}</code></li>
            ))}
          </ul>
        )}
      </details>
    </aside>
  );
}


function BrandMark({ compact = false, className = '', alt = 'Tool Tile Match app icon' }: { compact?: boolean; className?: string; alt?: string }) {
  return (
    <div className={classNames('brand-mark', compact && 'compact', className)}>
      <img src={BRAND_ICON_SRC} alt={alt} />
    </div>
  );
}

function LoadingScreen() {
  return (
    <section className="loading-screen" aria-label="Loading Tool Tile Match">
      <div className="loading-card">
        <div className="loading-portrait">
          <BrandMark className="loading-mark" />
        </div>
        <p className="eyebrow">Tool Tile Match</p>
        <h1>Loading jobsite...</h1>
        <small>Getting tools, tiles, and job cards ready.</small>
        <div className="loader-track" aria-hidden="true"><span /></div>
        <p className="loading-tip">Tip: free tiles have one open side and nothing stacked on top.</p>
      </div>
    </section>
  );
}

type SettingsModalProps = {
  panel: SettingsPanel;
  soundOn: boolean;
  appVersion: string;
  statsSummary: StatsSummary;
  levelRecords: LevelRecords;
  achievements: AchievementKey[];
  dailyRecords: DailyRecords;
  quickStats: QuickPlayStats;
  vibrationOn: boolean;
  onSetPanel: (panel: SettingsPanel) => void;
  onToggleSound: () => void;
  onToggleVibration: () => void;
  onReplayTutorial: () => void;
  onResetProgress: () => void;
  onClose: () => void;
};

function SettingsModal({ panel, soundOn, appVersion, statsSummary, levelRecords, achievements, dailyRecords, quickStats, vibrationOn, onSetPanel, onToggleSound, onToggleVibration, onReplayTutorial, onResetProgress, onClose }: SettingsModalProps) {
  return (
    <div className="modal-backdrop settings-backdrop">
      <section className="modal-card settings-modal">
        <div className="settings-header">
          <div>
            <p className="eyebrow">Tool Tile Match</p>
            <h2>{panel === 'main' ? 'Settings' : panel === 'how' ? 'How to Play' : panel === 'stats' ? 'Stats' : panel === 'feedback' ? 'Beta Feedback' : panel === 'about' ? 'About' : 'Reset Progress'}</h2>
          </div>
          <button className="settings-close" onClick={onClose} type="button" aria-label="Close settings">
            <X size={20} />
          </button>
        </div>

        {panel === 'main' && (
          <div className="settings-list">
            <button className="settings-row" onClick={onToggleSound} type="button">
              <span className="settings-row-icon">{soundOn ? <Volume2 size={20} /> : <VolumeX size={20} />}</span>
              <span><strong>Sound</strong><small>{soundOn ? 'Sound effects are on' : 'Sound effects are off'}</small></span>
              <b>{soundOn ? 'On' : 'Off'}</b>
            </button>
            <button className="settings-row" onClick={onToggleVibration} type="button">
              <span className="settings-row-icon"><Smartphone size={20} /></span>
              <span><strong>Vibration</strong><small>{vibrationOn ? 'Phone vibration feedback is on' : 'Phone vibration feedback is off'}</small></span>
              <b>{vibrationOn ? 'On' : 'Off'}</b>
            </button>
            <button className="settings-row" onClick={() => onSetPanel('how')} type="button">
              <span className="settings-row-icon"><HelpCircle size={20} /></span>
              <span><strong>How to Play</strong><small>Controls, free tiles, stars, and scoring</small></span>
            </button>
            <button className="settings-row" onClick={() => onSetPanel('stats')} type="button">
              <span className="settings-row-icon"><Trophy size={20} /></span>
              <span><strong>Stats / Progress</strong><small>Jobs, stars, records, and achievements</small></span>
            </button>
            <button className="settings-row" onClick={() => onSetPanel('feedback')} type="button">
              <span className="settings-row-icon"><Target size={20} /></span>
              <span><strong>Beta Feedback</strong><small>What testers should check before this goes public</small></span>
            </button>
            <button className="settings-row" onClick={() => onSetPanel('about')} type="button">
              <span className="settings-row-icon"><Info size={20} /></span>
              <span><strong>About / Credits</strong><small>Version, artwork, PWA, and beta status</small></span>
            </button>
            <button className="settings-row danger-row" onClick={() => onSetPanel('reset')} type="button">
              <span className="settings-row-icon"><Trash2 size={20} /></span>
              <span><strong>Reset Progress</strong><small>Clear unlocked jobs, stars, and records</small></span>
            </button>
          </div>
        )}

        {panel === 'how' && (
          <div className="help-panel">
            <div className="help-card"><CheckCircle2 size={19} /><span>Match two identical construction tool tiles.</span></div>
            <div className="help-card"><CheckCircle2 size={19} /><span>Tap one free tile, then tap its matching free tile.</span></div>
            <div className="help-card"><CheckCircle2 size={19} /><span>You can also drag a free tile onto its matching tile.</span></div>
            <div className="help-card"><CheckCircle2 size={19} /><span>A free tile has no tile on top and at least one open left or right side.</span></div>
            <div className="help-card"><CheckCircle2 size={19} /><span>Clear the board to complete the job and unlock the next level.</span></div>
            <div className="help-card"><Star size={19} /><span>Stars are based on time, moves, hints, shuffles, and undo use.</span></div>
            <button className="primary-action settings-back-button" onClick={onReplayTutorial} type="button">Replay Level 1 Tutorial</button>
            <button className="secondary-action settings-back-button" onClick={() => onSetPanel('main')} type="button">Back to Settings</button>
          </div>
        )}

        {panel === 'stats' && (
          <div className="stats-panel">
            <section className="stats-section">
              <h3>Overall Progress</h3>
              <div className="stats-grid">
                <div><span>Jobs Complete</span><strong>{statsSummary.jobsCompleted}/{LEVELS.length}</strong></div>
                <div><span>Stars Earned</span><strong>{statsSummary.totalStars}/{statsSummary.totalPossibleStars}</strong></div>
                <div><span>Achievements</span><strong>{statsSummary.achievementsUnlocked}/{ACHIEVEMENTS.length}</strong></div>
              </div>
            </section>

            <section className="stats-section">
              <h3>Best Records</h3>
              <div className="stats-grid">
                <div><span>Best Score</span><strong>{statsSummary.bestScore.toLocaleString()}</strong></div>
                <div><span>Fastest Time</span><strong>{statsSummary.fastestTime ? formatTime(statsSummary.fastestTime) : 'None'}</strong></div>
                <div><span>Fewest Moves</span><strong>{statsSummary.fewestMoves || 'None'}</strong></div>
              </div>
            </section>

            <section className="stats-section">
              <h3>Tool Usage</h3>
              <div className="stats-grid">
                <div><span>Total Moves</span><strong>{statsSummary.totalMoves}</strong></div>
                <div><span>Hints</span><strong>{statsSummary.totalHints}</strong></div>
                <div><span>Shuffles</span><strong>{statsSummary.totalShuffles}</strong></div>
                <div><span>Undo Uses</span><strong>{statsSummary.totalUndos}</strong></div>
              </div>
            </section>

            <section className="stats-section">
              <h3>Daily Job</h3>
              <p className="stats-section-copy">Daily records are saved only on this device. Replaying today keeps the same date-seeded board.</p>
              <div className="stats-grid">
                <div><span>Daily Jobs</span><strong>{statsSummary.dailyJobsCompleted}</strong></div>
                <div><span>Current Streak</span><strong>{statsSummary.currentDailyStreak}</strong></div>
                <div><span>Best Streak</span><strong>{statsSummary.bestDailyStreak}</strong></div>
                <div><span>Today</span><strong>{dailyRecords[getTodayKey()]?.completed ? getStarText(dailyRecords[getTodayKey()].stars) : 'Open'}</strong></div>
              </div>
            </section>

            <section className="stats-section">
              <h3>Quick Play</h3>
              <p className="stats-section-copy">Quick Play does not unlock campaign jobs, but completed boards count toward overall stats and achievements.</p>
              <div className="stats-grid">
                <div><span>Quick Jobs</span><strong>{statsSummary.quickPlayCompleted}</strong></div>
                <div><span>Best Quick Score</span><strong>{statsSummary.bestQuickPlayScore.toLocaleString()}</strong></div>
                <div><span>Fastest Quick</span><strong>{statsSummary.fastestQuickPlayTime ? formatTime(statsSummary.fastestQuickPlayTime) : 'None'}</strong></div>
                <div><span>Fewest Quick Moves</span><strong>{quickStats.fewestMoves || 'None'}</strong></div>
              </div>
            </section>

            <section className="stats-section">
              <h3>Achievements</h3>
              <p className="stats-section-copy">{statsSummary.achievementsUnlocked} of {ACHIEVEMENTS.length} unlocked. Locked cards show what to chase next.</p>
              <div className="achievements-list achievement-card-grid">
                {ACHIEVEMENTS.map((achievement) => {
                  const unlocked = achievements.includes(achievement.key);
                  return (
                    <div className={classNames('achievement-row achievement-card', unlocked && 'unlocked-achievement')} key={achievement.key}>
                      <span>{unlocked ? <CheckCircle2 size={17} /> : <Lock size={17} />}</span>
                      <div><strong>{achievement.title}</strong><small>{unlocked ? achievement.description : `Locked: ${achievement.description}`}</small></div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="stats-section">
              <h3>Local Save Info</h3>
              <div className="save-info-list">
                <span>Records saved on this device only.</span>
                <span>Completed records: {Object.values(levelRecords).filter((record) => record.completed).length}</span>
                <span>Daily records: {Object.values(dailyRecords).filter((record) => record.completed).length}</span>
                <span>Quick completions: {quickStats.completed}</span>
                <span>Storage keys: {getToolTileStorageSnapshot().length}</span>
              </div>
            </section>
            <button className="secondary-action settings-back-button" onClick={() => onSetPanel('main')} type="button">Back to Settings</button>
          </div>
        )}

        {panel === 'feedback' && (
          <div className="feedback-panel">
            <p className="feedback-intro">Use these questions after a tester plays on an actual phone. Ask for a screenshot any time something looks cramped, confusing, or broken.</p>
            <div className="feedback-list">
              <div className="feedback-item"><CheckCircle2 size={18} /><span>What phone did you test on, and did the start screen fit without sideways scrolling?</span></div>
              <div className="feedback-item"><CheckCircle2 size={18} /><span>Were the tiles easy to read and tap on every level you tried?</span></div>
              <div className="feedback-item"><CheckCircle2 size={18} /><span>Did tap-to-match feel accurate, and did drag-to-match feel useful or unnecessary?</span></div>
              <div className="feedback-item"><CheckCircle2 size={18} /><span>Which level felt unfair, cramped, too easy, or too hard?</span></div>
              <div className="feedback-item"><CheckCircle2 size={18} /><span>Did the no-moves, win screen, stars, and next-job unlock make sense?</span></div>
              <div className="feedback-item"><CheckCircle2 size={18} /><span>Did the stronger construction artwork help the game, or did it make text/tiles harder to see?</span></div>
              <div className="feedback-item"><CheckCircle2 size={18} /><span>What was the first thing that felt unfinished or annoying?</span></div>
            </div>
            <div className="feedback-note">Phase 21 adds mobile-game presentation polish inspired by common Mahjong app patterns while keeping Tool Tile Match original, local-first, and construction themed.</div>
            <button className="secondary-action settings-back-button" onClick={() => onSetPanel('main')} type="button">Back to Settings</button>
          </div>
        )}

        {panel === 'about' && (
          <div className="about-panel">
            <div className="app-badge"><Smartphone size={24} /><div><strong>Beta Build {appVersion}</strong><small>Phase 21 Mobile Game Polish build.</small></div></div>
            <p>Tool Tile Match is a construction-themed Mahjong Solitaire puzzle game using custom tool art, local progress saves, star ratings, sounds, vibration, undo, and phone-first controls.</p>
            <p>This Phase 21 build keeps the game original while adding stronger mobile-game presentation patterns: better loading feel, streak lane, reward meters, and a more satisfying win celebration.</p>
            <div className="wrapper-prep-card"><strong>Future App Wrapper Prep</strong><small>Capacitor config, Android creation scripts, and wrapper check tools are now prepared. Generate the Android project folder locally only after npm install and npm run build pass on your computer.</small></div>
            <button className="secondary-action settings-back-button" onClick={() => onSetPanel('main')} type="button">Back to Settings</button>
          </div>
        )}

        {panel === 'reset' && (
          <div className="reset-panel">
            <AlertTriangle size={36} />
            <p>This will clear unlocked jobs, completed stars, best scores, best times, and fewest move records on this device.</p>
            <div className="modal-actions">
              <button className="primary-action danger-action" onClick={onResetProgress} type="button">Yes, Reset Progress</button>
              <button className="secondary-action" onClick={() => onSetPanel('main')} type="button">Cancel</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

type StartScreenProps = {
  selectedLevel: LevelDefinition;
  selectedLevelId: number;
  unlockedLevel: number;
  progressPercent: number;
  levelRecords: LevelRecords;
  statsSummary: StatsSummary;
  achievements: AchievementKey[];
  dailyRecords: DailyRecords;
  quickStats: QuickPlayStats;
  onStartDaily: () => void;
  onStartQuick: (size: QuickJobSize) => void;
  onOpenStats: () => void;
  onSelectLevel: (levelId: number) => void;
  onStart: () => void;
  onOpenSettings: () => void;
};

function StartScreen({
  selectedLevel,
  selectedLevelId,
  unlockedLevel,
  progressPercent,
  levelRecords,
  statsSummary,
  achievements,
  dailyRecords,
  quickStats,
  onStartDaily,
  onStartQuick,
  onOpenStats,
  onSelectLevel,
  onStart,
  onOpenSettings,
}: StartScreenProps) {
  const selectedDifficulty = DIFFICULTY_LABELS[selectedLevel.difficulty];
  const selectedRecord = levelRecords[selectedLevel.id];
  const groupedLevels = PACKS.map((pack) => {
    const levels = getLevelsByPack(pack.id);
    const summary = getPackSummary(pack.id, levelRecords);
    const open = levels.filter((level) => level.id <= unlockedLevel).length;
    return { ...pack, levels, open, summary };
  });
  const selectedBadges = getLevelReplayBadges(selectedRecord);
  const todayKey = getTodayKey();
  const todayDaily = dailyRecords[todayKey];
  const dailyProgress = getDailyProgress(dailyRecords);

  return (
    <section className="start-screen">
      <div className="hero-card start-card">
        <div className="start-content">
          <div className="start-top-row">
            <div className="brand-row">
              <BrandMark compact />
              <div>
                <p className="eyebrow">Construction Mahjong Solitaire</p>
                <span className="mini-label">Tap-to-match or drag-to-match</span>
              </div>
            </div>
            <button className="settings-button" onClick={onOpenSettings} type="button" aria-label="Open settings">
              <Settings size={19} />
            </button>
          </div>

          <h1>Tool Tile Match</h1>
          <p className="hero-copy">
            Clear each jobsite by matching tools, safety gear, and shop items. Finish a job to unlock the next board.
          </p>
          <span className="version-chip">Beta {APP_VERSION}</span>
          <div className="beta-ready-strip" aria-label="Beta readiness highlights">
            <span><CheckCircle2 size={14} /> 18 playable jobs</span>
            <span><CheckCircle2 size={14} /> Mobile controls</span>
            <span><CheckCircle2 size={14} /> Local saves</span>
            <span><CheckCircle2 size={14} /> App polish</span>
          </div>

          <div className="beta-release-card">
            <strong>Phase 21 mobile game polish build</strong>
            <small>Adds stronger loading, reward, streak, and mode-selection polish without copying another game's artwork or branding.</small>
          </div>

          <div className="qa-check-strip">
            <span>Build locally first</span>
            <span>Preview on phone</span>
            <span>Reward flow</span>
            <span>No Netlify needed</span>
          </div>

          <div className="mode-hub" aria-label="Choose how to play">
            <button className="mode-card continue-mode-card" onClick={onStart} type="button">
              <strong>Continue Job Map</strong>
              <small>Start Level {selectedLevel.id}: {selectedLevel.name}</small>
              <span>{unlockedLevel}/{LEVELS.length} jobs open</span>
            </button>
            <button className="mode-card daily-mode-card" onClick={onStartDaily} type="button">
              <strong>Daily Job</strong>
              <small>{getReadableDate(todayKey)} · {todayDaily?.completed ? `${getStarText(todayDaily.stars)} complete · best ${todayDaily.bestScore.toLocaleString()}` : 'New local daily board ready'}</small>
              <span>{todayDaily?.completed ? 'Completed today' : `${dailyProgress.currentStreak} day active streak`}</span>
              <div className="daily-streak-road" aria-label={`Daily streak ${dailyProgress.currentStreak} days`}>
                {Array.from({ length: 7 }, (_, index) => (
                  <i key={index} className={index < Math.min(dailyProgress.currentStreak, 7) ? 'done' : ''}>{index + 1}</i>
                ))}
                <b>Toolbox</b>
              </div>
            </button>
            <div className="mode-card quick-mode-card">
              <strong>Quick Play</strong>
              <small>{quickStats.completed} quick jobs complete · best {quickStats.bestScore.toLocaleString()}</small>
              <div className="quick-button-row">
                <button onClick={() => onStartQuick('small')} type="button">Small</button>
                <button onClick={() => onStartQuick('medium')} type="button">Medium</button>
                <button onClick={() => onStartQuick('big')} type="button">Big</button>
              </div>
            </div>
            <button className="mode-card stats-preview-card" onClick={onOpenStats} type="button">
              <strong>Stats / Progress</strong>
              <small>{statsSummary.jobsCompleted}/{LEVELS.length} campaign jobs · {statsSummary.totalStars}/{statsSummary.totalPossibleStars} stars</small>
              <span>{achievements.length}/{ACHIEVEMENTS.length} achievements</span>
            </button>
          </div>

          <div className="mini-tool-row" aria-hidden="true">
            {TOOL_TYPES.slice(0, 5).map((tool) => (
              <span className="mini-tool" key={tool.key}>
                <img src={tool.iconSrc} alt="" />
              </span>
            ))}
          </div>

          <div className="progress-card">
            <div>
              <span>Progress</span>
              <strong>{unlockedLevel} of {LEVELS.length} jobs unlocked</strong>
            </div>
            <div className="progress-track" aria-hidden="true">
              <i style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          <div className="selected-job-card">
            <div>
              <span className="job-label">Selected Job</span>
              <h3>Level {selectedLevel.id}: {selectedLevel.name}</h3>
              <p>{selectedLevel.subtitle}</p>
              <div className="goal-chip"><Target size={14} /> {selectedLevel.goal}</div>
            </div>
            <div className="job-meta">
              <strong>{selectedDifficulty.name}</strong>
              <small>{selectedLevel.positions.length} tiles · {selectedLevel.boardTheme}</small>
              <small>3★ target: {formatTime(selectedLevel.starTargets.threeStarTime)} · {selectedLevel.starTargets.idealMoves} moves</small>
              {selectedRecord?.completed && (
                <>
                  <span className="record-pill">{getStarText(selectedRecord.stars)} · Best {selectedRecord.bestScore.toLocaleString()} · {formatTime(selectedRecord.bestTime)} · {selectedRecord.fewestMoves} moves</span>
                  <div className="record-badges">
                    {selectedBadges.map((badge) => <span key={badge}>{badge}</span>)}
                  </div>
                  {selectedRecord.stars < 3 && <small className="replay-prompt">Replay this job to chase a cleaner 3-star record.</small>}
                </>
              )}
            </div>
          </div>

          <div className="toolbox-progress-panel" aria-label="Toolbox reward progress">
            <div>
              <strong>Reward toolbox</strong>
              <small>Clear jobs to fill the toolbox meter and chase cleaner runs.</small>
            </div>
            <div className="toolbox-meter"><i style={{ width: `${Math.min(100, (unlockedLevel / LEVELS.length) * 100)}%` }} /></div>
            <span>{unlockedLevel}/{LEVELS.length} jobs open</span>
          </div>

          <button className="primary-action start-action" onClick={onStart} type="button">
            <Play size={18} /> Start Level {selectedLevel.id}
          </button>

          <div className="level-section-heading">
            <span><MapPinned size={16} /> Job List</span>
            <small>{PACKS.find((pack) => pack.id === selectedLevel.pack)?.description}</small>
          </div>

          <div className="level-groups" aria-label="Choose level">
            {groupedLevels.map((group) => (
              <section className="level-group" key={group.id}>
                <div className="level-group-title">
                  <span>{group.name}</span>
                  <small>{group.open}/{group.levels.length} open · {group.summary.completed} done · {group.summary.stars}/{group.summary.possibleStars}★</small>
                </div>
                <div className="level-grid">
                  {group.levels.map((level) => {
                    const locked = level.id > unlockedLevel;
                    const active = selectedLevelId === level.id;
                    const record = levelRecords[level.id];
                    return (
                      <button
                        key={level.id}
                        className={classNames('level-card', active && 'active', locked && 'locked-level', record?.completed && 'completed-level')}
                        onClick={() => onSelectLevel(level.id)}
                        disabled={locked}
                        type="button"
                      >
                        <span className="level-number">{locked ? <Lock size={14} /> : record?.completed ? <CheckCircle2 size={16} /> : level.id}</span>
                        <span className="level-name">{level.name}</span>
                        <small>{record?.completed ? `${getStarText(record.stars)} · ${record.bestScore.toLocaleString()} · ${formatTime(record.bestTime)}` : getDifficultyName(level.difficulty)}</small>
                        {record?.completed && (
                          <span className="level-card-badges">
                            {getLevelReplayBadges(record).slice(1, 4).map((badge) => <b key={badge}>{badge}</b>)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

type GameHeaderProps = {
  level: LevelDefinition;
  gameMode: GameMode;
  quickJobSize: QuickJobSize;
  score: number;
  moves: number;
  elapsed: number;
  remainingTiles: number;
  soundOn: boolean;
  onToggleSound: () => void;
  onBackToStart: () => void;
};

function GameHeader({
  level,
  gameMode,
  quickJobSize,
  score,
  moves,
  elapsed,
  remainingTiles,
  soundOn,
  onToggleSound,
  onBackToStart,
}: GameHeaderProps) {
  const modeLabel = getModeLabel(gameMode, quickJobSize);

  return (
    <header className="game-header">
      <div className="title-block">
        <button className="ghost-link" onClick={onBackToStart} type="button">Jobs</button>
        <div>
          <p className="eyebrow">{gameMode === 'level' ? `Level ${level.id}` : modeLabel} · {getDifficultyName(level.difficulty)}</p>
          <h2>{level.name}</h2>
        </div>
      </div>

      <div className="stat-grid">
        <Stat label="Score" value={score.toLocaleString()} />
        <Stat label="Time" value={formatTime(elapsed)} />
        <Stat label="Moves" value={moves.toString()} />
        <Stat label="Left" value={remainingTiles.toString()} />
      </div>

      <button className="icon-toggle" onClick={onToggleSound} type="button" aria-label="Toggle sound">
        {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
      </button>
    </header>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

type GameBoardProps = {
  tiles: TileData[];
  level: LevelDefinition;
  selectedIds: string[];
  hintIds: string[];
  invalidId: string | null;
  removingIds: string[];
  dragOriginId: string | null;
  dragging: boolean;
  sparkleIds: string[];
  availablePairsCount: number;
  clearPercent: number;
  selectedTileLabel?: string;
  onTileClick: (tile: TileData) => void;
  onTilePointerDown: (tile: TileData, event: ReactPointerEvent<HTMLButtonElement>) => void;
  onBoardPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onBoardPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
};

function GameBoard({
  tiles,
  level,
  selectedIds,
  hintIds,
  invalidId,
  removingIds,
  dragOriginId,
  dragging,
  sparkleIds,
  availablePairsCount,
  clearPercent,
  selectedTileLabel,
  onTileClick,
  onTilePointerDown,
  onBoardPointerMove,
  onBoardPointerUp,
}: GameBoardProps) {
  const boardStyle = {
    '--cols': level.cols,
    '--rows': level.rows,
  } as CSSProperties;

  return (
    <section className={classNames('board-wrap', `level-${level.id}`, dragging && 'dragging-board')}>
      <div className="board-title-row">
        <div>
          <span>{level.boardTheme}</span>
          <strong>{level.positions.length} tiles</strong>
        </div>
        <small>{selectedTileLabel ? `Selected: ${selectedTileLabel}. Tap or drag to a matching free tile.` : level.goal}</small>
      </div>
      <div className="board-beta-strip" aria-label="Board status">
        <span className={availablePairsCount === 0 ? 'no-pairs' : undefined}>{availablePairsCount === 0 ? 'No free pairs' : `${availablePairsCount} free pair${availablePairsCount === 1 ? '' : 's'} available`}</span>
        <span>{clearPercent}% cleared</span>
        <span>3★ target {formatTime(level.starTargets.threeStarTime)} / {level.starTargets.idealMoves} moves</span>
      </div>
      <div className="board-scroll" onPointerMove={onBoardPointerMove} onPointerUp={onBoardPointerUp} onPointerCancel={onBoardPointerUp}>
        <div className="workbench-frame" aria-hidden="true">
          {Array.from({ length: 10 }, (_, index) => <i key={index} />)}
        </div>
        <div className="board" style={boardStyle}>
          {tiles
            .slice()
            .sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x)
            .map((tile) => {
              const free = isTileFree(tile, tiles);
              return (
                <Tile
                  key={tile.id}
                  tile={tile}
                  free={free}
                  selected={selectedIds.includes(tile.id)}
                  hinted={hintIds.includes(tile.id)}
                  invalid={invalidId === tile.id}
                  removing={removingIds.includes(tile.id)}
                  dragOrigin={dragOriginId === tile.id}
                  sparkling={sparkleIds.includes(tile.id)}
                  onClick={() => onTileClick(tile)}
                  onPointerDown={(event) => onTilePointerDown(tile, event)}
                />
              );
            })}
        </div>
      </div>
    </section>
  );
}

type TileProps = {
  tile: TileData;
  free: boolean;
  selected: boolean;
  hinted: boolean;
  invalid: boolean;
  removing: boolean;
  dragOrigin: boolean;
  sparkling: boolean;
  onClick: () => void;
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
};

function Tile({ tile, free, selected, hinted, invalid, removing, dragOrigin, sparkling, onClick, onPointerDown }: TileProps) {
  if (tile.matched) return null;

  const style = {
    '--x': tile.x,
    '--y': tile.y,
    '--z': tile.z,
  } as CSSProperties;

  return (
    <button
      className={classNames(
        'tile',
        free ? 'free' : 'locked',
        selected && 'selected',
        hinted && 'hinted',
        invalid && 'invalid',
        removing && 'removing',
        dragOrigin && 'drag-origin',
        sparkling && 'sparkling',
      )}
      style={style}
      onPointerDown={onPointerDown}
      onClick={onClick}
      data-tile-id={tile.id}
      type="button"
      aria-label={`${tile.label} tile ${free ? 'free' : 'blocked'}`}
    >
      <span className="tile-bolt top-left" />
      <span className="tile-bolt top-right" />
      <img className="tile-icon" src={tile.iconSrc} alt="" aria-hidden="true" draggable="false" />
      <span className="tile-label">{tile.label}</span>
    </button>
  );
}

function GameControls({
  onHint,
  onShuffle,
  onUndo,
  onRestart,
  canHint,
  canShuffle,
  canUndo,
  hintsUsed,
  shufflesUsed,
  undosUsed,
}: {
  onHint: () => void;
  onShuffle: () => void;
  onUndo: () => void;
  onRestart: () => void;
  canHint: boolean;
  canShuffle: boolean;
  canUndo: boolean;
  hintsUsed: number;
  shufflesUsed: number;
  undosUsed: number;
}) {
  return (
    <div className="controls" aria-label="Game controls">
      <button onClick={onHint} type="button" disabled={!canHint} aria-label="Show a free matching pair for a 25 point penalty">
        <Lightbulb size={18} /> Hint <span>-25 · {hintsUsed}</span>
      </button>
      <button onClick={onShuffle} type="button" disabled={!canShuffle} aria-label="Shuffle remaining tools for a 50 point penalty">
        <Shuffle size={18} /> Shuffle <span>-50 · {shufflesUsed}</span>
      </button>
      <button onClick={onUndo} type="button" disabled={!canUndo} aria-label="Undo the last match for a 75 point penalty">
        <Undo2 size={18} /> Undo <span>-75 · {undosUsed}</span>
      </button>
      <button onClick={onRestart} type="button"><RotateCcw size={18} /> Restart</button>
    </div>
  );
}

type WinModalProps = {
  stats: GameStats;
  level: LevelDefinition;
  gameMode: GameMode;
  quickJobSize: QuickJobSize;
  dailyProgress: ReturnType<typeof getDailyProgress>;
  dailyDate: string;
  isLastLevel: boolean;
  onPlayAgain: () => void;
  onNextLevel: () => void;
  onJobMap: () => void;
};

function WinModal({ stats, level, gameMode, quickJobSize, dailyProgress, dailyDate, isLastLevel, onPlayAgain, onNextLevel, onJobMap }: WinModalProps) {
  const title = getModeWinTitle(gameMode, isLastLevel);
  const stampText = getModeStampText(gameMode, isLastLevel);
  const modeLabel = getModeLabel(gameMode, quickJobSize);
  const isDaily = gameMode === 'daily';
  const isQuick = gameMode === 'quick';
  return (
    <div className="modal-backdrop">
      <section className="modal-card win-card">
        <div className="win-spotlight" aria-hidden="true" />
        <div className="win-hero-celebration">
          <div className="win-tool-emblem"><BrandMark compact /><span>★</span></div>
          <strong>{stats.stars >= 3 ? 'Foreman Approved!' : stats.stars === 2 ? 'Great Job!' : 'Job Cleared!'}</strong>
          <small>Score</small>
          <b>{stats.score.toLocaleString()}</b>
        </div>
        <p className="eyebrow">{gameMode === 'level' ? `Level ${level.id}` : modeLabel}: {isDaily ? dailyDate : level.name}</p>
        <h2>{title}</h2>
        <div className="job-stamp">{stampText}</div>
        {stats.nextUnlocked && gameMode === 'level' && level.id > 0 && !isLastLevel && <div className="unlock-banner"><Sparkles size={16} /> Next job unlocked</div>}
        <p className="win-beta-note">{getWinMessage(stats)}</p>
        <p className="beta-result-note">Phase 21 check: verify the reward flow feels exciting without making the screen cluttered or hard to read.</p>
        <div className="star-row" aria-label={`${stats.stars} stars earned`}>
          {[1, 2, 3].map((star) => (
            <Star key={star} size={30} fill={star <= stats.stars ? 'currentColor' : 'none'} />
          ))}
        </div>
        <div className="run-badges">
          <span>Completed</span>
          {stats.stars >= 3 && <span>3★ clear</span>}
          {stats.hintsUsed === 0 && <span>No hints used</span>}
          {stats.shufflesUsed === 0 && <span>No shuffles used</span>}
          {stats.undosUsed === 0 && <span>No undo used</span>}
        </div>
        {stats.stars < 3 && <p className="replay-nudge">Replay goal: beat the 3★ target time, reduce moves, and avoid help tools to perfect this job.</p>}
        {(stats.newBestScore || stats.newBestTime || stats.newFewestMoves) && (
          <div className="new-best-row">
            {stats.newBestScore && <span>{isDaily ? 'New Daily Best Score' : isQuick ? 'New Quick Play Best Score' : 'New Best Score'}</span>}
            {stats.newBestTime && <span>{isDaily ? 'New Daily Best Time' : isQuick ? 'New Quick Play Best Time' : 'New Best Time'}</span>}
            {stats.newFewestMoves && <span>{isDaily ? 'New Daily Fewest Moves' : isQuick ? 'New Quick Fewest Moves' : 'Fewest Moves'}</span>}
          </div>
        )}
        {isDaily && (
          <div className="mode-result-card">
            <strong>Daily record</strong>
            <span>{dailyDate} · Current streak {dailyProgress.currentStreak} · Best streak {dailyProgress.bestStreak}</span>
          </div>
        )}
        {isQuick && (
          <div className="mode-result-card">
            <strong>Quick Play record</strong>
            <span>{modeLabel} · Best {stats.bestScore.toLocaleString()} · Fastest {formatTime(stats.bestTime)}</span>
          </div>
        )}
        <div className="modal-stats">
          <Stat label="Time" value={formatTime(stats.time)} />
          <Stat label="Moves" value={stats.moves.toString()} />
          <Stat label="Score" value={stats.score.toLocaleString()} />
          <Stat label="Bonus" value={`+${stats.bonus}`} />
          <Stat label="Hints" value={stats.hintsUsed.toString()} />
          <Stat label="Shuffles" value={stats.shufflesUsed.toString()} />
          <Stat label="Undos" value={stats.undosUsed.toString()} />
          <Stat label="Best" value={stats.bestScore.toLocaleString()} />
        </div>
        <div className="record-summary">
          <span>Best stars: {getStarText(stats.bestStars)}</span>
          <span>Best time: {formatTime(stats.bestTime)}</span>
          <span>Fewest moves: {stats.bestMoves}</span>
          <span>{stats.saveVerified ? 'Local save updated' : 'Save pending check'}</span>
        </div>
        {gameMode === 'level' && level.id > 0 && (
          <div className="post-win-toolbox-meter" aria-label="Next toolbox reward progress">
            <span>{level.id >= 10 ? 'Journeyman toolbox active' : 'Unlock toolbox at Level 10'}</span>
            <div><i style={{ width: `${Math.min(100, (level.id / 10) * 100)}%` }} /></div>
            <b>▣</b>
          </div>
        )}
        <div className="modal-actions horizontal-actions">
          {!isLastLevel && (
            <button className="primary-action" onClick={onNextLevel} type="button">
              <ChevronsRight size={18} /> {gameMode === 'level' ? 'Next Job' : 'Job Map'}
            </button>
          )}
          <button className={isLastLevel ? 'primary-action' : 'secondary-action'} onClick={onPlayAgain} type="button">
            <TimerReset size={18} /> {isDaily ? 'Replay Daily' : isQuick ? 'Replay Quick' : 'Replay Job'}
          </button>
          <button className="secondary-action map-action" onClick={onJobMap} type="button">
            <MapPinned size={18} /> Job Map
          </button>
        </div>
      </section>
    </div>
  );
}


function AchievementToast({ achievement, onClose }: { achievement: AchievementToastData; onClose: () => void }) {
  return (
    <aside className="achievement-toast" role="status" aria-live="polite">
      <button type="button" onClick={onClose} aria-label="Close achievement notification"><X size={14} /></button>
      <Sparkles size={22} />
      <div>
        <span>Achievement unlocked</span>
        <strong>{achievement.title}</strong>
        <small>{achievement.description}</small>
      </div>
    </aside>
  );
}

function PackCompletionModal({ pack, onClose, onJobMap }: { pack: PackCompletionData; onClose: () => void; onJobMap: () => void }) {
  return (
    <div className="modal-backdrop pack-completion-backdrop">
      <section className="modal-card pack-completion-card">
        <div className="modal-icon"><Trophy size={36} /></div>
        <p className="eyebrow">Pack Complete</p>
        <h2>{pack.packName}</h2>
        <p className="modal-copy">
          {pack.isFinalPack
            ? 'Journeyman Shop is complete. This is the current end of the local build, so replay jobs to chase perfect stars and cleaner records.'
            : 'Apprentice Yard is complete. Journeyman Shop is now open, and you can replay earlier jobs for better stars.'}
        </p>
        <div className="modal-stats">
          <Stat label="Levels" value={`${pack.completed}/${pack.total}`} />
          <Stat label="Stars" value={`${pack.stars}/${pack.possibleStars}`} />
          <Stat label="Best Score" value={pack.bestScore.toLocaleString()} />
          <Stat label="Fastest" value={pack.fastestTime ? formatTime(pack.fastestTime) : 'None'} />
        </div>
        <div className="modal-actions horizontal-actions">
          <button className="primary-action" onClick={onClose} type="button"><ChevronsRight size={18} /> Keep Playing</button>
          <button className="secondary-action" onClick={onJobMap} type="button"><MapPinned size={18} /> Job Map</button>
        </div>
      </section>
    </div>
  );
}


function TutorialModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop tutorial-backdrop">
      <section className="modal-card tutorial-modal">
        <div className="modal-icon"><Hammer size={34} /></div>
        <p className="eyebrow">Quick Training</p>
        <h2>How Level 1 Works</h2>
        <div className="tutorial-steps">
          <div><b>1</b><span>Tap one free tile. Free tiles have no tile stacked on top and at least one open side.</span></div>
          <div><b>2</b><span>Tap its matching free tile, or drag the first tile onto the matching tile.</span></div>
          <div><b>3</b><span>If the pair matches, both tiles clear from the workbench.</span></div>
          <div><b>4</b><span>Clear all tiles to complete the job and unlock the next level.</span></div>
        </div>
        <button className="primary-action settings-back-button" onClick={onClose} type="button">Start Playing</button>
      </section>
    </div>
  );
}

function NoMovesModal({ onShuffle, onRestart, onClose }: { onShuffle: () => void; onRestart: () => void; onClose: () => void }) {
  return (
    <div className="modal-backdrop">
      <section className="modal-card">
        <div className="modal-icon warning"><AlertTriangle size={34} /></div>
        <p className="eyebrow">No Matches Left</p>
        <h2>The board is locked up</h2>
        <p className="modal-copy">
          There are no free matching pairs left. Shuffle the remaining tools for a score and star-rating penalty, or restart this job. If this happens often on the same level, mark it in beta feedback.
        </p>
        <div className="modal-actions">
          <button className="primary-action" onClick={onShuffle} type="button"><Shuffle size={18} /> Shuffle Board -50</button>
          <button className="secondary-action" onClick={onRestart} type="button"><RotateCcw size={18} /> Restart</button>
          <button className="ghost-link wide" onClick={onClose} type="button">Keep Looking</button>
        </div>
      </section>
    </div>
  );
}

export default App;
