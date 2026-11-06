import {useEffect,useRef} from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

type Props={onPick:(point:string)=>void;searchTerm:string;weatherLayer:string;opacity:number;mode:string;imageryType:string;interpolation:string};
const imageryUrls:Record<string,{url:string;credit:string}>={
 satellite:{url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',credit:'Esri, Maxar, Earthstar Geographics, and the GIS User Community'},
 streets:{url:'https://tile.openstreetmap.org/{z}/{x}/{y}.png',credit:'© OpenStreetMap contributors'},
 topographic:{url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',credit:'Esri, HERE, Garmin, USGS, Intermap, and the GIS User Community'},
 dark:{url:'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',credit:'© OpenStreetMap contributors © CARTO'}
};
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
    const imageryModels=[...(cfg.cesiumIonToken?[new Cesium.ProviderViewModel({name:'Cesium Ion satellite',tooltip:'Cesium ion global satellite imagery',iconUrl:Cesium.buildModuleUrl('Widgets/Images/ImageryProviders/BingMapsAerial.png'),creationFunction:()=>Cesium.createWorldImageryAsync()})]:[]),...Object.entries(imageryUrls).map(([key,spec])=>new Cesium.ProviderViewModel({name:key==='satellite'?'Satellite (Esri)':key==='streets'?'Street map':key==='topographic'?'Topographic':'Dark map',tooltip:'Switch Earth imagery to '+key,iconUrl:Cesium.buildModuleUrl('Widgets/Images/ImageryProviders/ArcGisMapServer.png'),creationFunction:()=>new Cesium.UrlTemplateImageryProvider({url:spec.url,credit:spec.credit,maximumLevel:19})}))];
    const terrainModels=[new Cesium.ProviderViewModel({name:'Ellipsoid',tooltip:'Smooth globe without elevation data',iconUrl:Cesium.buildModuleUrl('Widgets/Images/TerrainProviders/Ellipsoid.png'),creationFunction:()=>new Cesium.EllipsoidTerrainProvider()}),new Cesium.ProviderViewModel({name:'World terrain',tooltip:'Global elevation and mountain relief',iconUrl:Cesium.buildModuleUrl('Widgets/Images/TerrainProviders/CesiumWorldTerrain.png'),creationFunction:()=>Cesium.ArcGISTiledElevationTerrainProvider.fromUrl('https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer')})];
    v=new Cesium.Viewer(host.current,{animation:true,timeline:true,baseLayerPicker:true,imageryProviderViewModels:imageryModels,selectedImageryProviderViewModel:imageryModels.find(x=>x.name===(cfg.cesiumIonToken?'Cesium Ion satellite':'Satellite (Esri)')),terrainProviderViewModels:terrainModels,selectedTerrainProviderViewModel:terrainModels[1],geocoder:false,homeButton:true,sceneModePicker:true,navigationHelpButton:true,fullscreenButton:false,infoBox:false,selectionIndicator:false});
    viewer.current=v;
    v.scene.globe.enableLighting=true;v.scene.globe.depthTestAgainstTerrain=true;
    v.camera.setView({destination:Cesium.Cartesian3.fromDegrees(15,25,22000000)});
    try{const terrain=await Cesium.ArcGISTiledElevationTerrainProvider.fromUrl('https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer');if(alive&&v&&!v.isDestroyed())v.terrainProvider=terrain;}catch(e){console.warn('World elevation unavailable; keeping ellipsoid',e);}
    const handler=new Cesium.ScreenSpaceEventHandler(v.scene.canvas);
    handler.setInputAction((movement:any)=>{const ray=v!.camera.getPickRay(movement.position);if(!ray)return;const p=v!.scene.globe.pick(ray,v!.scene);if(!p)return;const c=Cesium.Cartographic.fromCartesian(p);onPick(Cesium.Math.toDegrees(c.longitude).toFixed(5)+', '+Cesium.Math.toDegrees(c.latitude).toFixed(5));},Cesium.ScreenSpaceEventType.LEFT_CLICK);
    (v as any).__handler=handler;
   }catch(e){console.error('Cesium initialization failed',e);}
  }
  init();
  return()=>{alive=false;if(v){(v as any).__handler?.destroy();v.destroy();}viewer.current=null;};
 },[onPick]);
 useEffect(()=>{const v=viewer.current;if(!v)return;const spec=imageryUrls[imageryType]||imageryUrls.satellite;const old=v.imageryLayers.get(0);if(old)v.imageryLayers.remove(old,true);v.imageryLayers.addImageryProvider(new Cesium.UrlTemplateImageryProvider({url:spec.url,credit:spec.credit,maximumLevel:19}),0);},[imageryType]);
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
