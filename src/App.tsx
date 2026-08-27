import { useState, useMemo, useCallback, useEffect } from 'react'

type Screen =
  | 'home'
  | 'word-game'
  | 'word-reflection'
  | 'board'
  | 'board-calendar'
  | 'board-future'
  | 'add-entry'
  | 'thanks'
  | 'thanks-gratitude'
  | 'thanks-quality-a'
  | 'thanks-quality-b'

type CardPhase = 'down' | 'mid' | 'up'
type Tier = 'small' | 'medium' | 'big'
type TileStatus = 'correct' | 'present' | 'absent' | 'empty' | 'active'

interface Entry {
  id: string
  text: string
  date: string
  dateKey: string
  tier: Tier
  favorited: boolean
  word?: string
}

interface FutureEntry {
  id: string
  text: string
  tier: Tier
  fromGoals?: boolean
  movedToWins?: boolean
}

const WORD_POOL: { word: string; question: string }[] = [
  { word: 'PROUD', question: 'Think of a recent time where you felt proud of yourself.' },
  { word: 'BRAVE', question: "Think of something you've done recently that showed bravery." },
  { word: 'SHIFT', question: 'Think of a time you had to shift your approach to get through a challenge.' },
]
const MAX_GUESSES = 6

const KEYBOARD_ROWS: string[][] = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['ENTER','Z','X','C','V','B','N','M','⌫'],
]

const QUALITY_POOL = [
  'Kind','Funny','Creative','Brave','Caring','Determined','Curious','Thoughtful',
  'Confident','Supportive','Patient','Hardworking','Driven','Loyal','Friendly',
  'Independent','Real','Helpful','Open-minded','Outgoing','Easygoing','Reliable',
  'Strong','Positive','Honest','Adventurous','Focused','Understanding','Unique','Good listener',
]

function shuffleArr<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const WORD_IDEAS = [
  "Spoke up when I normally wouldn't",
  'Tried something new',
  'Asked someone for help',
  'Did something even though I was nervous',
  'Stuck with something that was difficult',
]

const TIER_CONFIG: Record<Tier, {
  label: string
  color: string
  bg: string
  border: string
  tag: string
  tagText: string
  desc: string
  prompt: string
  placeholder: string
  ideas: string[]
}> = {
  small: {
    label: 'Small Win',
    color: '#3DA89A',
    bg: '#EEF9F7',
    border: '#B2E8E0',
    tag: '#D0F3EE',
    tagText: '#3DA89A',
    desc: 'The everyday things that might not seem huge, but still matter.',
    prompt: "What's a small win you've had recently?",
    placeholder: "What'd you get done?",
    ideas: [
      "Finished something I'd been putting off",
      'Asked for help',
      'Helped someone out',
      "Went to practice even though I didn't feel like it",
      'Cleaned or organized something',
      "Spoke up when I normally wouldn't",
    ],
  },
  medium: {
    label: 'Medium Win',
    color: '#B08800',
    bg: '#FFF9E6',
    border: '#FFE59A',
    tag: '#FFF3C4',
    tagText: '#B08800',
    desc: 'Things that took some effort or that you might forget to give yourself credit for.',
    prompt: "What's something you've done recently that you're proud of?",
    placeholder: 'What did you do?',
    ideas: [
      'Finished a difficult assignment',
      'Learned something new',
      'Helped organize something',
      'Improved at a sport, hobby, or skill',
      'Worked through a problem with a friend',
      'Kept working toward something that mattered to me',
    ],
  },
  big: {
    label: 'Big Win',
    color: '#C84A4A',
    bg: '#FFF0F0',
    border: '#FFD0D0',
    tag: '#FFE4E4',
    tagText: '#C84A4A',
    desc: "The bigger moments you really want to remember.",
    prompt: "What's a big accomplishment you're proud of?",
    placeholder: 'What did you accomplish?',
    ideas: [
      'Finished a big project',
      "Reached a goal I'd been working toward",
      'Made a team, club, performance, or activity',
      'Improved at something after working on it for a long time',
      'Did something that felt really difficult',
      "Accomplished something I didn't think I could do",
    ],
  },
}

const INITIAL_ENTRIES: Entry[] = [
  { id: 'e1', text: 'Finished something I had been putting off all week.', tier: 'small', date: 'Jul 30', dateKey: '2026-07-30', favorited: false },
  { id: 'e2', text: 'Made my friend laugh when they were having a rough day.', tier: 'small', date: 'Aug 1', dateKey: '2026-08-01', favorited: true },
  { id: 'e3', text: 'Improved at something after working on it for a while.', tier: 'medium', date: 'Aug 4', dateKey: '2026-08-04', favorited: false },
  { id: 'e4', text: 'Asked for help instead of giving up on my homework.', tier: 'medium', date: 'Aug 5', dateKey: '2026-08-05', favorited: true },
  { id: 'e5', text: 'Finished a science project I worked on for three weeks.', tier: 'big', date: 'Jul 28', dateKey: '2026-07-28', favorited: false },
]

const INITIAL_FUTURE_ENTRIES: FutureEntry[] = [
  { id: 'f1', text: 'Get through the whole cross-country season without quitting.', tier: 'big', fromGoals: true },
  { id: 'f2', text: 'Finish the book I started in June.', tier: 'small', fromGoals: true },
  { id: 'f3', text: 'Learn how to make a meal from scratch.', tier: 'medium', fromGoals: false },
  { id: 'f4', text: 'Introduce myself to someone new at school.', tier: 'small', fromGoals: false },
]

