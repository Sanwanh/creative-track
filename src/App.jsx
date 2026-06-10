import { useMemo, useState, useEffect, useRef } from 'react'
import TrackGrid from './components/TrackGrid.jsx'
import TilePalette from './components/TilePalette.jsx'
import Tile from './components/Tile.jsx'
import Header from './components/Header.jsx'
import BoardMap from './components/BoardMap.jsx'
import StrategySequence from './components/StrategySequence.jsx'
import Card from './components/ui/Card.jsx'
import Button from './components/ui/Button.jsx'
import Badge from './components/ui/Badge.jsx'
import {
  ROWS,
  TOTAL_COLS,
  FIELD_COLS,
  BONUS_ROW_CHOICES,
  TILE_BY_ID,
  START_PLATE,
  cellKey,
  parseKey,
  footprint,
} from './data/tiles.js'

// 三組規則:加分點欄、是否含 S 板、S 是否必須在每組最後
const GROUPS = {
  國小: { cols: [12, 24], includeS: false, sLast: false },
  國中: { cols: [9, 18, 27], includeS: true, sLast: false },
  高中: { cols: [9, 18, 27], includeS: true, sLast: true },
}
const DEFAULT_GROUP = '國中'
import { plan } from './planner/solver.mjs'
import { place, OPPOSITE } from './planner/geometry.mjs'

// 抽籤:整場只抽一次 4 片(不重複),之後循環使用這 4 片。
function drawFour() {
  const pool = [1, 2, 3, 4, 5, 6, 7, 8, 9]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, 4).sort((a, b) => a - b)
}

// 加分點:指定欄各抽一列(B~H)。
function drawBonus(cols) {
  return cols.map((col) => ({
    col,
    row: BONUS_ROW_CHOICES[Math.floor(Math.random() * BONUS_ROW_CHOICES.length)],
  }))
}

// S 板三臂標籤(跟著 port index,旋轉也不變):
//   port 0 = 上臂(直放朝左)= R;port 1 = 中臂(朝右)= M;port 2 = 下臂(朝左)= L
const S_PORT_LABELS = ['R', 'M', 'L']

