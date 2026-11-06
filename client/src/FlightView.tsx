import {useEffect,useRef,useState} from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

type Props={speed:number;altitude:number;modelId:string;modelUrl:string;origin?:string;onExit:()=>void};
export default function FlightView({speed,altitude,modelId,modelUrl,origin,onExit}:Props){
 const mount=useRef<HTMLDivElement>(null);const [modelState,setModelState]=useState('Initializing Cesium flight world…');
 useEffect(()=>{
  const host=mount.current;if(!host)return;let alive=true;let viewer:Cesium.Viewer|null=null;let aircraft:Cesium.Model|null=null;let frame=0;let heading=0,pitch=0,flightAlt=Math.max(altitude,1500);let lat=31.5,lon=34.8;let last=performance.now();let mode:'cockpit'|'chase'='cockpit';let flightDistance=0;
  const parsed=origin?.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);if(parsed){lon=Number(parsed[1]);lat=Number(parsed[2]);}
  async function init(){try{
   const cfg=await fetch('/api/config').then(r=>r.json()).catch(()=>({}));if(!alive||!host)return;
   if(cfg.cesiumIonToken)Cesium.Ion.defaultAccessToken=cfg.cesiumIonToken;
   viewer=new Cesium.Viewer(host,{animation:false,timeline:false,baseLayerPicker:false,geocoder:false,homeButton:false,sceneModePicker:false,navigationHelpButton:false,fullscreenButton:false,infoBox:false,selectionIndicator:false,baseLayer:undefined,imageryProvider:new Cesium.UrlTemplateImageryProvider({url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',credit:'Esri World Imagery'}),terrainProvider:new Cesium.EllipsoidTerrainProvider(),shouldAnimate:true});
   viewer.scene.globe.enableLighting=true;viewer.scene.globe.show=true;viewer.scene.globe.showWaterEffect=true;viewer.scene.globe.depthTestAgainstTerrain=true;viewer.scene.skyAtmosphere.show=true;viewer.scene.skyAtmosphere.atmosphereLightIntensity=10;viewer.scene.fog.enabled=true;viewer.scene.fog.density=0.00008;viewer.scene.highDynamicRange=true;
   viewer.clock.shouldAnimate=true;viewer.clock.multiplier=180;viewer.clock.clockRange=Cesium.ClockRange.UNBOUNDED;viewer.clock.currentTime=Cesium.JulianDate.now();
   if(cfg.cesiumIonToken){try{const terrain=await Cesium.createWorldTerrainAsync({requestWaterMask:true,requestVertexNormals:true});if(alive&&viewer)viewer.terrainProvider=terrain;}catch(e){console.warn('Cesium terrain unavailable; using ellipsoid',e);}}
   if(!alive||!viewer)return;
   const position=Cesium.Cartesian3.fromDegrees(lon,lat,Math.max(altitude,1500));const transform=Cesium.Transforms.headingPitchRollToFixedFrame(position,new Cesium.HeadingPitchRoll(heading,0,0));
   viewer.camera.lookAtTransform(transform,new Cesium.HeadingPitchRange(heading,-0.08,mode==='cockpit'?12:95));
   setModelState(cfg.cesiumIonToken?'CESIUM WORLD · TERRAIN + WATER MASK':'CESIUM GLOBE · ADD CESIUM_ION_TOKEN FOR WORLD TERRAIN');
   try{aircraft=await Cesium.Model.fromGltfAsync({url:modelUrl,modelMatrix:transform,scale:Math.max(0.3,24/180),minimumPixelSize:64,maximumScale:20000,allowPicking:false});if(alive&&viewer){viewer.scene.primitives.add(aircraft);setModelState('CESIUM FLIGHT ACTIVE · '+modelId.toUpperCase());}}catch(e){console.error('Aircraft GLB could not load in Cesium',e);setModelState('Cesium world ready · aircraft model failed to load');}
   const tick=(now:number)=>{if(!alive||!viewer)return;frame=requestAnimationFrame(tick);const dt=Math.min(.05,(now-last)/1000);last=now;flightDistance+=Math.max(0,speed)/3.6*dt;const metersPerDegree=111320;lat+=Math.cos(heading)*Math.max(0,speed)/3.6*dt/metersPerDegree;lon+=Math.sin(heading)*Math.max(0,speed)/3.6*dt/(metersPerDegree*Math.max(.15,Math.cos(Cesium.Math.toRadians(lat))));if(lon>180)lon-=360;if(lon< -180)lon+=360;const p=Cesium.Cartesian3.fromDegrees(lon,lat,Math.max(altitude,250));const hpr=new Cesium.HeadingPitchRoll(heading,pitch,0);const matrix=Cesium.Transforms.headingPitchRollToFixedFrame(p,hpr);if(aircraft)aircraft.modelMatrix=matrix;if(mode==='cockpit'){viewer!.camera.lookAtTransform(matrix,new Cesium.HeadingPitchRange(heading,0,10));}else{viewer!.camera.lookAtTransform(matrix,new Cesium.HeadingPitchRange(heading,-0.16,100));}viewer!.scene.requestRender();};
   frame=requestAnimationFrame(tick);
  }catch(e){console.error('Cesium flight initialization failed',e);setModelState('Cesium initialization failed. Check browser console and Cesium token.');}}
  void init();
  const keydown=(e:KeyboardEvent)=>{const k=e.key.toLowerCase();if(k==='a')heading-=.035;if(k==='d')heading+=.035;if(k==='w')pitch=Math.min(.45,pitch+.02);if(k==='s')pitch=Math.max(-.45,pitch-.02);};window.addEventListener('keydown',keydown);
  const cockpit=host.querySelector<HTMLButtonElement>('[data-view="cockpit"]');const chase=host.querySelector<HTMLButtonElement>('[data-view="chase"]');const setMode=(m:'cockpit'|'chase')=>{mode=m;};const c=()=>setMode('cockpit'),ch=()=>setMode('chase');cockpit?.addEventListener('click',c);chase?.addEventListener('click',ch);
  return()=>{alive=false;cancelAnimationFrame(frame);window.removeEventListener('keydown',keydown);cockpit?.removeEventListener('click',c);chase?.removeEventListener('click',ch);if(viewer&&!viewer.isDestroyed())viewer.destroy();};
 },[modelId,modelUrl]);
 return <div className="flight-scene" ref={mount}>
  <div className="flight-scene-hud"><span>PIN WORLD · CESIUM FLIGHT SIMULATOR</span><span>SPD {speed} KM/H · ALT {altitude.toLocaleString()} M</span><small>ANIMATED SKY · GLOBE · OCEAN · LIVE AIRCRAFT</small><small>{modelState}</small></div>
  <div className="flight-view-switch"><button data-view="cockpit">Pilot camera</button><button data-view="chase">Aircraft follow</button></div>
  <button className="flight-exit" onClick={onExit}>EXIT FLIGHT</button>
 </div>;
}
