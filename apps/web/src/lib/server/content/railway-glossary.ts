import { ayakyuStations } from './ayakyu-stations'

// Chinese station names retain the Japanese official characters; the ledger
// supplies romanization but does not establish separate Chinese names.
type Term = { ja: string; en: string; 'zh-Hant': string; 'zh-Hans': string }
const term = (ja: string, en: string, hant: string, hans: string): Term => ({
  ja, en, 'zh-Hant': hant, 'zh-Hans': hans,
})
const railwayTerms: Term[] = [
  term('綾坂急行電鉄', 'Ayasaka Express Railway', '綾坂急行電鐵', '绫坂急行电铁'),
  term('綾急', 'Ayakyu', '綾急', '绫急'),
  term('千代橋線', 'Chiyobashi Line', '千代橋線', '千代桥线'),
  term('森嶋線', 'Morishima Line', '森嶋線', '森嶋线'),
  term('宮摩線', 'Miyama Line', '宮摩線', '宫摩线'),
  term('本線', 'Main Line', '本線', '本线'),
  term('普通列車', 'local train', '普通列車', '普通列车'),
  term('各駅停車', 'local train', '各站停車', '各站停车'),
  term('快速', 'rapid', '快速', '快速'),
  term('急行', 'express', '急行', '急行'),
  term('特急', 'limited express', '特急', '特急'),
  term('準急', 'semi-express', '準急', '准急'),
  term('通勤急行', 'commuter express', '通勤急行', '通勤急行'),
  term('直通運転', 'through service', '直通運行', '直通运行'),
  term('折り返し運転', 'turnback operation', '折返運行', '折返运行'),
  term('回送', 'out of service', '回送', '回送'),
  term('複々線', 'four tracks', '複複線', '四线铁路'),
  term('複線', 'double track', '雙線', '双线'),
  term('単線', 'single track', '單線', '单线'),
  term('分岐器', 'railway switch', '轉轍器', '道岔'),
  term('信号機', 'railway signal', '鐵路號誌', '铁路信号机'),
  term('踏切', 'level crossing', '平交道', '铁路道口'),
  term('車両基地', 'rail depot', '車輛基地', '车辆基地'),
  term('運転台', "driver's cab", '駕駛室', '驾驶室'),
  term('ダイヤ', 'timetable', '列車時刻表', '列车时刻表'),
  term('遅延', 'delay', '誤點', '晚点'),
  term('運転見合わせ', 'service suspended', '暫停行駛', '暂停运行'),
  term('乗り換え', 'transfer', '轉乘', '换乘'),
  term('上り', 'inbound', '上行', '上行'),
  term('下り', 'outbound', '下行', '下行'),
]
const stations: Term[] = ayakyuStations.map(([ja, en]) => term(ja, en, ja, ja))

function containsTerm(text: string, value: string): boolean {
  // Avoid matching e.g. the station "Aoba" inside an unrelated English word.
  if (/^[a-z\s'-]+$/i.test(value)) {
    const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`(?:^|[^a-z])${escaped}(?:$|[^a-z])`, 'i').test(text)
  }
  return text.includes(value)
}

export function railwayGlossary(items: string[]): Term[] {
  const text = items.join('\n')
  return [...railwayTerms, ...stations].filter((entry) =>
    Object.values(entry).some((value) => containsTerm(text, value))
  )
}