export default function App() {
  // 固定手牌循環:hand=抽籤的 4 片(整場不變);used=本輪已放;batch=輪數
  const [hand, setHand] = useState(() => drawFour())
  const [used, setUsed] = useState(() => new Set())
  const [batch, setBatch] = useState(0)
  const [seq, setSeq] = useState([]) // 全場放置順序 [{uid, id}](含 S 板)
  const [group, setGroup] = useState(DEFAULT_GROUP) // 國小 / 國中 / 高中
  const [bonus, setBonus] = useState(() => drawBonus(GROUPS[DEFAULT_GROUP].cols))
  const [showInfo, setShowInfo] = useState(false) // 顯示/隱藏 校名隊名選手簽名(預設關閉)
  const [reveal, setReveal] = useState(null) // 動畫:null=全部顯示;數字=顯示到第 N 步
  const animTimer = useRef(null)

  const [selected, setSelected] = useState('start')
  const [rot, setRot] = useState(0)
  // 可壓板:placed 以 uid 為鍵(允許多片板子覆蓋同一格,後放的在上層)
  const [placed, setPlaced] = useState({}) // { uid: { origin, id, rot, batch } }
  const uidRef = useRef(0)
  const [startPos, setStartPos] = useState(null)
  const [meta, setMeta] = useState({ school: '', team: '', player: '' })
  const [planMsg, setPlanMsg] = useState('')
  const [mode, setMode] = useState('draw') // 'draw'=抽籤版本 / 'manual'=手動輸入版本
  const [drag, setDrag] = useState(null) // 拖曳中的板子 {id, rot, uid?}(供落點預覽)
  const [hoverCell, setHoverCell] = useState(null) // 拖曳時游標所在格(吸附目標)
  const [aggressive, setAggressive] = useState(false) // 激進模式:緩衝 2 片→1 片

  const handSet = useMemo(() => new Set(hand), [hand])
  // 緩衝:最近放下的板子暫時不能再用(正常 2 片;激進模式 1 片)
  const tail = useMemo(() => seq.slice(aggressive ? -1 : -2).map((e) => e.id), [seq, aggressive])
  const available = useMemo(
    () => new Set(hand.filter((t) => !used.has(t) && !tail.includes(t))),
    [hand, used, tail]
  )
  const tileStatus = useMemo(() => {
    const st = {}
    for (let t = 1; t <= 9; t++) {
      if (!handSet.has(t)) st[t] = 'out'
      else if (used.has(t)) st[t] = 'used'
      else if (tail.includes(t)) st[t] = 'buffer'
      else st[t] = 'ok'
    }
    return st
  }, [handSet, used, tail])

  // 界內檢查(壓板合法,所以不檢查重疊)
  function canPlace(originKey, id, r) {
    const { cells } = footprint(originKey, TILE_BY_ID[id].h, r)
    for (const { ri, ci } of cells) {
      if (ri < 0 || ri >= ROWS.length || ci < 0 || ci >= TOTAL_COLS) return false
    }
    return true
  }

  // 放下一片。1-9:消耗本輪名額,4 片用完同樣 4 片進下一輪(循環);
  // S 板不佔名額,但會進 seq(才能在下方顯示「X進Y出」)。
  function placeTrack(key, type, r) {
    const isS = type === 'S'
    if (!isS && !available.has(type)) return
    if (!canPlace(key, type, r)) return
    const uid = 't' + uidRef.current++
    setPlaced((prev) => ({ ...prev, [uid]: { origin: key, id: type, rot: r, batch } }))
    setSeq((prev) => [...prev, { uid, id: type }])
    if (isS) return // S 不佔抽牌名額、不推進輪數
    const next = new Set(used)
    next.add(type)
    if (next.size >= 4) {
      setUsed(new Set()) // 同樣 4 片進下一輪
      setBatch((b) => b + 1)
    } else {
      setUsed(next)
    }
  }

  function removeTrack(uid) {
    const cur = placed[uid]
    setPlaced((prev) => {
      const n = { ...prev }
      delete n[uid]
      return n
    })
    setSeq((prev) => prev.filter((e) => e.uid !== uid))
    if (cur && cur.id !== 'S' && cur.batch === batch && handSet.has(cur.id)) {
      setUsed((prev) => {
        const n = new Set(prev)
        n.delete(cur.id)
        return n
      })
    }
  }

  function rotateTrack(uid) {
    setPlaced((prev) => {
      const cur = prev[uid]
      if (!cur) return prev
      for (const delta of [90, 180, 270]) {
        const nr = (cur.rot + delta) % 360
        if (canPlace(cur.origin, cur.id, nr)) return { ...prev, [uid]: { ...cur, rot: nr } }
      }
      return prev
    })
  }

  function moveTrack(uid, to) {
    setPlaced((prev) => {
      const cur = prev[uid]
      if (!cur || !canPlace(to, cur.id, cur.rot)) return prev
      return { ...prev, [uid]: { ...cur, origin: to } }
    })
  }

  function handleGridCellClick(key) {
    if (typeof selected === 'number' || selected === 'S') placeTrack(key, selected, rot)
  }
  function handleGridDrop(key, raw) {
    clearDrag()
    if (raw.startsWith('move:track:')) return moveTrack(raw.slice(11), key)
    if (raw === 'start' || raw.startsWith('move:start')) return
    placeTrack(key, raw === 'S' ? 'S' : Number(raw), rot)
  }
  function handleTileClick(uid) {
    if (selected === 'erase') removeTrack(uid)
    else rotateTrack(uid)
  }

  // ---- 拖曳落點預覽(吸附到格子)----
  function clearDrag() {
    setDrag(null)
    setHoverCell(null)
  }
  // 從調色盤拖新板子:用目前的筆刷旋轉角度預覽
  const onDragTile = (id) => setDrag({ id, rot })
  // 搬移已放置的板子:沿用該板子自己的角度
  const onTileDragStart = (uid) => {
    const p = placed[uid]
    if (p) setDrag({ id: p.id, rot: p.rot, uid })
  }
  const onGridDragOver = (key) => setHoverCell((h) => (h === key ? h : key))
  // 拖曳結束:落在地圖外就移除(僅搬移既有板),都要清掉預覽
  const onTileDragEnd = (uid, droppedOutside) => {
    if (droppedOutside) removeTrack(uid)
    clearDrag()
  }

  // ---- 起點板 ----
  function placeStart(row) {
    setStartPos((p) => ({ row, rot: p?.rot ?? 90 }))
  }
  const handleStartCellClick = (row) => selected === 'start' && placeStart(row)
  const handleStartDrop = (row, raw) => (raw === 'start' || raw === 'move:start') && placeStart(row)
  function handleStartClick() {
    if (selected === 'erase') return setStartPos(null)
    setStartPos((p) => (p ? { ...p, rot: p.rot === 90 ? 270 : 90 } : p))
  }

  // ---- 🎲 自動規劃:用「目前抽到的 4 片」從頭規劃到尾(組數越少越好;可壓板走回頭路)----
  function autoTrack() {
    if (hand.length !== 4) {
      setPlanMsg('✗ 請先選滿 4 片板子再規劃')
      return
    }
    setPlanMsg('規劃中…(用 ' + hand.join('') + ' 循環,找最少組數)')
    setTimeout(() => {
      const cfg = GROUPS[group]
      const bonusCells = bonus.map((b) => ({ r: ROWS.indexOf(b.row), c: b.col - 1 }))
      const result = plan({
        baseSeed: Math.floor(Math.random() * 1e9),
        bonus: bonusCells,
        hand,
        timeLimitMs: 3500,
        includeS: cfg.includeS,
        sLast: cfg.sLast,
        buffer: aggressive ? 1 : 2,
      })
      if (!result) {
        setPlanMsg(`✗ 這手 ${hand.join('・')} 排不到終點(可能無解),請 🎰 重抽或再試一次`)
        return
      }
      const nextPlaced = {}
      const newSeq = []
      result.groups.forEach((g, gi) => {
        g.placed.forEach((p) => {
          const minR = Math.min(...p.cells.map((c) => c[0]))
          const minC = Math.min(...p.cells.map((c) => c[1]))
          const uid = 't' + uidRef.current++
          nextPlaced[uid] = {
            origin: cellKey(ROWS[minR], minC + 1),
            id: p.tileId,
            rot: p.rot,
            batch: batch + gi,
          }
          newSeq.push({ uid, id: p.tileId })
        })
      })
      const last = result.groups[result.groups.length - 1]
      const lastNums = last.placed.map((p) => p.tileId).filter((t) => t !== 'S') // 手牌名額只算數字片
      const roundSize = result.hand.length + (cfg.includeS ? 1 : 0) // 國小=4、國中/高中=5
      const partial = last.placed.length < roundSize

      setPlaced(nextPlaced)
      setStartPos({ row: ROWS[result.startRow], rot: 90 })
      setSeq(newSeq)
      if (partial) {
        setBatch(batch + result.groups.length - 1)
        setUsed(new Set(lastNums))
      } else {
        setBatch(batch + result.groups.length)
        setUsed(new Set())
      }
      setPlanMsg('') // 成功不顯示訊息
      startAnim(newSeq.length) // 規劃完播放:由起點至終點逐片排列
    }, 30)
  }

  // 動畫:由起點(第 0 步)往後,每片依序顯示;total = 1(起點)+ 片數
  function startAnim(tileCount) {
    if (animTimer.current) clearInterval(animTimer.current)
    const total = tileCount + 1
    setReveal(0)
    let r = 0
    animTimer.current = setInterval(() => {
      r += 1
      if (r >= total) {
        clearInterval(animTimer.current)
        animTimer.current = null
        setReveal(null) // 全部顯示
      } else {
        setReveal(r)
      }
    }, 110)
  }
  function stopAnim() {
    if (animTimer.current) clearInterval(animTimer.current)
    animTimer.current = null
    setReveal(null)
  }

  // 🎯 只重抽加分點(不動手牌與場地)
  function reBonus() {
    setBonus(drawBonus(GROUPS[group].cols))
  }

  // 切換組別:換加分點規則並清空重來(手動模式下手牌維持空白讓使用者挑)
  function applyGroup(g) {
    stopAnim()
    setGroup(g)
    setPlaced({})
    setStartPos(null)
    setUsed(new Set())
    setSeq([])
    setHand(mode === 'manual' ? [] : drawFour())
    setBonus(drawBonus(GROUPS[g].cols))
    setBatch((b) => b + 1)
    setPlanMsg('')
  }

  // 🎰 抽籤 = 4 片 + 加分點「一起」重抽(開新局,清空場地與記錄)
  function reDraw() {
    stopAnim()
    setPlaced({})
    setStartPos(null)
    setUsed(new Set())
    setSeq([])
    setHand(drawFour())
    setBonus(drawBonus(GROUPS[group].cols))
    setBatch((b) => b + 1)
    setPlanMsg('')
  }

  // 左右切換「抽籤 / 手動輸入」版本(都會清空場地開新局)
  function applyMode(m) {
    if (m === mode) return
    stopAnim()
    setMode(m)
    setPlaced({})
    setStartPos(null)
    setUsed(new Set())
    setSeq([])
    setBatch((b) => b + 1)
    setPlanMsg('')
    // 手動版本:把手牌全部清空,讓使用者自己挑;抽籤版本:隨機抽 4 片
    setHand(m === 'manual' ? [] : drawFour())
    if (m === 'draw') setBonus(drawBonus(GROUPS[group].cols))
  }
  // 手動模式:點 1-9 即時增刪手牌(最多 4 片,改動就清空場地重來)
  function toggleHandTile(n) {
    setHand((h) =>
      h.includes(n)
        ? h.filter((x) => x !== n)
        : h.length < 4
          ? [...h, n].sort((a, b) => a - b)
          : h
    )
    setPlaced({})
    setStartPos(null)
    setUsed(new Set())
    setSeq([])
    setBatch((b) => b + 1)
    setPlanMsg('')
  }
  // 手動模式:加分點欄位固定(由組別決定),只改列
  function setBonusRow(col, row) {
    setBonus((b) => b.map((x) => (x.col === col ? { ...x, row } : x)))
  }

  // 清空場地 = 只清掉放置與記錄,抽到的 4 片與加分點不變
  function clearField() {
    stopAnim()
    setPlaced({})
    setStartPos(null)
    setUsed(new Set())
    setSeq([])
    setBatch((b) => b + 1)
    setPlanMsg('')
  }

  useEffect(() => {
    if (typeof selected === 'number' && !available.has(selected)) setSelected('start')
  }, [available, selected])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'r' || e.key === 'R') setRot((v) => (v + 90) % 360)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const updateMeta = (field, value) => setMeta((p) => ({ ...p, [field]: value }))
  const selTile =
    selected === 'start' ? START_PLATE : selected === 'S' || typeof selected === 'number' ? TILE_BY_ID[selected] : null

  // 沿著埠鏈走一遍,一次算出:
  //   tokens — 每片的顯示資料(S 板含進/出臂標籤,如 R進M出)
  //   seams  — 每組結束處的紅槓(cell + side)
  // 跟著埠走(同 verify 邏輯),壓板也算得對;接不上之後的片以備援顯示。
  const chain = useMemo(() => {
    if (!startPos) return { tokens: [], seams: [] }
    const ordered = seq.map((e) => placed[e.uid]).filter(Boolean)
    if (ordered.length === 0) return { tokens: [], seams: [] }
    const geom = ordered.map((p) => {
      const [rowLetter, col] = parseKey(p.origin)
      return place(p.id, ROWS.indexOf(rowLetter), col - 1, p.rot)
    })
    const tokens = []
    const seams = []
    let need = { cell: [ROWS.indexOf(startPos.row), 0], side: 'L' }
    let i = 0
    for (; i < geom.length; i++) {
      const pl = geom[i]
      const p = ordered[i]
      const pin = pl.ports.findIndex(
        (pt) => pt.cell[0] === need.cell[0] && pt.cell[1] === need.cell[1] && pt.side === need.side
      )
      if (pin < 0) break // 接不上 → 後面改備援顯示
      let oi
      if (i === geom.length - 1) {
        oi = pl.ports.findIndex((o, idx) => idx !== pin && o.cell[1] >= FIELD_COLS)
        if (oi < 0) oi = pl.ports.findIndex((_, idx) => idx !== pin)
      } else {
        const nextPl = geom[i + 1]
        oi = pl.ports.findIndex(
          (o, idx) =>
            idx !== pin &&
            nextPl.ports.some((q) => q.cell[0] === o.exit[0] && q.cell[1] === o.exit[1] && q.side === OPPOSITE[o.side])
        )
        if (oi < 0) break
      }
      const out = pl.ports[oi]
      const tok = { id: p.id, vertical: p.rot % 180 === 0, batch: p.batch }
      if (p.id === 'S') {
        tok.sEntry = S_PORT_LABELS[pin]
        tok.sExit = S_PORT_LABELS[oi]
      }
      tokens.push(tok)
      const lastOfGroup = i === geom.length - 1 || ordered[i + 1].batch !== p.batch
      if (lastOfGroup) seams.push({ ri: out.cell[0], ci: out.cell[1], side: out.side })
      need = { cell: out.exit, side: OPPOSITE[out.side] }
    }
    for (; i < ordered.length; i++) {
      const p = ordered[i]
      tokens.push({ id: p.id, vertical: p.rot % 180 === 0, batch: p.batch }) // 備援(無進出資訊)
    }
    return { tokens, seams }
  }, [placed, seq, startPos])

  const groupSeams = chain.seams

  // 使用組合:照 batch 分組,輪與輪之間放分隔線
  const flowChips = useMemo(() => {
    const rounds = []
    let curBatch = null
    let cur = null
    for (const t of chain.tokens) {
      if (t.batch !== curBatch) {
        cur = []
        rounds.push(cur)
        curBatch = t.batch
      }
      cur.push(t)
    }
    return rounds
  }, [chain])

  // 動畫可見性:reveal=null → 全部顯示;否則 reveal 步 = 起點(步 1)+ 前 (reveal-1) 片
  const anim = useMemo(() => {
    if (reveal === null) return { all: true, startVisible: true, vis: null }
    return {
      all: false,
      startVisible: reveal >= 1,
      vis: new Set(seq.slice(0, Math.max(0, reveal - 1)).map((e) => e.uid)),
    }
  }, [reveal, seq])

  // 卸載時清掉動畫計時器
  useEffect(() => () => animTimer.current && clearInterval(animTimer.current), [])

  const groupRule = GROUPS[group].includeS
    ? GROUPS[group].sLast
      ? '每組 4 抽 + S(S 必須最後)'
      : '每組 4 抽 + S(順序不限)'
    : '每組 4 抽(無 S 板)'

  return (
    <div className="app">
      <Header
        group={group}
        groupRule={groupRule}
        mode={mode}
        aggressive={aggressive}
        ready={hand.length === 4}
      />

      <section className="control-panel">
        {/* 1. 遊戲設定 */}
        <Card title="遊戲設定" className="cp-card">
          <div className="seg seg-3" role="tablist">
            {['國小', '國中', '高中'].map((g) => (
              <button
                key={g}
                type="button"
                className={`seg-btn ${group === g ? 'on' : ''}`}
                onClick={() => applyGroup(g)}
              >
                {g}
              </button>
            ))}
          </div>
          <Button variant="outline" active={showInfo} onClick={() => setShowInfo((v) => !v)}>
            {showInfo ? '隱藏資訊欄' : '顯示資訊欄'}
          </Button>
          <p className="cp-hint">{groupRule}</p>
        </Card>

        {/* 2. 抽籤模式 */}
        <Card title="抽籤模式" className="cp-card">
          <div className="seg seg-2" role="tablist">
            <button
              type="button"
              className={`seg-btn ${mode === 'draw' ? 'on' : ''}`}
              onClick={() => applyMode('draw')}
            >
              抽籤
            </button>
            <button
              type="button"
              className={`seg-btn ${mode === 'manual' ? 'on' : ''}`}
              onClick={() => applyMode('manual')}
            >
              手動輸入
            </button>
          </div>
          <div className="cp-actions">
            {mode === 'draw' && (
              <Button variant="primary" onClick={reDraw}>
                抽籤
              </Button>
            )}
            <Button variant="outline" onClick={reBonus}>
              重新加分點
            </Button>
          </div>

          {mode === 'draw' ? (
            <div className="cp-results">
              <div className="result-row">
                <span className="result-label">抽到板子</span>
                <span className="chips">
                  {hand.map((t) => (
                    <Badge key={t} tone={tileStatus[t] !== 'ok' ? 'muted' : 'dark'}>
                      {t}
                    </Badge>
                  ))}
                </span>
                <Badge tone="info">本輪已放 {used.size}/4</Badge>
              </div>
              <div className="result-row">
                <span className="result-label">抽到加分點</span>
                <span className="chips">
                  {bonus.map((b) => (
                    <Badge key={b.col} tone="warning">
                      {b.row}
                      {b.col}
                    </Badge>
                  ))}
                </span>
              </div>
            </div>
          ) : (
            <div className="cp-results">
              <div className="result-row">
                <span className="result-label">選板子</span>
                <span className="pick-row">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
                    const on = hand.includes(n)
                    return (
                      <button
                        key={n}
                        type="button"
                        className={`pick ${on ? 'on' : ''}`}
                        disabled={!on && hand.length >= 4}
                        onClick={() => toggleHandTile(n)}
                      >
                        {n}
                      </button>
                    )
                  })}
                </span>
                <Badge tone="info">已選 {hand.length}/4</Badge>
              </div>
              <div className="result-row">
                <span className="result-label">選加分點</span>
                <span className="bonus-pickers">
                  {bonus.map((b) => (
                    <label key={b.col} className="bonus-picker">
                      <span>第 {b.col} 欄</span>
                      <select value={b.row} onChange={(e) => setBonusRow(b.col, e.target.value)}>
                        {BONUS_ROW_CHOICES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </span>
              </div>
            </div>
          )}
        </Card>

        {/* 3. 地圖工具 */}
        <Card title="地圖工具" className="cp-card">
          <div className="cp-actions">
            <Button variant="outline" onClick={() => setRot((v) => (v + 90) % 360)}>
              旋轉筆刷 {rot}°
            </Button>
            <Button
              variant="warning"
              active={aggressive}
              onClick={() => setAggressive((v) => !v)}
              title="緩衝由 2 片改成 1 片:板子能更快重複使用,規劃通常組數更少(較激進)"
            >
              激進模式：{aggressive ? '開' : '關'}
            </Button>
            <Button variant="primary" disabled={hand.length !== 4} onClick={autoTrack}>
              自動規劃
            </Button>
            <Button variant="danger" onClick={clearField}>
              清空場地
            </Button>
          </div>
          {planMsg && <p className="plan-msg">{planMsg}</p>}
          {mode === 'manual' && selTile && (
            <div className="brush-preview" title="放置方向預覽">
              <div
                className="tile-rot"
                style={
                  selected === 'start'
                    ? { width: '1.4rem', height: '2.8rem', transform: 'rotate(90deg)' }
                    : { width: '1.6rem', height: `calc(1.6rem * ${selTile.h})`, transform: `rotate(${rot}deg)` }
                }
              >
                <Tile tile={selTile} />
              </div>
            </div>
          )}
        </Card>
      </section>

      {showInfo && (
        <Card className="meta-card" bodyClass="meta-body">
          <label className="meta-field">
            <span>校名</span>
            <input value={meta.school} onChange={(e) => updateMeta('school', e.target.value)} />
          </label>
          <label className="meta-field">
            <span>隊名</span>
            <input value={meta.team} onChange={(e) => updateMeta('team', e.target.value)} />
          </label>
          <label className="meta-field">
            <span>選手簽名</span>
            <input value={meta.player} onChange={(e) => updateMeta('player', e.target.value)} />
          </label>
        </Card>
      )}

      <BoardMap>
        <TrackGrid
          placed={placed}
          startPos={startPos}
          bonus={bonus}
          groupSeams={reveal === null ? groupSeams : []}
          anim={anim}
          drag={drag}
          hoverCell={hoverCell}
          onGridCellClick={handleGridCellClick}
          onGridDrop={handleGridDrop}
          onGridDragOver={onGridDragOver}
          onGridLeave={() => setHoverCell(null)}
          onTileClick={handleTileClick}
          onTileContext={removeTrack}
          onTileDragStart={onTileDragStart}
          onTileDragEnd={onTileDragEnd}
          onStartCellClick={handleStartCellClick}
          onStartDrop={handleStartDrop}
          onStartClick={handleStartClick}
          onStartContext={() => setStartPos(null)}
        />
      </BoardMap>

      <StrategySequence rounds={flowChips} />

      <Card
        title="板子工具盤"
        subtitle="拖曳或點選板子放到地圖；左鍵旋轉、右鍵移除、拖出地圖移除"
        className="palette-card"
        bodyClass="palette-body"
      >
        <TilePalette
          selected={selected}
          onSelect={setSelected}
          tileStatus={tileStatus}
          brushRot={rot}
          showS={GROUPS[group].includeS}
          onDragTile={onDragTile}
          onDragTileEnd={clearDrag}
        />
      </Card>
    </div>
  )
}
