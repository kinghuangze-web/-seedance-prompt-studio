import { useEffect, useMemo, useState } from 'react'
import './App.css'

type Mode = 'simple' | 'pro'
type MaterialType = '图片' | '视频' | '音频'
type PromptType = '短剧片段' | '产品广告' | '科普动画' | '自定义模式'
type DonatePlatform = '爱发电' | 'Ko-fi' | 'Buy Me a Coffee' | '其他'
type ApiProvider = 'OpenAI兼容' | '自定义'

type MaterialItem = { id: string; type: MaterialType; name: string; purpose: string; fileName?: string }
type Segment = { id: string; time: string; visual: string; action: string; camera: string; audio: string }

type AppState = {
  title: string
  mode: Mode
  promptType: PromptType
  duration: number
  subjectScene: string
  materialsLine: string
  cameraAction: string
  styleAudio: string
  materials: MaterialItem[]
  segments: Segment[]
}

type UsageState = {
  date: string
  dailyCount: number
  totalCount: number
}

type ApiConfig = {
  provider: ApiProvider
  apiKey: string
  baseUrl: string
  model: string
  persistKey: boolean
}

const storageKey = 'zhexin-seedance-mvp-v2'
const donateStorageKey = 'zhexin-donate-config-v1'
const usageStorageKey = 'zhexin-usage-v1'
const apiStorageKey = 'zhexin-api-config-v1'
const freeDailyLimit = 5
const monetizationEnabled = false

const defaultDonateConfig: { platform: DonatePlatform; url: string } = { platform: '爱发电', url: '' }
const defaultApiConfig: ApiConfig = {
  provider: 'OpenAI兼容',
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4.1-mini',
  persistKey: false,
}