function todayLabel(): string {
  return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function todayDateKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function buildDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function buildCalendarGrid(year: number, month: number): (number | null)[][] {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = Array(firstDay).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  const rows: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
  return rows
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

function evalGuess(guess: string, answer: string): TileStatus[] {
  const result: TileStatus[] = new Array(5).fill('absent')
  const tgt = answer.split('')
  const g = guess.split('')
  g.forEach((ch, i) => {
    if (ch === tgt[i]) { result[i] = 'correct'; tgt[i] = '#'; g[i] = '*' }
  })
  g.forEach((ch, i) => {
    if (ch === '*') return
    const idx = tgt.indexOf(ch)
    if (idx !== -1) { result[i] = 'present'; tgt[idx] = '#' }
  })
  return result
}

function Tile({ letter, status }: { letter: string; status: TileStatus }) {
  const cls: Record<TileStatus, string> = {
    correct: 'bg-[#5CC8B8] border-[#5CC8B8] text-white',
    present: 'bg-[#FFD93D] border-[#FFD93D] text-[#2D2D2D]',
    absent:  'bg-[#C4BAB0] border-[#C4BAB0] text-white',
    empty:   'bg-white border-[#DDD5CC] text-[#2D2D2D]',
    active:  'bg-white border-[#FF6B6B] text-[#2D2D2D]',
  }
  return (
    <div className={`w-12 h-12 flex items-center justify-center border-2 rounded-xl font-black text-lg select-none transition-colors duration-150 ${cls[status]}`}>
      {letter}
    </div>
  )
}

function Key({ label, status, onPress }: { label: string; status?: TileStatus; onPress: () => void }) {
  const wide = label === 'ENTER' || label === '⌫'
  const color = status === 'correct' ? 'bg-[#5CC8B8] text-white'
    : status === 'present' ? 'bg-[#FFD93D] text-[#2D2D2D]'
    : status === 'absent'  ? 'bg-[#C4BAB0] text-white'
    : 'bg-[#F0E9E1] text-[#2D2D2D]'
  return (
    <button
      onClick={onPress}
      className={`${wide ? 'px-2 min-w-[52px]' : 'w-9'} h-11 flex items-center justify-center rounded-lg font-bold text-xs ${color} active:scale-95 transition-transform duration-75 shrink-0`}
    >
      {label}
    </button>
  )
}

function BackBtn({ label, go }: { label: string; go: () => void }) {
  return (
    <button onClick={go} className="flex items-center gap-1 text-[#FF6B6B] font-bold text-sm mb-4">
      <span>←</span> {label}
    </button>
  )
}

function PlayingCard({
  word, phase, isSelected, allFlipped, onTap, style,
}: {
  word: string; phase: CardPhase; isSelected: boolean; allFlipped: boolean; onTap: () => void; style?: React.CSSProperties
}) {
  const isUp = phase === 'up'
  const isMid = phase === 'mid'

  const cardStyle: React.CSSProperties = {
    width: '100%', height: '100%',
    borderRadius: '18px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexDirection: 'column',
    transform: isMid ? 'scaleX(0)' : 'scaleX(1)',
    transition: isUp ? 'transform 0.18s ease-out' : 'transform 0.18s ease-in',
    userSelect: 'none',
    ...(isUp
      ? {
          backgroundColor: isSelected ? '#8B6FD4' : '#FDFAFF',
          border: `2px solid ${isSelected ? '#8B6FD4' : '#D4C0F8'}`,
          boxShadow: isSelected ? '0 6px 20px rgba(139,111,212,0.45)' : '0 2px 10px rgba(0,0,0,0.06)',
          padding: '12px',
        }
      : {
          background: 'linear-gradient(145deg, #7B5CC4 0%, #9B7FE4 100%)',
          boxShadow: '0 6px 18px rgba(107,79,168,0.35)',
          position: 'relative' as const,
          overflow: 'hidden' as const,
        }),
  }

  return (
    <div
      onClick={onTap}
      style={{ flex: 1, height: '210px', cursor: 'pointer', ...style }}
    >
      <div style={cardStyle}>
        {isUp ? (
          <span style={{ fontSize: '16px', fontWeight: 900, color: isSelected ? '#fff' : '#6B4FA8', textAlign: 'center', lineHeight: 1.3 }}>
            {word}
          </span>
        ) : (
          <>
            <span style={{ fontSize: '42px', opacity: 0.35 }}>✦</span>
            <span style={{ position: 'absolute', top: 10, left: 12, fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 900 }}>✦</span>
            <span style={{ position: 'absolute', bottom: 10, right: 12, fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 900 }}>✦</span>
          </>
        )}
      </div>
    </div>
  )
}

function PhoneShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="fixed top-8 left-8 w-16 h-16 rounded-full bg-[#FF6B6B] opacity-20 pointer-events-none" />
      <div className="fixed bottom-12 right-8 w-24 h-24 rounded-full bg-[#5CC8B8] opacity-20 pointer-events-none" />
      <div className="fixed top-1/2 right-4 w-8 h-8 bg-[#FFD93D] opacity-30 rotate-45 pointer-events-none" />

      <div
        className="w-full max-w-[390px] bg-[#FDF8F2] rounded-[44px] overflow-hidden shadow-2xl flex flex-col"
        style={{ minHeight: '844px', maxHeight: '844px' }}
      >
        <div className="flex justify-between items-center px-8 py-3 shrink-0">
          <span className="text-xs font-black text-[#2D2D2D]">9:41</span>
          <div className="flex gap-2 items-center text-xs font-bold text-[#2D2D2D]">
            <span>●●●</span><span>WiFi</span><span>🔋</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
        <div className="flex justify-center pb-3 pt-2 shrink-0">
          <div className="w-28 h-1 bg-[#C4BAB0] rounded-full" />
        </div>
      </div>
    </div>
  )
}

