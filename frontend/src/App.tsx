import LeftPanel from './components/Sidebar/LeftPanel'
import ContainerScene from './components/Scene/ContainerScene'
import RightPanel from './components/SectionView/RightPanel'
import BinTabs from './components/Controls/BinTabs'
import LayerSlider from './components/Controls/LayerSlider'

export default function App() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#121212]">
      <LeftPanel />

      {/* Center: bin tabs + 3D canvas + layer slider */}
      <div className="flex flex-col flex-1 min-w-0">
        <BinTabs />
        <div className="flex-1 min-h-0">
          <ContainerScene />
        </div>
        <LayerSlider />
      </div>

      <RightPanel />
    </div>
  )
}