const presets: Record<PromptType, Omit<AppState, 'title' | 'mode'>> = {
  短剧片段: {
    promptType: '短剧片段',
    duration: 15,
    subjectScene: '雨夜桥边，情侣争执后揭开误会，情绪从愤怒到崩溃再到沉默。',
    materialsLine: '如有素材可补充：@图片1 角色形象，@视频1 运镜参考，@音频1 BGM参考。',
    cameraAction: '开场面部特写，中段跟拍后拉，高潮慢推定格。',
    styleAudio: '电影级质感，冷蓝色调，雨声与呼吸声清晰。',
    materials: [],
    segments: [
      { id: crypto.randomUUID(), time: '0-5秒', visual: '角色A眼眶通红，雨水滑过脸颊。', action: '抬手指向对方，情绪接近崩溃。', camera: '面部特写慢推。', audio: '雨声+低频鼓点。' },
      { id: crypto.randomUUID(), time: '6-10秒', visual: '角色B递出证据，路灯暖色反差。', action: '急促解释，双手微颤。', camera: '跟拍后拉再回手部特写。', audio: '钢琴节奏加快。' },
      { id: crypto.randomUUID(), time: '11-15秒', visual: '角色A愣住，远景只剩桥灯。', action: '眼神从怒意转为空洞。', camera: '缓慢后拉定格。', audio: '音乐留白收束。' },
    ],
  },
  产品广告: {
    promptType: '产品广告',
    duration: 15,
    subjectScene: '黑色展台展示金属蓝运动水杯，突出轻量与保温。',
    materialsLine: '如有素材可补充：@图片1 产品外观，@视频1 镜头节奏，@音频1 BGM。',
    cameraAction: '开场旋转特写，中段拆解展示，结尾品牌定格。',
    styleAudio: '高对比棚拍，镜面反射清晰，节奏卡点。',
    materials: [],
    segments: [
      { id: crypto.randomUUID(), time: '0-3秒', visual: '产品从黑暗中被冷光勾勒。', action: '悬浮并旋转。', camera: '极近特写慢推。', audio: '低频电子音起势。' },
      { id: crypto.randomUUID(), time: '4-8秒', visual: '杯盖拆解，结构可视化。', action: '分离后精准回组。', camera: '环绕镜头+俯拍。', audio: '机械咔哒声。' },
      { id: crypto.randomUUID(), time: '9-15秒', visual: '产品完整定格，品牌字样浮现。', action: '水雾从后方散开。', camera: '缓慢拉远英雄镜头。', audio: '音乐推向高潮后收束。' },
    ],
  },
  科普动画: {
    promptType: '科普动画',
    duration: 15,
    subjectScene: '半透明人体动脉演示糖脂进入血液后的变化过程。',
    materialsLine: '如有素材可补充：@图片1 首帧，@视频1 运镜参考，@音频1 旁白节奏。',
    cameraAction: '先推进动脉，再跟随血流，最后做前后对比。',
    styleAudio: '医学CG风格，冷色调，旁白克制清晰。',
    materials: [],
    segments: [
      { id: crypto.randomUUID(), time: '0-5秒', visual: '蓝色半透明人体，血液顺畅流动。', action: '镜头沿血管推进。', camera: '慢推镜头。', audio: '旁白介绍基础状态。' },
      { id: crypto.randomUUID(), time: '6-10秒', visual: '糖脂颗粒进入并附着内壁。', action: '血液逐渐变浑浊。', camera: '跟拍血流路径。', audio: '轻微警示提示音。' },
      { id: crypto.randomUUID(), time: '11-15秒', visual: '左右分屏展示之前vs现在。', action: '字幕给出健康建议。', camera: '拉远到全局对比。', audio: '旁白总结收束。' },
    ],
  },
  自定义模式: {
    promptType: '自定义模式',
    duration: 10,
    subjectScene: '一位旅行者穿过霓虹雨夜城市，误入漂浮在空中的图书馆，最终在晨光中走出镜像之门。',
    materialsLine: '可自由上传素材并自定义@引用用途：首帧、动作、运镜、音频均可指定。',
    cameraAction: '开场建立镜头，中段情绪跟拍，高潮使用环绕或希区柯克变焦，结尾慢拉定格。',
    styleAudio: '风格不设限：可电影感、二次元、科幻、纪录片或实验影像。',
    materials: [],
    segments: [
      { id: crypto.randomUUID(), time: '0-3秒', visual: '快速建立世界观。', action: '主体出场并给出核心冲突。', camera: '建立镜头或低角度仰拍。', audio: '氛围音起势。' },
      { id: crypto.randomUUID(), time: '3-7秒', visual: '冲突推进。', action: '动作与情绪升级。', camera: '跟拍或环绕镜头。', audio: '节奏增强并加入关键音效。' },
      { id: crypto.randomUUID(), time: '7-10秒', visual: '结果与反转。', action: '完成情绪收束。', camera: '慢推或后拉定格。', audio: '留白或短促收束。' },
    ],
  },
}

const simpleToneMap: Record<PromptType, string> = {
  短剧片段: '情绪层层递进，冲突清晰，结尾留有反转余味。',
  产品广告: '突出材质、功能与品牌记忆点，节奏干净有力。',
  科普动画: '信息可视化清晰，过程因果明确，旁白克制易懂。',
  自定义模式: '创意优先，允许跨风格混合与非常规叙事。',
}

const cameraLexicon: Record<PromptType, string[]> = {
  短剧片段: ['面部特写', '跟拍', '慢推镜头', '后拉镜头', '低角度仰拍'],
  产品广告: ['环绕镜头', '极近特写', '俯拍', '机械臂跟随', '慢推镜头'],
  科普动画: ['慢推镜头', '跟拍', '俯拍', '中景', '建立镜头'],
  自定义模式: ['建立镜头', '环绕镜头', '希区柯克变焦', '第一人称主观视角', '机械臂跟随'],
}

const styleLexicon: Record<PromptType, string[]> = {
  短剧片段: ['电影级质感，胶片颗粒，浅景深', '冷暖对比，情绪压迫感', '紧张悬疑，台词前留白'],
  产品广告: ['高对比棚拍，金属材质高光清晰', '2.35:1宽银幕，24fps', '动感产品特效展示'],
  科普动画: ['超逼真4K医学CGI，半透明可视化', '纪录片风格，旁白克制', '对比画面强调“之前 vs 现在”'],
  自定义模式: ['电影级质感，胶片颗粒，浅景深', '高饱和霓虹色调，冷暖对比', '暗黑奇幻或超现实拼贴风格'],
}

