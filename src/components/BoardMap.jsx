import Card from './ui/Card.jsx'
import Legend from './Legend.jsx'

// 核心地圖卡:標題「路線地圖」+ 右上角圖例,內容為傳入的 <TrackGrid />。
export default function BoardMap({ children }) {
  return (
    <Card title="路線地圖" action={<Legend />} className="board-card" bodyClass="board-body">
      {children}
    </Card>
  )
}
