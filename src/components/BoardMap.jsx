import Legend from './Legend.jsx'

// 主畫面核心:像編輯器的地圖畫布。輕量 toolbar(左標題 / 右圖例)+ 內凹 canvas。
export default function BoardMap({ children }) {
  return (
    <section className="map">
      <div className="map-toolbar">
        <div className="map-title">
          <span className="map-title-mark" aria-hidden="true" />
          路線地圖
        </div>
        <Legend />
      </div>
      <div className="map-canvas">{children}</div>
    </section>
  )
}