const audioLexicon: Record<PromptType, string[]> = {
  短剧片段: ['脚步声、呼吸声、衣料摩擦声清晰并贴合节拍', '钢琴低频垫底，转场处加轻微冲击音'],
  产品广告: ['电子节拍卡点，产品交互音效清脆', '品牌定格时音乐短促收束'],
  科普动画: ['旁白清晰克制，背景氛围音不过载', '关键转折处加入轻微提示音'],
  自定义模式: ['转场画面与音乐节奏卡点', '脚步声、呼吸声、衣料摩擦声清晰并贴合节拍'],
}

function pickBySeed(source: string, list: string[], count: number): string[] {
  if (list.length <= count) return list
  const seed = Array.from(source).reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const picked: string[] = []
  for (let i = 0; i < list.length && picked.length < count; i += 1) {
    const idx = (seed + i * 7) % list.length
    const candidate = list[idx]
    if (!picked.includes(candidate)) picked.push(candidate)
  }
  return picked
}

function buildTimeRanges(duration: number): string[] {
  if (duration <= 6) {
    const mid = Math.max(2, Math.floor(duration / 2))
    return [`0-${mid}秒`, `${mid}-${duration}秒`]
  }
  if (duration <= 10) {
    const a = Math.max(2, Math.floor(duration * 0.35))
    const b = Math.max(a + 2, Math.floor(duration * 0.7))
    return [`0-${a}秒`, `${a}-${b}秒`, `${b}-${duration}秒`]
  }
  const a = 3
  const b = Math.max(a + 3, Math.floor(duration * 0.55))
  const c = Math.max(b + 2, duration - 2)
  return [`0-${a}秒`, `${a}-${b}秒`, `${b}-${c}秒`, `${c}-${duration}秒`]
}

const initialState: AppState = { title: '豆包即梦_Seedance提示词', mode: 'simple', ...presets['短剧片段'] }

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function extractDurationFromText(text: string): number | null {
  const normalized = text.replace(/\s+/g, '')
  const patterns = [/(\d{1,2})s\b/i, /(\d{1,2})秒/, /(\d{1,2})sec\b/i]
  for (const pattern of patterns) {
    const match = normalized.match(pattern)
    if (!match) continue
    const parsed = Number(match[1])
    if (Number.isNaN(parsed)) continue
    return Math.min(15, Math.max(4, parsed))
  }
  return null
}

