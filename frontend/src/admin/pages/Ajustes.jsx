import TarifasCard from '../components/settings/TarifasCard';
import RepartoCard from '../components/settings/RepartoCard';
import ChoferesCard from '../components/settings/ChoferesCard';
import BusesCard from '../components/settings/BusesCard';

export default function Ajustes() {
  return (
    <div className="g m">
      <TarifasCard />
      <RepartoCard />
      <ChoferesCard />
      <BusesCard />
    </div>
  );
}
