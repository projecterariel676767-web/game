import {useEffect,useRef} from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

type Props={onPick:(point:string)=>void;searchTerm:string;weatherLayer:string;opacity:number;mode:string;imageryType:string;interpolation:string};
const imageryUrls:Record<string,{url:string;credit:string;label:string}>={
 satellite:{url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',credit:'Esri, Maxar, Earthstar Geographics, and the GIS User Community',label:'Esri satellite'},
 streets:{url:'https://tile.openstreetmap.org/{z}/{x}/{y}.png',credit:'© OpenStreetMap contributors',label:'OpenStreetMap'},
 topographic:{url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',credit:'Esri, HERE, Garmin, USGS, Intermap, and the GIS User Community',label:'Esri topographic'},
 dark:{url:'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',credit:'© OpenStreetMap contributors © CARTO',label:'CARTO dark'},
 voyager:{url:'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',credit:'© OpenStreetMap contributors © CARTO',label:'CARTO Voyager'},
 positron:{url:'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',credit:'© OpenStreetMap contributors © CARTO',label:'CARTO light'},
 opentopo:{url:'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',credit:'© OpenTopoMap contributors',label:'OpenTopoMap'}
};
const providerIcon=(fill:string)=>'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect x="3" y="3" width="58" height="58" rx="12" fill="'+fill+'"/><circle cx="32" cy="32" r="19" fill="none" stroke="white" stroke-width="2.5"/><path d="M13 32h38M32 13c-10 10-10 28 0 38M32 13c10 10 10 28 0 38" fill="none" stroke="white" stroke-width="2" opacity=".85"/></svg>');
const makeImageryModels=(hasIon:boolean)=>[
 ...(hasIon?[new Cesium.ProviderViewModel({name:'Cesium World Imagery',tooltip:'Cesium ion global satellite imagery',iconUrl:providerIcon('#285d85'),creationFunction:()=>Cesium.createWorldImageryAsync()})]:[]),
 ...Object.entries(imageryUrls).map(([key,spec])=>new Cesium.ProviderViewModel({name:spec.label,tooltip:'Global '+spec.label+' map tiles',iconUrl:providerIcon(key==='satellite'?'#315b35':key==='dark'?'#252b3c':'#37657a'),creationFunction:()=>new Cesium.UrlTemplateImageryProvider({url:spec.url,credit:spec.credit,maximumLevel:19})}))
];
export default function CesiumEarth({onPick,searchTerm,weatherLayer,opacity,mode,imageryType,interpolation}:Props){
 const host=useRef<HTMLDivElement>(null);const viewer=useRef<Cesium.Viewer|null>(null);const layers=useRef<Cesium.ImageryLayer[]>([]);
 useEffect(()=>{
  let alive=true;let v:Cesium.Viewer|null=null;
  async function init(){
   if(!host.current)return;
   try{
    const cfg=await fetch('/api/config').then(r=>r.json()).catch(()=>({}));
    if(!alive||!host.current)return;
    if(cfg.cesiumIonToken)Cesium.Ion.defaultAccessToken=cfg.cesiumIonToken;
    const imageryModels=makeImageryModels(!!cfg.cesiumIonToken);
    const terrainModels=[...(cfg.cesiumIonToken?[new Cesium.ProviderViewModel({name:'Cesium World Terrain',tooltip:'Cesium ion global terrain with elevation and relief',iconUrl:providerIcon('#3d765e'),creationFunction:()=>Cesium.createWorldTerrainAsync()})]:[]),new Cesium.ProviderViewModel({name:'ArcGIS global elevation',tooltip:'Global elevation and mountain relief',iconUrl:providerIcon('#526b83'),creationFunction:()=>Cesium.ArcGISTiledElevationTerrainProvider.fromUrl('https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer')}),new Cesium.ProviderViewModel({name:'Ellipsoid',tooltip:'Smooth globe without elevation data',iconUrl:Cesium.buildModuleUrl('Widgets/Images/TerrainProviders/Ellipsoid.png'),creationFunction:()=>new Cesium.EllipsoidTerrainProvider()})];
    v=new Cesium.Viewer(host.current,{animation:true,timeline:true,baseLayerPicker:true,imageryProviderViewModels:imageryModels,selectedImageryProviderViewModel:imageryModels.find(x=>x.name===(cfg.cesiumIonToken?'Cesium Ion satellite':'Satellite (Esri)')),terrainProviderViewModels:terrainModels,selectedTerrainProviderViewModel:terrainModels.find(x=>x.name===(cfg.cesiumIonToken?'Cesium World Terrain':'ArcGIS global elevation')),geocoder:false,homeButton:true,sceneModePicker:true,navigationHelpButton:true,fullscreenButton:false,infoBox:false,selectionIndicator:false});
    viewer.current=v;
    v.scene.globe.enableLighting=true;v.scene.globe.depthTestAgainstTerrain=true;
    v.camera.setView({destination:Cesium.Cartesian3.fromDegrees(15,25,22000000)});
    try{const terrain=cfg.cesiumIonToken?await Cesium.createWorldTerrainAsync():await Cesium.ArcGISTiledElevationTerrainProvider.fromUrl('https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer');if(alive&&v&&!v.isDestroyed())v.terrainProvider=terrain;}catch(e){console.warn('World elevation unavailable; keeping ellipsoid',e);}
    const handler=new Cesium.ScreenSpaceEventHandler(v.scene.canvas);
    handler.setInputAction((movement:any)=>{const ray=v!.camera.getPickRay(movement.position);if(!ray)return;const p=v!.scene.globe.pick(ray,v!.scene);if(!p)return;const c=Cesium.Cartographic.fromCartesian(p);onPick(Cesium.Math.toDegrees(c.longitude).toFixed(5)+', '+Cesium.Math.toDegrees(c.latitude).toFixed(5));},Cesium.ScreenSpaceEventType.LEFT_CLICK);
    (v as any).__handler=handler;
   }catch(e){console.error('Cesium initialization failed',e);}
  }
  init();
  return()=>{alive=false;if(v){(v as any).__handler?.destroy();v.destroy();}viewer.current=null;};
 },[onPick]);
 useEffect(()=>{const v=viewer.current;if(!v)return;const spec=imageryUrls[imageryType]||imageryUrls.satellite;const picker=v.baseLayerPicker?.viewModel;const model=picker?.imageryProviderViewModels.find(x=>x.name===spec.label);if(picker&&model){picker.selectedImagery=model;return;}const old=v.imageryLayers.get(0);if(old)v.imageryLayers.remove(old,true);v.imageryLayers.addImageryProvider(new Cesium.UrlTemplateImageryProvider({url:spec.url,credit:spec.credit,maximumLevel:19}),0);},[imageryType]);
 useEffect(()=>{const v=viewer.current;if(!v)return;if(mode==='2d'&&v.scene.mode!==Cesium.SceneMode.SCENE2D)v.scene.morphTo2D(1.2);else if(mode==='2.5d'&&v.scene.mode!==Cesium.SceneMode.COLUMBUS_VIEW)v.scene.morphToColumbusView(1.2);else if(mode==='3d'&&v.scene.mode!==Cesium.SceneMode.SCENE3D)v.scene.morphTo3D(1.2);},[mode]);
 useEffect(()=>{
  const v=viewer.current;if(!v)return;layers.current.forEach(x=>{try{v.imageryLayers.remove(x,true)}catch{}});layers.current=[];
  if(weatherLayer==='none')return;
  const names:Record<string,string>={temperature:'temp_new',precipitation:'precipitation_new',wind:'wind_new',pressure:'pressure_new',clouds:'clouds_new'};
  const name=names[weatherLayer];if(!name)return;
  const layer=v.imageryLayers.addImageryProvider(new Cesium.UrlTemplateImageryProvider({url:'/api/weather/tiles/'+name+'/{z}/{x}/{y}.png',maximumLevel:18,credit:'OpenWeather'}));
  layer.alpha=opacity;const filter=interpolation==='nearest'?Cesium.TextureMagnificationFilter.NEAREST:Cesium.TextureMagnificationFilter.LINEAR;layer.magnificationFilter=filter;layer.minificationFilter=Cesium.TextureMinificationFilter.LINEAR;layers.current=[layer];
 },[weatherLayer,opacity,interpolation]);
 useEffect(()=>{if(!searchTerm.trim()||!viewer.current)return;let cancelled=false;const term=searchTerm.trim();const timer=window.setTimeout(()=>locate(),550);const coords=term.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);async function locate(){try{let lon:number,lat:number;if(coords){lon=Number(coords[1]);lat=Number(coords[2]);}else{const rows=await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q='+encodeURIComponent(term)).then(r=>r.json());if(!rows[0])return;lon=Number(rows[0].lon);lat=Number(rows[0].lat);}if(cancelled||!viewer.current)return;viewer.current.camera.flyTo({destination:Cesium.Cartesian3.fromDegrees(lon,lat,450000),duration:2});}catch(e){console.warn('Place search failed',e)}}return()=>{cancelled=true;window.clearTimeout(timer)};},[searchTerm]);
 return <div className="cesium-container" ref={host}/>;
}