function App() {
  const [s, setS] = useState<AppState>(() => {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return initialState
    try {
      return JSON.parse(raw) as AppState
    } catch {
      localStorage.removeItem(storageKey)
      return initialState
    }
  })
  const [simpleIdea, setSimpleIdea] = useState(initialState.subjectScene)
  const [copied, setCopied] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)
  const [showApiModal, setShowApiModal] = useState(false)
  const [showDisclaimer, setShowDisclaimer] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [enhancedPrompt, setEnhancedPrompt] = useState('')

  const [usage, setUsage] = useState<UsageState>(() => {
    const today = getTodayKey()
    const raw = localStorage.getItem(usageStorageKey)
    if (!raw) return { date: today, dailyCount: 0, totalCount: 0 }
    try {
      const parsed = JSON.parse(raw) as UsageState
      if (parsed.date !== today) return { ...parsed, date: today, dailyCount: 0 }
      return parsed
    } catch {
      return { date: today, dailyCount: 0, totalCount: 0 }
    }
  })

  const [donateConfig, setDonateConfig] = useState<{ platform: DonatePlatform; url: string }>(() => {
    const raw = localStorage.getItem(donateStorageKey)
    if (!raw) return defaultDonateConfig
    try {
      return JSON.parse(raw) as { platform: DonatePlatform; url: string }
    } catch {
      localStorage.removeItem(donateStorageKey)
      return defaultDonateConfig
    }
  })

  const [apiConfig, setApiConfig] = useState<ApiConfig>(() => {
    const localRaw = localStorage.getItem(apiStorageKey)
    const sessionRaw = sessionStorage.getItem(apiStorageKey)
    try {
      if (sessionRaw) return JSON.parse(sessionRaw) as ApiConfig
      if (localRaw) return JSON.parse(localRaw) as ApiConfig
    } catch {
      // ignore parsing errors
    }
    return defaultApiConfig
  })

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(s))
  }, [s])

  useEffect(() => {
    localStorage.setItem(donateStorageKey, JSON.stringify(donateConfig))
  }, [donateConfig])

  useEffect(() => {
    localStorage.setItem(usageStorageKey, JSON.stringify(usage))
  }, [usage])

  useEffect(() => {
    const payload = JSON.stringify(apiConfig)
    if (apiConfig.persistKey) {
      localStorage.setItem(apiStorageKey, payload)
      sessionStorage.removeItem(apiStorageKey)
    } else {
      localStorage.setItem(apiStorageKey, JSON.stringify({ ...apiConfig, apiKey: '' }))
      sessionStorage.setItem(apiStorageKey, payload)
    }
  }, [apiConfig])

  const donateUrl = useMemo(() => {
    const raw = donateConfig.url.trim()
    if (!raw) return ''
    return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  }, [donateConfig.url])

  const canDonate = /^https?:\/\/.+/i.test(donateUrl)

  const warnings = useMemo(() => {
    const out: string[] = []
    if (s.duration < 4 || s.duration > 15) {
      out.push('时长需在 4-15 秒内。')
    }

    if (s.mode === 'simple') {
      if (!simpleIdea.trim()) {
        out.push('请先用一句自然语言描述你想做的视频。')
      }
      return out
    }

    const cnt = { 图片: 0, 视频: 0, 音频: 0 }
    s.materials.forEach((m) => (cnt[m.type] += 1))
    if (cnt.图片 > 9 || cnt.视频 > 3 || cnt.音频 > 3 || s.materials.length > 12) {
      out.push('素材数量超限（图片<=9，视频<=3，音频<=3，总数<=12）。')
    }
    if (s.materials.some((m) => !m.purpose.trim())) {
      out.push('存在素材未分配用途，请补充每个@引用作用。')
    }

    const refText = `${s.materialsLine} ${s.cameraAction}`
    if (/参考\s*@视频\d+/u.test(refText) && !/(运镜|动作|特效|节奏|音色|音效)/u.test(refText)) {
      out.push('“参考@视频”描述过于模糊，请写清参考维度。')
    }
    if (s.segments.some((seg) => seg.camera.includes('固定镜头') && seg.camera.includes('环绕镜头'))) {
      out.push('检测到镜头冲突：固定镜头与环绕镜头同时出现。')
    }
    if (!s.styleAudio.trim()) {
      out.push('建议补充音频设计，提升出片质量。')
    }

    return out
  }, [s, simpleIdea])

  const prompt = useMemo(() => {
    const idea = simpleIdea.trim() || s.subjectScene
    const safeDuration = Math.min(15, Math.max(4, s.duration))

    const materialLines =
      s.mode === 'simple'
        ? '素材可选。若你上传了参考图/视频/音频，可在 Seedance 中分别作为 @图片1 / @视频1 / @音频1 使用。'
        : s.materials
            .map((m, idx) => `${idx + 1}. ${m.type} ${m.name || m.fileName || '未命名'}：${m.purpose || '请补充用途'}`)
            .join('\n') || '暂无素材。'

    const pickedCameras = pickBySeed(idea + s.promptType, cameraLexicon[s.promptType], 3)
    const pickedStyles = pickBySeed(idea + s.promptType + 'style', styleLexicon[s.promptType], 2)
    const pickedAudios = pickBySeed(idea + s.promptType + 'audio', audioLexicon[s.promptType], 2)

    const ranges = buildTimeRanges(safeDuration)
    const simpleSegments = ranges
      .map((range, idx) => {
        const cam = pickedCameras[idx % pickedCameras.length]
        const sty = pickedStyles[idx % pickedStyles.length]
        const aud = pickedAudios[idx % pickedAudios.length]
        const stageName = idx === 0 ? '开场建立' : idx === ranges.length - 1 ? '收束定格' : `推进段${idx}`
        return `${range}【${stageName}】\n- 画面围绕“${idea}”展开，动作与情绪持续推进。\n- 运镜建议：${cam}。\n- 风格建议：${sty}。\n- 音频建议：${aud}。`
      })
      .join('\n\n')

    const simpleCore = `你要生成一条 ${safeDuration} 秒的${s.promptType}视频。\n核心创意：${idea}\n叙事基调：${simpleToneMap[s.promptType]}\n\n分段脚本：\n${simpleSegments}\n\n整体风格补充：${pickedStyles.join('；')}。`

    const proCore = s.segments
      .map((seg) => `${seg.time}\n画面：${seg.visual}\n动作：${seg.action}\n运镜：${seg.camera}\n音频：${seg.audio}`)
      .join('\n\n')

    return `${s.title} ${safeDuration}秒提示词\n\n【素材与引用】\n${materialLines}\n\n【核心描述】\n${s.mode === 'simple' ? simpleCore : proCore}\n\n【风格修饰词建议】\n${pickedStyles.join('；')}。\n\n【音频指导建议】\n${pickedAudios.join('；')}。\n\n【使用建议】\n1. 先直接生成一版，观察动作与镜头是否连贯。\n2. 如果节奏过快，优先延长时长；如果画面不稳，减少运镜种类。\n3. 需要强控制时，切换进阶模式补充 @引用 与分时段细节。`
  }, [s, simpleIdea])

  const finalPrompt = enhancedPrompt || prompt

  const recordUsage = () => {
    const today = getTodayKey()
    setUsage((prev) => {
      const base = prev.date === today ? prev : { ...prev, date: today, dailyCount: 0 }
      return { ...base, dailyCount: base.dailyCount + 1, totalCount: base.totalCount + 1 }
    })
  }

  const ensureQuotaOrShowPaywall = (): boolean => {
    if (!monetizationEnabled) return true
    const today = getTodayKey()
    const current = usage.date === today ? usage.dailyCount : 0
    if (current >= freeDailyLimit) {
      setShowPaywall(true)
      return false
    }
    return true
  }

  const runAiEnhance = async () => {
    if (!ensureQuotaOrShowPaywall()) return
    setAiError('')
    setEnhancedPrompt('')
    const key = apiConfig.apiKey.trim()
    if (!key) {
      setAiError('请先填写 API Key，再使用 AI 增强。')
      return
    }
    const base = apiConfig.baseUrl.trim().replace(/\/+$/, '')
    if (!/^https?:\/\//i.test(base)) {
      setAiError('Base URL 格式不正确，请以 http:// 或 https:// 开头。')
      return
    }

    setAiLoading(true)
    try {
      const response = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: apiConfig.model,
          temperature: 0.7,
          messages: [
            {
              role: 'system',
              content: '你是 Seedance 提示词优化助手。请输出中文自然语言提示词，确保时长与用户输入一致，并给出分段、镜头、音频建议。',
            },
            { role: 'user', content: prompt },
          ],
        }),
      })

      if (!response.ok) {
        const detail = await response.text()
        throw new Error(`请求失败：${response.status} ${detail.slice(0, 120)}`)
      }

      const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
      const content = data.choices?.[0]?.message?.content?.trim()
      if (!content) throw new Error('模型返回为空，请重试。')
      setEnhancedPrompt(content)
      recordUsage()
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'AI 调用失败')
    } finally {
      setAiLoading(false)
    }
  }

  const applyPreset = (p: PromptType) => {
    setS((prev) => ({ ...prev, ...presets[p], promptType: p, title: `豆包即梦_${p}_提示词` }))
    setSimpleIdea(presets[p].subjectScene)
    setEnhancedPrompt('')
  }

  const runSimpleGenerate = () => {
    if (!ensureQuotaOrShowPaywall()) return
    const idea = simpleIdea.trim()
    if (!idea) {
      window.alert('先写一句你想做的视频内容，再点一键生成。')
      return
    }
    const detectedDuration = extractDurationFromText(idea)
    setS((prev) => ({
      ...prev,
      duration: detectedDuration ?? prev.duration,
      subjectScene: idea,
      cameraAction: presets[prev.promptType].cameraAction,
      styleAudio: presets[prev.promptType].styleAudio,
      materialsLine: presets[prev.promptType].materialsLine,
    }))
    setEnhancedPrompt('')
    recordUsage()
  }

  const addMaterial = () => {
    setS((prev) => ({ ...prev, materials: [...prev.materials, { id: crypto.randomUUID(), type: '图片', name: '', purpose: '', fileName: '' }] }))
  }

  const updateMaterialFile = (id: string, file?: File) => {
    setS((prev) => ({
      ...prev,
      materials: prev.materials.map((item) => {
        if (item.id !== id) return item
        if (!file) return { ...item, fileName: '' }
        const autoPurpose = item.type === '图片' ? '作为人物或场景参考' : item.type === '视频' ? '参考动作或运镜节奏' : '参考背景音乐或音效节奏'
        return {
          ...item,
          fileName: file.name,
          name: item.name || file.name,
          purpose: item.purpose || autoPurpose,
        }
      }),
    }))
  }

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(finalPrompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  const openDonateLink = () => {
    if (!canDonate) return
    window.open(donateUrl, '_blank', 'noopener,noreferrer')
  }

  const download = (name: string, content: string, type: string) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page">
      <header className="hero card">
        <div>
          <p className="brand">豆包即梦</p>
          <h1>豆包即梦 Seedance 2 Prompt Studio</h1>
          <p className="subtitle">默认给新手：你只要说想法，我来帮你组织成可用提示词。</p>
        </div>
        <div className="heroActions">
          <button className="ghostButton" onClick={() => applyPreset('短剧片段')}>一键示例</button>
          <button className="ghostButton" onClick={() => setShowApiModal(true)}>设置</button>
          {canDonate && <button className="donateButton" onClick={openDonateLink}>支持作者</button>}
        </div>
      </header>

      <section className="quickBar card">
        <div className="quickMeta">
          <span className="freeTag">完全免费，无次数限制</span>
        </div>
      </section>

      <section className="toolbar card">
        <input value={s.title} onChange={(e) => setS({ ...s, title: e.target.value })} placeholder="项目名称" />
        <select value={s.promptType} onChange={(e) => applyPreset(e.target.value as PromptType)}>
          <option>短剧片段</option>
          <option>产品广告</option>
          <option>科普动画</option>
          <option>自定义模式</option>
        </select>
        <div className="timeField">
          <label>视频时长（秒）</label>
          <input type="number" min={4} max={15} value={s.duration} onChange={(e) => setS({ ...s, duration: Number(e.target.value) })} />
        </div>
        <div className="modeSwitch">
          <button className={s.mode === 'simple' ? 'activeTab' : ''} onClick={() => setS({ ...s, mode: 'simple' })}>极简模式</button>
          <button className={s.mode === 'pro' ? 'activeTab' : ''} onClick={() => setS({ ...s, mode: 'pro' })}>进阶模式</button>
        </div>
      </section>

      {s.mode === 'simple' ? (
        <main className="simpleLayout">
          <section className="card panel">
            <h2>告诉我你想做什么视频</h2>
            <p className="helper">用自然语言写一句就够。系统会自动解析时长（如10s/10秒）并生成分段镜头建议。</p>
            <textarea className="ideaInput" rows={8} value={simpleIdea} onChange={(e) => setSimpleIdea(e.target.value)} placeholder="直接写你的想法，不用管专业术语。" />
            <div className="actionRow">
              <button onClick={runSimpleGenerate}>一键生成提示词（本地智能）</button>
              <button className="ghostButton" onClick={() => setSimpleIdea('')}>清空</button>
            </div>
          </section>

          <section className="card panel">
            <h2>生成结果</h2>
            {aiError ? <p className="warn">{aiError}</p> : null}
            <div className="warningBox">
              {warnings.length ? warnings.map((w) => <p key={w} className="warn">{w}</p>) : <p className="safe">结构已就绪，可直接复制到 Seedance 2。</p>}
            </div>
            <textarea className="promptOutput" rows={20} value={finalPrompt} readOnly />
            <div className="actionRow">
              <button onClick={copyPrompt}>{copied ? '已复制' : '复制提示词'}</button>
              <button className="ghostButton" onClick={runAiEnhance} disabled={aiLoading}>{aiLoading ? 'AI增强中...' : 'AI增强生成'}</button>
              <button onClick={() => download(`${s.title}.txt`, finalPrompt, 'text/plain;charset=utf-8')}>下载TXT</button>
              <button onClick={() => download(`${s.title}.json`, JSON.stringify(s, null, 2), 'application/json;charset=utf-8')}>导出JSON</button>
            </div>
          </section>
        </main>
      ) : (
        <main className="layout">
          <section className="card panel">
            <h2>素材与引用</h2>
            {s.materials.map((m, idx) => (
              <div className="materialRow" key={m.id}>
                <span className="materialTag">@{m.type}{idx + 1}</span>
                <select value={m.type} onChange={(e) => setS({ ...s, materials: s.materials.map((x) => (x.id === m.id ? { ...x, type: e.target.value as MaterialType } : x)) })}>
                  <option>图片</option><option>视频</option><option>音频</option>
                </select>
                <input value={m.name} placeholder="素材名称" onChange={(e) => setS({ ...s, materials: s.materials.map((x) => (x.id === m.id ? { ...x, name: e.target.value } : x)) })} />
                <input value={m.purpose} placeholder="用途（例：参考@视频1运镜）" onChange={(e) => setS({ ...s, materials: s.materials.map((x) => (x.id === m.id ? { ...x, purpose: e.target.value } : x)) })} />
                <input
                  type="file"
                  accept={m.type === '图片' ? 'image/*' : m.type === '视频' ? 'video/*' : 'audio/*'}
                  onChange={(e) => updateMaterialFile(m.id, e.target.files?.[0])}
                />
                <small className="fileHint">{m.fileName ? `已选择：${m.fileName}` : '可选：上传素材文件，自动补全名称与用途'}</small>
              </div>
            ))}
            <button className="ghostButton" onClick={addMaterial}>+ 添加素材</button>
          </section>

          <section className="card panel">
            <h2>进阶分时段编辑</h2>
            {s.segments.map((seg) => (
              <div className="segmentCard" key={seg.id}>
                <input value={seg.time} onChange={(e) => setS({ ...s, segments: s.segments.map((x) => (x.id === seg.id ? { ...x, time: e.target.value } : x)) })} />
                <textarea rows={2} value={seg.visual} onChange={(e) => setS({ ...s, segments: s.segments.map((x) => (x.id === seg.id ? { ...x, visual: e.target.value } : x)) })} placeholder="画面" />
                <textarea rows={2} value={seg.action} onChange={(e) => setS({ ...s, segments: s.segments.map((x) => (x.id === seg.id ? { ...x, action: e.target.value } : x)) })} placeholder="动作" />
                <textarea rows={2} value={seg.camera} onChange={(e) => setS({ ...s, segments: s.segments.map((x) => (x.id === seg.id ? { ...x, camera: e.target.value } : x)) })} placeholder="运镜" />
                <textarea rows={2} value={seg.audio} onChange={(e) => setS({ ...s, segments: s.segments.map((x) => (x.id === seg.id ? { ...x, audio: e.target.value } : x)) })} placeholder="音频" />
              </div>
            ))}
          </section>

          <section className="card panel">
            <h2>实时提示词与校验</h2>
            {aiError ? <p className="warn">{aiError}</p> : null}
            <div className="warningBox">
              {warnings.length ? warnings.map((w) => <p key={w} className="warn">{w}</p>) : <p className="safe">校验通过，可直接使用。</p>}
            </div>
            <textarea className="promptOutput" rows={20} value={finalPrompt} readOnly />
            <div className="actionRow">
              <button onClick={copyPrompt}>{copied ? '已复制' : '复制提示词'}</button>
              <button className="ghostButton" onClick={runAiEnhance} disabled={aiLoading}>{aiLoading ? 'AI增强中...' : 'AI增强生成'}</button>
              <button onClick={() => download(`${s.title}.txt`, finalPrompt, 'text/plain;charset=utf-8')}>下载TXT</button>
              <button onClick={() => download(`${s.title}.json`, JSON.stringify(s, null, 2), 'application/json;charset=utf-8')}>导出JSON</button>
            </div>
          </section>
        </main>
      )}

      {showApiModal ? (
        <div className="modalMask" onClick={() => setShowApiModal(false)}>
          <div className="modalCard large" onClick={(e) => e.stopPropagation()}>
            <h3>设置</h3>
            
            <h4 style={{margin: '1rem 0 0.5rem'}}>API 配置</h4>
            <p className="helper">用于 AI 增强生成功能。默认不需要填写也能使用本地智能生成。</p>
            <div className="apiModalGrid">
              <select value={apiConfig.provider} onChange={(e) => setApiConfig((prev) => ({ ...prev, provider: e.target.value as ApiProvider }))}>
                <option>OpenAI兼容</option>
                <option>自定义</option>
              </select>
              <input value={apiConfig.baseUrl} onChange={(e) => setApiConfig((prev) => ({ ...prev, baseUrl: e.target.value }))} placeholder="Base URL，例如 https://api.openai.com/v1" />
              <input value={apiConfig.model} onChange={(e) => setApiConfig((prev) => ({ ...prev, model: e.target.value }))} placeholder="Model，例如 gpt-4.1-mini" />
              <input type="password" value={apiConfig.apiKey} onChange={(e) => setApiConfig((prev) => ({ ...prev, apiKey: e.target.value }))} placeholder="API Key" />
              <label className="persistLabel">
                <input type="checkbox" checked={apiConfig.persistKey} onChange={(e) => setApiConfig((prev) => ({ ...prev, persistKey: e.target.checked }))} />
                浏览器持久保存 API Key
              </label>
            </div>
            
            <h4 style={{margin: '1.5rem 0 0.5rem'}}>支持作者</h4>
            <div className="apiModalGrid">
              <select value={donateConfig.platform} onChange={(e) => setDonateConfig((prev) => ({ ...prev, platform: e.target.value as DonatePlatform }))}>
                <option>爱发电</option><option>Ko-fi</option><option>Buy Me a Coffee</option><option>其他</option>
              </select>
              <input value={donateConfig.url} onChange={(e) => setDonateConfig((prev) => ({ ...prev, url: e.target.value }))} placeholder="捐赠链接（可选）" />
            </div>
            
            {showDisclaimer ? (
              <div className="disclaimer">
                <p>API Key 仅在本地浏览器使用，不会上传服务器。请使用低权限 Key 并自行承担风险。</p>
                <button className="ghostButton" onClick={() => setShowDisclaimer(false)}>我已了解</button>
              </div>
            ) : null}
            <div className="actionRow">
              <button onClick={() => setShowApiModal(false)}>完成</button>
            </div>
          </div>
        </div>
      ) : null}

      {monetizationEnabled && showPaywall ? (
        <div className="modalMask" onClick={() => setShowPaywall(false)}>
          <div className="modalCard" onClick={(e) => e.stopPropagation()}>
            <h3>支持豆包即梦，持续升级</h3>
            <p>你今日免费次数已用完（{freeDailyLimit}次）。继续生成请支持创作者。</p>
            <p>建议方案：日卡 1.9 元 / 24h，周卡 6.9 元 / 7天。</p>
            <div className="actionRow">
              <button onClick={openDonateLink} disabled={!canDonate}>立即支持</button>
              <button className="ghostButton" onClick={() => setShowPaywall(false)}>继续编辑（暂不生成）</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default App
