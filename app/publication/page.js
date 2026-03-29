'use client';

import './publication.css';
import S01_Cover from '../../components/publication/spreads/S01_Cover';
import S02_DesignIsBuild from '../../components/publication/spreads/S02_DesignIsBuild';
import S03_ToolLandscape from '../../components/publication/spreads/S03_ToolLandscape';
import S04_VibeCoding from '../../components/publication/spreads/S04_VibeCoding';
import S05_NonLinear from '../../components/publication/spreads/S05_NonLinear';
import S06_ShowDontDescribe from '../../components/publication/spreads/S06_ShowDontDescribe';
import S07_SharedBrain from '../../components/publication/spreads/S07_SharedBrain';
import S08_Instrument from '../../components/publication/spreads/S08_Instrument';
import S09_PluggingIn from '../../components/publication/spreads/S09_PluggingIn';
import S10_LastMile from '../../components/publication/spreads/S10_LastMile';
import S11_RoleTransforming from '../../components/publication/spreads/S11_RoleTransforming';
import S12_Closing from '../../components/publication/spreads/S12_Closing';
import S13_BackMatter from '../../components/publication/spreads/S13_BackMatter';
import S14_BackCover from '../../components/publication/spreads/S14_BackCover';

export default function PublicationRoute() {
  return (
    <div className="pub-container">
      <S01_Cover />
      <S02_DesignIsBuild />
      <S03_ToolLandscape />
      <S04_VibeCoding />
      <S05_NonLinear />
      <S06_ShowDontDescribe />
      <S07_SharedBrain />
      <S08_Instrument />
      <S09_PluggingIn />
      <S10_LastMile />
      <S11_RoleTransforming />
      <S12_Closing />
      <S13_BackMatter />
      <S14_BackCover />
    </div>
  );
}