function IdeaBox({ ideas, prefix }: { ideas: string[]; prefix?: string }) {
  return (
    <div className="mt-3 bg-[#FFF8F0] border border-[#FFD9A0] rounded-2xl p-4">
      {prefix && <p className="text-[#AAA] font-semibold text-xs mb-2">{prefix}</p>}
      <ul className="flex flex-col gap-2">
        {ideas.map((idea, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-[#555] font-medium">
            <span className="text-[#FFD93D] font-black shrink-0">•</span>{idea}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')

  // Wordle
  const [wordEntry, setWordEntry] = useState(() => WORD_POOL[Math.floor(Math.random() * WORD_POOL.length)])
  const [guesses, setGuesses] = useState<string[]>([])
  const [current, setCurrent] = useState('')
  const [gameWon, setGameWon] = useState(false)
  const [gameLost, setGameLost] = useState(false)

  // Word reflection
  const [wordText, setWordText] = useState('')
  const [showWordIdeas, setShowWordIdeas] = useState(false)

  // Thanks — gratitude
  const [gratitudeText, setGratitudeText] = useState('')
  const [showGratitudeIdeas, setShowGratitudeIdeas] = useState(false)

  // Thanks — Version A: Shuffle
  const [v1, setV1] = useState(() => {
    const pool = shuffleArr(QUALITY_POOL)
    return { pool, page: 0, selected: null as string | null, cards: ['down', 'down', 'down'] as CardPhase[] }
  })
  const [v1Text, setV1Text] = useState('')

  // Thanks — Version B: VS Game
  const [v2, setV2] = useState(() => {
    const pool = shuffleArr(QUALITY_POOL)
    return { pool, poolIdx: 2, left: pool[0], right: pool[1], round: 1, champion: null as string | null, done: false }
  })
  const [v2Text, setV2Text] = useState('')

  // Add entry
  const [addTier, setAddTier] = useState<Tier | null>(null)
  const [addText, setAddText] = useState('')
  const [showAddIdeas, setShowAddIdeas] = useState(false)
  const [showNotSure, setShowNotSure] = useState(false)

  // Entries
  const [entries, setEntries] = useState<Entry[]>(INITIAL_ENTRIES)

  // Board expanded tiers
  const [expandedTiers, setExpandedTiers] = useState<Record<Tier, boolean>>({ small: false, medium: false, big: false })

  // Future entries
  const [futureEntries, setFutureEntries] = useState<FutureEntry[]>(INITIAL_FUTURE_ENTRIES)
  const [addFutureTier, setAddFutureTier] = useState<Tier | null>(null)
  const [addFutureText, setAddFutureText] = useState('')
  const [showAddFutureForm, setShowAddFutureForm] = useState(false)

  // Calendar
  const now = new Date()
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth())
  const [calSelectedDay, setCalSelectedDay] = useState<number | null>(null)

  const keyStatuses = useMemo(() => {
    const s: Record<string, TileStatus> = {}
    guesses.forEach(g => {
      evalGuess(g, wordEntry.word).forEach((st, i) => {
        const ch = g[i]
        if (st === 'correct') s[ch] = 'correct'
        else if (st === 'present' && s[ch] !== 'correct') s[ch] = 'present'
        else if (!s[ch]) s[ch] = 'absent'
      })
    })
    return s
  }, [guesses, wordEntry.word])

  const handleKey = useCallback((key: string) => {
    if (gameWon || gameLost) return
    if (key === '⌫') { setCurrent(g => g.slice(0, -1)); return }
    if (key === 'ENTER') {
      if (current.length !== 5) return
      const next = [...guesses, current]
      setGuesses(next)
      if (current === wordEntry.word) {
        setGameWon(true)
        setTimeout(() => setScreen('word-reflection'), 900)
      } else if (next.length >= MAX_GUESSES) {
        setGameLost(true)
      }
      setCurrent('')
      return
    }
    if (/^[A-Z]$/.test(key) && current.length < 5) setCurrent(g => g + key)
  }, [gameWon, gameLost, guesses, current])

  useEffect(() => {
    if (screen !== 'word-game') return
    const handler = (e: KeyboardEvent) => {
      const k = e.key.toUpperCase()
      if (k === 'BACKSPACE') handleKey('⌫')
      else if (k === 'ENTER') handleKey('ENTER')
      else if (/^[A-Z]$/.test(k)) handleKey(k)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [screen, handleKey])

  const resetWordGame = () => {
    setWordEntry(WORD_POOL[Math.floor(Math.random() * WORD_POOL.length)])
    setGuesses([]); setCurrent(''); setGameWon(false); setGameLost(false)
    setWordText(''); setShowWordIdeas(false)
  }

  const openAddEntry = (tier: Tier | null = null) => {
    setAddTier(tier); setAddText('')
    setShowAddIdeas(false); setShowNotSure(false)
    setScreen('add-entry')
  }

  const saveEntry = (tier: Tier, text: string, word?: string) => {
    const entry: Entry = {
      id: `a-${Date.now()}`,
      text,
      tier,
      date: todayLabel(),
      dateKey: todayDateKey(),
      favorited: false,
      word,
    }
    setEntries(prev => [entry, ...prev])
  }

  const toggleFavorite = (id: string) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, favorited: !e.favorited } : e))
  }

  // Wordle grid
  const grid = () =>
    Array.from({ length: MAX_GUESSES }, (_, r) => {
      const g = guesses[r]
      const isActive = r === guesses.length && !gameWon && !gameLost
      return (
        <div key={r} className="flex gap-1.5 justify-center">
          {Array.from({ length: 5 }, (_, c) => {
            let letter = ''
            let status: TileStatus = 'empty'
            if (g) { letter = g[c]; status = evalGuess(g, wordEntry.word)[c] }
            else if (isActive) { letter = current[c] ?? ''; status = letter ? 'active' : 'empty' }
            return <Tile key={c} letter={letter} status={status} />
          })}
        </div>
      )
    })

  // ── HOME ──────────────────────────────────────────────────────────────
  if (screen === 'home') {
    return (
      <PhoneShell>
        <div className="px-6 pb-8">
          <div className="flex items-center justify-between mt-1 mb-4">
            <div className="flex items-center gap-1.5 bg-[#EEF9F7] text-[#3DA89A] text-xs font-bold px-3 py-1.5 rounded-full">
              <span>🔒</span><span>Only you can see this</span>
            </div>
            <div className="w-7 h-7 rounded-full bg-[#FFD93D] opacity-60" />
          </div>

          <h1 className="text-[28px] font-black text-[#2D2D2D] leading-tight mb-2">My Accomplishments</h1>
          <p className="text-[#777] font-semibold text-sm mb-5 leading-snug">
            Take a minute to notice something positive about yourself or something you've done.
          </p>

          {/* Card 1: Word of the Day */}
          <div className="bg-white rounded-3xl border border-[#E8DDD0] p-5 mb-4 shadow-sm">
            <div className="flex gap-2 mb-4">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="w-10 h-10 flex items-center justify-center rounded-xl border-2 border-[#DDD5CC] bg-white" />
              ))}
            </div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-xl">✨</span>
              <h2 className="text-xl font-black text-[#2D2D2D]">Word of the Day</h2>
            </div>
            <p className="text-[#888] font-semibold text-sm mb-4 leading-snug">
              Guess today's positive word, then think of a time you've shown it.
            </p>
            <button
              onClick={() => { resetWordGame(); setScreen('word-game') }}
              className="w-full bg-[#FF6B6B] text-white font-black py-3.5 rounded-2xl active:scale-95 transition-transform"
            >
              Play
            </button>
          </div>

          {/* Card 2: My Wins */}
          <div className="bg-white rounded-3xl border border-[#E8DDD0] p-5 mb-4 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-xl">🏆</span>
              <h2 className="text-xl font-black text-[#2D2D2D]">My Wins</h2>
            </div>
            <p className="text-[#888] font-semibold text-sm mb-4 leading-snug">
              Save your wins, big or small.
            </p>
            <button
              onClick={() => setScreen('board')}
              className="w-full bg-[#5CC8B8] text-white font-black py-3.5 rounded-2xl active:scale-95 transition-transform"
            >
              View my wins
            </button>
          </div>

          {/* Card 3: My Thanks */}
          <div className="bg-white rounded-3xl border border-[#E8DDD0] p-5 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-xl">🙏</span>
              <h2 className="text-xl font-black text-[#2D2D2D]">My Thanks</h2>
            </div>
            <p className="text-[#888] font-semibold text-sm mb-4 leading-snug">
              Notice the good stuff!
            </p>
            <button
              onClick={() => { setGratitudeText(''); setShowGratitudeIdeas(false); setScreen('thanks') }}
              className="w-full font-black py-3.5 rounded-2xl active:scale-95 transition-transform text-white"
              style={{ backgroundColor: '#8B6FD4' }}
            >
              Open My Thanks
            </button>
          </div>
        </div>
      </PhoneShell>
    )
  }

  // ── WORD GAME ─────────────────────────────────────────────────────────
  if (screen === 'word-game') {
    return (
      <PhoneShell>
        <div className="flex flex-col px-4 pb-4">
          <BackBtn label="Home" go={() => setScreen('home')} />
          <div className="flex items-center gap-2 mb-1 px-2">
            <span className="text-xl">✨</span>
            <h2 className="text-2xl font-black text-[#2D2D2D]">Word of the Day</h2>
          </div>
          <p className="text-[#888] font-semibold text-sm mb-5 px-2">
            Guess the 5-letter positive word. Green = right spot. Yellow = in the word.
          </p>

          <div className="flex flex-col gap-1.5 mb-5">{grid()}</div>

          {gameLost && (
            <div className="mx-2 mb-4 bg-[#FFF0F0] border border-[#FFD0D0] rounded-2xl p-4 text-center">
              <p className="font-black text-[#2D2D2D] text-base mb-1">
                Today's word was <span className="text-[#FF6B6B]">{wordEntry.word}</span>
              </p>
              <button
                onClick={() => setScreen('word-reflection')}
                className="mt-2 bg-[#FF6B6B] text-white font-black text-sm py-2.5 px-6 rounded-xl active:scale-95 transition-transform"
              >
                Still reflect on it →
              </button>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            {KEYBOARD_ROWS.map((row, ri) => (
              <div key={ri} className="flex gap-1 justify-center">
                {row.map(key => (
                  <Key key={key} label={key} status={keyStatuses[key]} onPress={() => handleKey(key)} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </PhoneShell>
    )
  }

  // ── WORD REFLECTION ───────────────────────────────────────────────────
  if (screen === 'word-reflection') {
    const canSave = wordText.trim().length > 0
    const handleSave = () => {
      if (!canSave) return
      saveEntry('medium', wordText, wordEntry.word)
      setScreen('board')
    }
    return (
      <PhoneShell>
        <div className="px-6 pb-10">
          <BackBtn label="Word of the Day" go={() => setScreen('word-game')} />

          <div className="bg-[#EEF9F7] border border-[#B2E8E0] rounded-3xl p-5 mb-6 text-center">
            <p className="text-[#888] font-semibold text-xs mb-2">Today's word is</p>
            <div className="flex gap-2 justify-center my-3">
              {wordEntry.word.split('').map((ch, i) => (
                <div key={i} className="w-11 h-11 flex items-center justify-center bg-[#5CC8B8] rounded-xl font-black text-lg text-white">
                  {ch}
                </div>
              ))}
            </div>
            <p className="text-[#3DA89A] font-black text-sm tracking-widest">{wordEntry.word}</p>
          </div>

          <h2 className="text-xl font-black text-[#2D2D2D] mb-1 leading-snug">
            {wordEntry.question}
          </h2>
          <p className="text-[#AAA] font-semibold text-sm mb-4">It can be something big or small.</p>

          <label className="block text-[#2D2D2D] font-black text-sm mb-2">What did you do?</label>
          <textarea
            value={wordText}
            onChange={e => setWordText(e.target.value)}
            placeholder="Write a few words or a sentence..."
            rows={4}
            className="w-full bg-white border-2 border-[#E8DDD0] rounded-2xl p-4 text-sm text-[#2D2D2D] font-semibold placeholder:text-[#C4BAB0] focus:outline-none focus:border-[#5CC8B8] resize-none"
          />

          <button
            onClick={() => setShowWordIdeas(v => !v)}
            className="mt-2 text-[#FF6B6B] font-bold text-sm underline underline-offset-2 active:opacity-70"
          >
            I need an idea
          </button>
          {showWordIdeas && <IdeaBox ideas={WORD_IDEAS} />}

          <button
            onClick={handleSave}
            disabled={!canSave}
            className={`w-full font-black py-3.5 rounded-2xl mt-6 text-sm transition-all ${
              canSave ? 'bg-[#FF6B6B] text-white active:scale-95' : 'bg-[#E8DDD0] text-[#C4BAB0] cursor-not-allowed'
            }`}
          >
            Add to My Accomplishments
          </button>
        </div>
      </PhoneShell>
    )
  }

  // ── BOARD ─────────────────────────────────────────────────────────────
  if (screen === 'board') {
    const tiers: Tier[] = ['big', 'medium', 'small']
    const spotlightEntries = entries.filter(e => e.favorited)

    return (
      <PhoneShell>
        <div className="px-6 pb-12">
          <BackBtn label="Home" go={() => setScreen('home')} />

          <div className="flex items-center justify-between mb-1">
            <h2 className="text-2xl font-black text-[#2D2D2D]">My Accomplishments</h2>
          </div>
          <div className="flex items-center gap-1.5 bg-[#EEF9F7] text-[#3DA89A] text-xs font-bold px-3 py-1.5 rounded-full w-fit mb-5">
            <span>🔒</span><span>This is just for you.</span>
          </div>

          {/* Quick nav row */}
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => { setCalSelectedDay(null); setScreen('board-calendar') }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl font-black text-sm bg-white border border-[#E8DDD0] text-[#2D2D2D] active:scale-95 transition-transform shadow-sm"
            >
              <span>📅</span> Browse by Date
            </button>
            <button
              onClick={() => setScreen('board-future')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl font-black text-sm bg-white border border-[#E8DDD0] text-[#2D2D2D] active:scale-95 transition-transform shadow-sm"
            >
              <span>🔮</span> Future Wins
            </button>
          </div>

          {/* Spotlight Wins */}
          {spotlightEntries.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">⭐</span>
                <h3 className="font-black text-[#2D2D2D] text-base">Spotlight Wins</h3>
                <span className="text-xs font-bold text-[#C4BAB0]">your favorites</span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                {spotlightEntries.map(entry => {
                  const cfg = TIER_CONFIG[entry.tier]
                  return (
                    <div
                      key={entry.id}
                      className="shrink-0 rounded-2xl p-4 shadow-sm"
                      style={{
                        width: '200px',
                        background: `linear-gradient(145deg, ${cfg.bg} 0%, white 100%)`,
                        border: `1.5px solid ${cfg.border}`,
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: cfg.tag, color: cfg.color }}>
                          {cfg.label}
                        </span>
                        <button
                          onClick={() => toggleFavorite(entry.id)}
                          className="text-base active:scale-110 transition-transform"
                        >
                          ⭐
                        </button>
                      </div>
                      <p className="text-sm font-semibold text-[#444] leading-snug mb-2">{entry.text}</p>
                      <p className="text-xs font-semibold text-[#C4BAB0]">{entry.date}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Add button */}
          <button
            onClick={() => openAddEntry(null)}
            className="w-full bg-[#FF6B6B] text-white font-black py-3 rounded-2xl mb-6 text-sm active:scale-95 transition-transform"
          >
            + Add an accomplishment
          </button>

          {/* Tier sections — curated view */}
          {tiers.map(tier => {
            const cfg = TIER_CONFIG[tier]
            const tierEntries = entries.filter(e => e.tier === tier)
            const isExpanded = expandedTiers[tier]
            const visibleEntries = isExpanded ? tierEntries : tierEntries.slice(0, 2)

            return (
              <div key={tier} className="mb-5">
                {/* Tier header */}
                <div
                  className="flex items-center justify-between px-4 py-3 rounded-2xl mb-3"
                  style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.border}` }}
                >
                  <div>
                    <span className="font-black text-[#2D2D2D] text-sm">{cfg.label}s</span>
                    <p className="text-xs font-semibold mt-0.5 leading-snug" style={{ color: cfg.color }}>{cfg.desc}</p>
                  </div>
                  <button
                    onClick={() => openAddEntry(tier)}
                    className="text-xs font-black px-3 py-1.5 rounded-full active:scale-95 transition-transform shrink-0 ml-3"
                    style={{ backgroundColor: cfg.tag, color: cfg.color }}
                  >
                    + Add
                  </button>
                </div>

                {tierEntries.length === 0 ? (
                  <p className="text-sm text-[#C4BAB0] font-semibold italic px-1 mb-2">Nothing here yet.</p>
                ) : (
                  <>
                    <div className="flex flex-col gap-2">
                      {visibleEntries.map(entry => (
                        <div key={entry.id} className="bg-white border border-[#E8DDD0] rounded-2xl p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              {entry.word && (
                                <span className="inline-block text-xs font-black px-2 py-0.5 rounded-md mb-2" style={{ backgroundColor: cfg.tag, color: cfg.color }}>
                                  {entry.word}
                                </span>
                              )}
                              <p className="text-sm font-semibold text-[#444] leading-snug mb-1">{entry.text}</p>
                              <p className="text-xs font-semibold text-[#C4BAB0]">{entry.date}</p>
                            </div>
                            <button
                              onClick={() => toggleFavorite(entry.id)}
                              className="text-base active:scale-125 transition-transform shrink-0 mt-0.5"
                              title={entry.favorited ? 'Remove from spotlight' : 'Add to spotlight'}
                            >
                              {entry.favorited ? '⭐' : '☆'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {tierEntries.length > 2 && (
                      <button
                        onClick={() => setExpandedTiers(prev => ({ ...prev, [tier]: !prev[tier] }))}
                        className="mt-2 text-xs font-black px-4 py-1.5 rounded-full active:opacity-70 transition-opacity w-full text-center"
                        style={{ color: cfg.color }}
                      >
                        {isExpanded ? '↑ Show less' : `↓ See all ${tierEntries.length} ${cfg.label.toLowerCase()}s`}
                      </button>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </PhoneShell>
    )
  }

  // ── BOARD: CALENDAR ───────────────────────────────────────────────────
  if (screen === 'board-calendar') {
    const calGrid = buildCalendarGrid(calYear, calMonth)
    const DOW = ['S','M','T','W','T','F','S']

    // Build a set of dateKeys that have entries in this month
    const daysWithEntries: Record<number, Tier[]> = {}
    entries.forEach(e => {
      const [y, m, d] = e.dateKey.split('-').map(Number)
      if (y === calYear && m - 1 === calMonth) {
        if (!daysWithEntries[d]) daysWithEntries[d] = []
        daysWithEntries[d].push(e.tier)
      }
    })

    const selectedDateKey = calSelectedDay ? buildDateKey(calYear, calMonth, calSelectedDay) : null
    const selectedEntries = selectedDateKey ? entries.filter(e => e.dateKey === selectedDateKey) : []

    const prevMonth = () => {
      if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) }
      else setCalMonth(m => m - 1)
      setCalSelectedDay(null)
    }
    const nextMonth = () => {
      if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) }
      else setCalMonth(m => m + 1)
      setCalSelectedDay(null)
    }

    return (
      <PhoneShell>
        <div className="px-6 pb-12">
          <BackBtn label="My Accomplishments" go={() => setScreen('board')} />

          <h2 className="text-2xl font-black text-[#2D2D2D] mb-5">Browse by Date</h2>

          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="w-9 h-9 rounded-full bg-white border border-[#E8DDD0] flex items-center justify-center font-black text-[#2D2D2D] active:scale-95 transition-transform shadow-sm">
              ←
            </button>
            <span className="font-black text-[#2D2D2D] text-base">{MONTH_NAMES[calMonth]} {calYear}</span>
            <button onClick={nextMonth} className="w-9 h-9 rounded-full bg-white border border-[#E8DDD0] flex items-center justify-center font-black text-[#2D2D2D] active:scale-95 transition-transform shadow-sm">
              →
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {DOW.map((d, i) => (
              <div key={i} className="text-center text-[10px] font-black text-[#C4BAB0] py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="bg-white rounded-2xl border border-[#E8DDD0] overflow-hidden mb-5 shadow-sm">
            {calGrid.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 border-b border-[#F0E9E1] last:border-b-0">
                {week.map((day, di) => {
                  if (day === null) {
                    return <div key={di} className="h-11" />
                  }
                  const tiers = daysWithEntries[day] || []
                  const hasBig = tiers.includes('big')
                  const hasMedium = tiers.includes('medium')
                  const hasSmall = tiers.includes('small')
                  const isSelected = calSelectedDay === day
                  const isToday = buildDateKey(calYear, calMonth, day) === todayDateKey()

                  return (
                    <button
                      key={di}
                      onClick={() => setCalSelectedDay(prev => prev === day ? null : day)}
                      className="h-11 flex flex-col items-center justify-center gap-0.5 relative active:bg-[#F5F0EC] transition-colors"
                      style={isSelected ? { backgroundColor: '#2D2D2D' } : {}}
                    >
                      <span
                        className="text-xs font-black leading-none"
                        style={{ color: isSelected ? '#fff' : isToday ? '#FF6B6B' : '#2D2D2D' }}
                      >
                        {day}
                      </span>
                      {tiers.length > 0 && (
                        <div className="flex gap-0.5">
                          {hasBig && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#C84A4A' }} />}
                          {hasMedium && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#B08800' }} />}
                          {hasSmall && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#3DA89A' }} />}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Dot legend */}
          <div className="flex items-center gap-4 mb-5 px-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#C84A4A' }} />
              <span className="text-xs font-semibold text-[#AAA]">Big</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#B08800' }} />
              <span className="text-xs font-semibold text-[#AAA]">Medium</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#3DA89A' }} />
              <span className="text-xs font-semibold text-[#AAA]">Small</span>
            </div>
          </div>

          {/* Selected day entries */}
          {calSelectedDay !== null && (
            <div>
              <p className="font-black text-[#2D2D2D] text-sm mb-3">
                {MONTH_NAMES[calMonth]} {calSelectedDay}
              </p>
              {selectedEntries.length === 0 ? (
                <p className="text-sm text-[#C4BAB0] font-semibold italic">Nothing recorded on this day.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {selectedEntries.map(entry => {
                    const cfg = TIER_CONFIG[entry.tier]
                    return (
                      <div key={entry.id} className="bg-white border border-[#E8DDD0] rounded-2xl p-4 shadow-sm">
                        <span className="inline-block text-[10px] font-black px-2 py-0.5 rounded-full mb-2" style={{ backgroundColor: cfg.tag, color: cfg.color }}>
                          {cfg.label}
                        </span>
                        {entry.word && (
                          <span className="inline-block text-xs font-black px-2 py-0.5 rounded-md mb-2 ml-1.5" style={{ backgroundColor: cfg.tag, color: cfg.color }}>
                            {entry.word}
                          </span>
                        )}
                        <p className="text-sm font-semibold text-[#444] leading-snug">{entry.text}</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {calSelectedDay === null && (
            <p className="text-sm text-[#C4BAB0] font-semibold text-center">Tap a day to see your wins</p>
          )}
        </div>
      </PhoneShell>
    )
  }

  // ── BOARD: FUTURE WINS ────────────────────────────────────────────────
  if (screen === 'board-future') {
    const activeFuture = futureEntries.filter(f => !f.movedToWins)

    const moveToWins = (f: FutureEntry) => {
      setFutureEntries(prev => prev.map(fe => fe.id === f.id ? { ...fe, movedToWins: true } : fe))
      saveEntry(f.tier, f.text)
    }

    const saveFutureEntry = () => {
      if (!addFutureTier || !addFutureText.trim()) return
      const fe: FutureEntry = {
        id: `fut-${Date.now()}`,
        text: addFutureText.trim(),
        tier: addFutureTier,
        fromGoals: false,
      }
      setFutureEntries(prev => [fe, ...prev])
      setAddFutureText('')
      setAddFutureTier(null)
      setShowAddFutureForm(false)
    }

    return (
      <PhoneShell>
        <div className="px-6 pb-12">
          <BackBtn label="My Accomplishments" go={() => setScreen('board')} />

          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🔮</span>
            <h2 className="text-2xl font-black text-[#2D2D2D]">Future Wins</h2>
          </div>
          <p className="text-[#888] font-semibold text-sm mb-6 leading-snug">
            Things you want to accomplish. When you get there, move them to My Wins.
          </p>

          {/* Add form toggle */}
          {!showAddFutureForm ? (
            <button
              onClick={() => setShowAddFutureForm(true)}
              className="w-full bg-white border-2 border-dashed border-[#E8DDD0] text-[#C4BAB0] font-black py-3 rounded-2xl mb-6 text-sm active:scale-95 transition-transform hover:border-[#FFD93D] hover:text-[#B08800]"
            >
              + Add a future win
            </button>
          ) : (
            <div className="bg-white border border-[#E8DDD0] rounded-2xl p-4 mb-6 shadow-sm">
              <p className="font-black text-sm text-[#2D2D2D] mb-3">What do you want to accomplish?</p>
              <textarea
                value={addFutureText}
                onChange={e => setAddFutureText(e.target.value)}
                placeholder="Write it down..."
                rows={3}
                className="w-full bg-[#FDF8F2] border-2 border-[#E8DDD0] rounded-xl p-3 text-sm text-[#2D2D2D] font-semibold placeholder:text-[#C4BAB0] focus:outline-none resize-none mb-3"
              />
              <p className="text-xs font-black text-[#AAA] uppercase tracking-wider mb-2">How big is it?</p>
              <div className="flex gap-2 mb-4">
                {(['small', 'medium', 'big'] as Tier[]).map(t => {
                  const c = TIER_CONFIG[t]
                  const selected = addFutureTier === t
                  return (
                    <button
                      key={t}
                      onClick={() => setAddFutureTier(t)}
                      className="flex-1 py-2 rounded-xl font-black text-xs transition-all active:scale-95"
                      style={{
                        backgroundColor: selected ? c.color : c.bg,
                        color: selected ? '#fff' : c.color,
                        border: `2px solid ${selected ? c.color : c.border}`,
                      }}
                    >
                      {c.label}
                    </button>
                  )
                })}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowAddFutureForm(false); setAddFutureText(''); setAddFutureTier(null) }}
                  className="flex-1 py-2.5 rounded-xl font-black text-sm text-[#C4BAB0] bg-[#F5F0EC] active:scale-95 transition-transform"
                >
                  Cancel
                </button>
                <button
                  onClick={saveFutureEntry}
                  disabled={!addFutureTier || !addFutureText.trim()}
                  className="flex-1 py-2.5 rounded-xl font-black text-sm text-white active:scale-95 transition-transform disabled:opacity-40"
                  style={{ backgroundColor: '#FFD93D', color: '#2D2D2D' }}
                >
                  Save
                </button>
              </div>
            </div>
          )}

          {/* From My Goals note */}
          <div className="flex items-center gap-2 mb-4 px-1">
            <span className="text-sm">🎯</span>
            <p className="text-xs font-semibold text-[#AAA] leading-snug">
              Items marked <span className="font-black text-[#8B6FD4]">From My Goals</span> were brought in from your goals list.
            </p>
          </div>

          {/* Future entries list */}
          {activeFuture.length === 0 ? (
            <p className="text-sm text-[#C4BAB0] font-semibold italic text-center mt-6">Nothing here yet. Add something you're working toward!</p>
          ) : (
            <div className="flex flex-col gap-3">
              {activeFuture.map(fe => {
                const cfg = TIER_CONFIG[fe.tier]
                return (
                  <div
                    key={fe.id}
                    className="bg-white border border-[#E8DDD0] rounded-2xl p-4 shadow-sm"
                    style={fe.fromGoals ? { borderColor: '#D4C0F8', borderWidth: '1.5px' } : {}}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: cfg.tag, color: cfg.color }}>
                          {cfg.label}
                        </span>
                        {fe.fromGoals && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#F3EEFF] text-[#8B6FD4]">
                            🎯 From My Goals
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-[#444] leading-snug mb-3">{fe.text}</p>
                    <button
                      onClick={() => moveToWins(fe)}
                      className="text-xs font-black px-3 py-1.5 rounded-full active:scale-95 transition-transform"
                      style={{ backgroundColor: '#EEF9F7', color: '#3DA89A' }}
                    >
                      ✓ I did it — move to My Wins
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </PhoneShell>
    )
  }

  // ── ADD ENTRY ─────────────────────────────────────────────────────────
  if (screen === 'add-entry') {
    const cfg = addTier ? TIER_CONFIG[addTier] : null
    const canSave = addTier !== null && addText.trim().length > 0

    const handleSave = () => {
      if (!canSave || !addTier) return
      saveEntry(addTier, addText)
      setScreen('board')
    }

    return (
      <PhoneShell>
        <div className="px-6 pb-10">
          <BackBtn label="My Accomplishments" go={() => setScreen('board')} />

          <h2 className="text-xl font-black text-[#2D2D2D] mb-1 leading-snug">What'd you get done?</h2>
          <p className="text-[#AAA] font-semibold text-sm mb-5 leading-snug">
            There's no wrong answer. Every accomplishment counts.
          </p>

          {/* Tier selector */}
          <p className="text-xs font-black text-[#AAA] uppercase tracking-wider mb-3">How big was it?</p>
          <div className="flex gap-2 mb-2">
            {(['small', 'medium', 'big'] as Tier[]).map(t => {
              const c = TIER_CONFIG[t]
              const selected = addTier === t
              return (
                <button
                  key={t}
                  onClick={() => { setAddTier(t); setShowAddIdeas(false) }}
                  className="flex-1 py-2.5 rounded-xl font-black text-xs transition-all active:scale-95"
                  style={{
                    backgroundColor: selected ? c.color : c.bg,
                    color: selected ? '#fff' : c.color,
                    border: `2px solid ${selected ? c.color : c.border}`,
                  }}
                >
                  {c.label}
                </button>
              )
            })}
          </div>

          {/* Not sure */}
          <button
            onClick={() => setShowNotSure(v => !v)}
            className="text-[#C4BAB0] font-bold text-xs underline underline-offset-2 mb-4 active:opacity-70"
          >
            Not sure?
          </button>
          {showNotSure && (
            <div className="bg-[#FFF8F0] border border-[#FFD9A0] rounded-2xl p-4 mb-4 text-sm text-[#555] font-semibold leading-snug">
              There's no right answer. Pick whichever one feels closest. If you're proud of it, it belongs here.
            </div>
          )}

          {/* Tier-specific form */}
          {cfg && addTier && (
            <div className="mt-1">
              <div className="rounded-2xl px-4 py-3 mb-4" style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.border}` }}>
                <p className="font-black text-sm" style={{ color: cfg.color }}>{cfg.prompt}</p>
              </div>

              <label className="block text-[#2D2D2D] font-black text-sm mb-2">What did you do?</label>
              <textarea
                value={addText}
                onChange={e => setAddText(e.target.value)}
                placeholder={cfg.placeholder}
                rows={4}
                className="w-full bg-white border-2 border-[#E8DDD0] rounded-2xl p-4 text-sm text-[#2D2D2D] font-semibold placeholder:text-[#C4BAB0] focus:outline-none resize-none"
                onFocus={e => (e.target.style.borderColor = cfg.color)}
                onBlur={e => (e.target.style.borderColor = '#E8DDD0')}
              />

              <button
                onClick={() => setShowAddIdeas(v => !v)}
                className="mt-2 font-bold text-sm underline underline-offset-2 active:opacity-70"
                style={{ color: cfg.color }}
              >
                I need an idea
              </button>
              {showAddIdeas && <IdeaBox ideas={cfg.ideas} />}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={!canSave}
            className={`w-full font-black py-3.5 rounded-2xl mt-6 text-sm transition-all ${
              canSave ? 'bg-[#FF6B6B] text-white active:scale-95' : 'bg-[#E8DDD0] text-[#C4BAB0] cursor-not-allowed'
            }`}
          >
            Add my win
          </button>
        </div>
      </PhoneShell>
    )
  }

  // ── THANKS INTRO ─────────────────────────────────────────────────────
  if (screen === 'thanks') {
    return (
      <PhoneShell>
        <div className="px-6 pb-10">
          <BackBtn label="Home" go={() => setScreen('home')} />

          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🙏</span>
            <h2 className="text-2xl font-black text-[#2D2D2D]">My Thanks</h2>
          </div>
          <div className="flex items-center gap-1.5 bg-[#F3EEFF] text-[#8B6FD4] text-xs font-bold px-3 py-1.5 rounded-full w-fit mb-6">
            <span>🔒</span><span>This is just for you.</span>
          </div>

          {/* Activity card 1 */}
          <div className="bg-white rounded-3xl border border-[#E8DDD0] p-5 mb-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">💛</span>
              <h3 className="text-lg font-black text-[#2D2D2D]">Something I'm Thankful For</h3>
            </div>
            <p className="text-[#888] font-semibold text-sm mb-5 leading-snug">
              Taking a second to notice the good stuff — big or small — can help you appreciate what's already around you.
            </p>
            <button
              onClick={() => { setGratitudeText(''); setShowGratitudeIdeas(false); setScreen('thanks-gratitude') }}
              className="w-full font-black py-3.5 rounded-2xl text-white text-sm active:scale-95 transition-transform"
              style={{ backgroundColor: '#8B6FD4' }}
            >
              Start
            </button>
          </div>

          {/* Activity card 2: Version A */}
          <div className="bg-white rounded-3xl border border-[#E8DDD0] p-5 mb-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔀</span>
                <h3 className="text-lg font-black text-[#2D2D2D]">Something I Appreciate About Myself</h3>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#F0EBF9] text-[#9B7FCC]">Version A</span>
            </div>
            <p className="text-[#888] font-semibold text-sm mb-5 leading-snug">
              Shuffle through positive words until one feels like you, then tap it to claim it.
            </p>
            <button
              onClick={() => setScreen('thanks-quality-a')}
              className="w-full font-black py-3.5 rounded-2xl text-white text-sm active:scale-95 transition-transform"
              style={{ backgroundColor: '#8B6FD4' }}
            >
              Start
            </button>
          </div>

          {/* Activity card 3: Version B */}
          <div className="bg-white rounded-3xl border border-[#E8DDD0] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">⚡</span>
                <h3 className="text-lg font-black text-[#2D2D2D]">Something I Appreciate About Myself</h3>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#F0EBF9] text-[#9B7FCC]">Version B</span>
            </div>
            <p className="text-[#888] font-semibold text-sm mb-5 leading-snug">
              Pick between two words, three rounds. The last one standing is yours.
            </p>
            <button
              onClick={() => setScreen('thanks-quality-b')}
              className="w-full font-black py-3.5 rounded-2xl text-white text-sm active:scale-95 transition-transform"
              style={{ backgroundColor: '#8B6FD4' }}
            >
              Start
            </button>
          </div>
        </div>
      </PhoneShell>
    )
  }

  // ── THANKS: GRATITUDE ACTIVITY ────────────────────────────────────────
  if (screen === 'thanks-gratitude') {
    const GRATITUDE_PROMPTS = [
      { label: 'Someone',              question: "Who's someone you're glad to have in your life right now?" },
      { label: 'Something small',      question: "What's one little thing that made today better?" },
      { label: 'A moment',             question: "What's a moment from lately that you're glad happened?" },
      { label: 'A place',              question: "Where's somewhere you're happy you get to spend time?" },
      { label: 'Something funny',      question: 'What made you laugh or smile recently?' },
      { label: 'Something that helped', question: 'What made something a little easier for you lately?' },
      { label: 'Something you have',   question: "What's something in your life you're really glad you have?" },
      { label: 'Someone did for you',  question: 'Did someone do something small for you that you appreciated?' },
      { label: 'A good surprise',      question: "What's something that turned out better than you expected?" },
      { label: 'A memory',             question: "What's a moment you'd want to remember?" },
    ]
    const pickRandom = () => {
      const idx = Math.floor(Math.random() * GRATITUDE_PROMPTS.length)
      setGratitudeText(GRATITUDE_PROMPTS[idx].question)
      setShowGratitudeIdeas(false)
    }
    const canSave = gratitudeText.trim().length > 0
    return (
      <PhoneShell>
        <div className="px-6 pb-10">
          <BackBtn label="My Thanks" go={() => setScreen('thanks')} />

          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">💛</span>
            <h2 className="text-2xl font-black text-[#2D2D2D]">Something I'm Thankful For</h2>
          </div>
          <p className="text-[#888] font-semibold text-sm mb-6 leading-snug">
            Taking a second to notice the good stuff — big or small — can help you appreciate what's already around you.
          </p>

          <label className="block text-[#2D2D2D] font-black text-sm mb-2">
            What's something you're thankful for today?
          </label>
          <textarea
            value={gratitudeText}
            onChange={e => setGratitudeText(e.target.value)}
            placeholder="Write something..."
            rows={4}
            className="w-full bg-[#FDFAFF] border-2 border-[#E8DDD0] rounded-2xl p-4 text-sm text-[#2D2D2D] font-semibold placeholder:text-[#C4BAB0] focus:outline-none focus:border-[#B8A0E8] resize-none"
          />

          <button className="flex items-center gap-2 mt-3 text-[#8B6FD4] font-bold text-sm active:opacity-70">
            <span className="w-7 h-7 rounded-lg bg-[#F3EEFF] flex items-center justify-center text-base">📷</span>
            + Add a photo
          </button>

          <div className="mt-5">
            <div className="flex items-center gap-3 mb-3">
              <p className="text-[#2D2D2D] font-black text-sm">Need an idea?</p>
              <button onClick={pickRandom} className="text-[#8B6FD4] font-bold text-xs underline underline-offset-2 active:opacity-70">
                Surprise me
              </button>
              <button
                onClick={() => setShowGratitudeIdeas(v => !v)}
                className="text-[#8B6FD4] font-bold text-xs underline underline-offset-2 active:opacity-70 ml-auto"
              >
                {showGratitudeIdeas ? 'Hide' : 'Pick one'}
              </button>
            </div>
            {showGratitudeIdeas && (
              <div className="flex flex-col gap-2">
                {GRATITUDE_PROMPTS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => { setGratitudeText(p.question); setShowGratitudeIdeas(false) }}
                    className="flex items-start gap-3 bg-[#F3EEFF] rounded-xl px-3 py-2.5 text-left active:bg-[#E8DAFF] transition-colors"
                  >
                    <span className="font-black text-xs text-[#8B6FD4] shrink-0 mt-0.5 min-w-[100px]">{p.label}</span>
                    <span className="text-xs font-semibold text-[#555] leading-snug">{p.question}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            disabled={!canSave}
            onClick={() => { if (canSave) { setGratitudeText(''); setScreen('thanks') } }}
            className={`w-full font-black py-3.5 rounded-2xl mt-6 text-sm transition-all ${canSave ? 'text-white active:scale-95' : 'bg-[#E8DDD0] text-[#C4BAB0] cursor-not-allowed'}`}
            style={canSave ? { backgroundColor: '#8B6FD4' } : {}}
          >
            Save
          </button>
        </div>
      </PhoneShell>
    )
  }

  // ── THANKS: VERSION A ─────────────────────────────────────────────────
  if (screen === 'thanks-quality-a') {
    const totalPages = Math.floor(v1.pool.length / 3)
    const pageWords = v1.pool.slice(v1.page * 3, v1.page * 3 + 3)
    const allFlipped = v1.cards.every(c => c === 'up')

    const flipCard = (i: number) => {
      const phase = v1.cards[i]
      if (phase === 'up') {
        if (allFlipped) setV1(s => ({ ...s, selected: pageWords[i] === s.selected ? null : pageWords[i] }))
        return
      }
      if (phase === 'mid') return
      setV1(s => { const cards = [...s.cards] as CardPhase[]; cards[i] = 'mid'; return { ...s, cards } })
      setTimeout(() => {
        setV1(s => { const cards = [...s.cards] as CardPhase[]; if (cards[i] === 'mid') cards[i] = 'up'; return { ...s, cards } })
      }, 190)
    }

    const doShuffle = () => setV1(s => ({
      ...s,
      page: (s.page + 1) % totalPages,
      cards: ['down', 'down', 'down'] as CardPhase[],
      selected: null,
    }))

    const canSave = v1.selected !== null && v1Text.trim().length > 0

    return (
      <PhoneShell>
        <div className="px-6 pb-10">
          <BackBtn label="My Thanks" go={() => setScreen('thanks')} />
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🃏</span>
              <h2 className="text-2xl font-black text-[#2D2D2D]">Something I Appreciate About Myself</h2>
            </div>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#F0EBF9] text-[#9B7FCC]">Version A</span>
          </div>

          {!v1.selected ? (
            <>
              <p className="text-[#888] font-semibold text-sm mt-2 mb-8 leading-snug">
                {!allFlipped
                  ? 'Tap a card to flip it and reveal a word.'
                  : 'Tap the word that feels most like you.'}
              </p>

              <div className="flex gap-3 mb-8">
                {pageWords.map((word, i) => (
                  <PlayingCard
                    key={`${v1.page}-${i}`}
                    word={word}
                    phase={v1.cards[i]}
                    isSelected={v1.selected === word}
                    allFlipped={allFlipped}
                    onTap={() => flipCard(i)}
                  />
                ))}
              </div>

              <button
                onClick={doShuffle}
                className="text-[#8B6FD4] font-bold text-sm underline underline-offset-2 active:opacity-70"
              >
                Not sure? Shuffle the cards
              </button>
            </>
          ) : (
            <>
              <p className="text-[#888] font-semibold text-sm mt-2 mb-6 leading-snug">
                Pick a word that feels like you.
              </p>
              <div className="flex items-center gap-3 mb-6">
                <div className="px-5 py-2.5 rounded-full font-black text-base text-white" style={{ backgroundColor: '#8B6FD4' }}>
                  {v1.selected}
                </div>
                <button
                  onClick={() => setV1(s => ({ ...s, selected: null }))}
                  className="text-sm text-[#C4BAB0] font-bold underline underline-offset-2 active:opacity-70"
                >
                  Change
                </button>
              </div>
              <h3 className="text-lg font-black text-[#2D2D2D] mb-1">
                Think of a time you showed this side of yourself.
              </h3>
              <p className="text-[#AAA] font-semibold text-sm mb-4">It can be something big or small.</p>
              <textarea
                value={v1Text}
                onChange={e => setV1Text(e.target.value)}
                placeholder="Write a few words or a sentence..."
                rows={4}
                className="w-full bg-[#FDFAFF] border-2 border-[#E8DDD0] rounded-2xl p-4 text-sm text-[#2D2D2D] font-semibold placeholder:text-[#C4BAB0] focus:outline-none focus:border-[#B8A0E8] resize-none"
              />
              <button
                disabled={!canSave}
                onClick={() => { if (canSave) { setV1(s => ({ ...s, selected: null, cards: ['down','down','down'] as CardPhase[] })); setV1Text(''); setScreen('thanks') } }}
                className={`w-full font-black py-3.5 rounded-2xl mt-5 text-sm transition-all ${canSave ? 'text-white active:scale-95' : 'bg-[#E8DDD0] text-[#C4BAB0] cursor-not-allowed'}`}
                style={canSave ? { backgroundColor: '#8B6FD4' } : {}}
              >
                Save
              </button>
            </>
          )}
        </div>
      </PhoneShell>
    )
  }

  // ── THANKS: VERSION B ─────────────────────────────────────────────────
  if (screen === 'thanks-quality-b') {
    const advance = (idx: number, pool: string[]) => idx < pool.length ? idx : 0
    const pickWord = (winner: string) => {
      setV2(s => {
        if (s.round >= 3) return { ...s, champion: winner, done: true }
        const nextIdx = advance(s.poolIdx, s.pool)
        return { ...s, left: winner, right: s.pool[nextIdx], poolIdx: nextIdx + 1, round: s.round + 1, champion: winner }
      })
    }
    const newWords = () => {
      setV2(s => {
        if (s.round === 1) {
          const i = advance(s.poolIdx, s.pool); const j = advance(i + 1, s.pool)
          return { ...s, left: s.pool[i], right: s.pool[j], poolIdx: j + 1 }
        }
        const i = advance(s.poolIdx, s.pool)
        return { ...s, right: s.pool[i], poolIdx: i + 1 }
      })
    }
    const reset = () => {
      const pool = shuffleArr(QUALITY_POOL)
      setV2({ pool, poolIdx: 2, left: pool[0], right: pool[1], round: 1, champion: null, done: false })
      setV2Text('')
    }
    const canSave = v2.done && v2Text.trim().length > 0
    return (
      <PhoneShell>
        <div className="px-6 pb-10">
          <BackBtn label="My Thanks" go={() => setScreen('thanks')} />
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚡</span>
              <h2 className="text-2xl font-black text-[#2D2D2D]">Something I Appreciate About Myself</h2>
            </div>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#F0EBF9] text-[#9B7FCC]">Version B</span>
          </div>
          <p className="text-[#888] font-semibold text-sm mb-8 leading-snug">
            Pick between two words, three rounds. The last one standing is yours.
          </p>

          {!v2.done ? (
            <>
              <div className="flex items-center gap-2 mb-6">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="h-2 flex-1 rounded-full transition-colors" style={{ backgroundColor: i < v2.round ? '#8B6FD4' : '#E8DDD0' }} />
                ))}
                <span className="text-xs font-black text-[#C4BAB0] shrink-0">Round {v2.round} of 3</span>
              </div>
              <div className="flex items-center gap-4 mb-5">
                <button
                  onClick={() => pickWord(v2.left)}
                  className="flex-1 py-10 rounded-3xl font-black text-xl active:scale-95 transition-all text-center"
                  style={{ backgroundColor: '#F3EEFF', color: '#6B4FA8', border: '2px solid #D4C0F8' }}
                >
                  {v2.left}
                </button>
                <span className="font-black text-[#C4BAB0] text-lg shrink-0">VS</span>
                <button
                  onClick={() => pickWord(v2.right)}
                  className="flex-1 py-10 rounded-3xl font-black text-xl active:scale-95 transition-all text-center"
                  style={{ backgroundColor: '#F3EEFF', color: '#6B4FA8', border: '2px solid #D4C0F8' }}
                >
                  {v2.right}
                </button>
              </div>
              <button onClick={newWords} className="text-[#C4BAB0] font-bold text-sm underline underline-offset-2 active:opacity-70">
                Neither feels right? New words
              </button>
            </>
          ) : (
            <>
              <div className="bg-[#F3EEFF] rounded-3xl p-6 text-center mb-6">
                <p className="text-sm font-black text-[#9B7FCC] mb-2">Your word</p>
                <p className="text-4xl font-black text-[#6B4FA8]">{v2.champion}</p>
                <p className="text-2xl mt-1">✨</p>
              </div>
              <h3 className="text-lg font-black text-[#2D2D2D] mb-1">Think of a time you showed this side of yourself.</h3>
              <p className="text-[#AAA] font-semibold text-sm mb-4">It can be something big or small.</p>
              <textarea
                value={v2Text}
                onChange={e => setV2Text(e.target.value)}
                placeholder="Write a few words or a sentence..."
                rows={4}
                className="w-full bg-[#FDFAFF] border-2 border-[#E8DDD0] rounded-2xl p-4 text-sm text-[#2D2D2D] font-semibold placeholder:text-[#C4BAB0] focus:outline-none focus:border-[#B8A0E8] resize-none"
              />
              <button
                disabled={!canSave}
                onClick={() => { if (canSave) { reset(); setScreen('thanks') } }}
                className={`w-full font-black py-3.5 rounded-2xl mt-5 text-sm transition-all ${canSave ? 'text-white active:scale-95' : 'bg-[#E8DDD0] text-[#C4BAB0] cursor-not-allowed'}`}
                style={canSave ? { backgroundColor: '#8B6FD4' } : {}}
              >
                Save
              </button>
              <button onClick={reset} className="mt-3 text-[#C4BAB0] font-bold text-sm underline underline-offset-2 active:opacity-70 block text-center w-full">
                Play again
              </button>
            </>
          )}
        </div>
      </PhoneShell>
    )
  }

  return null
}
