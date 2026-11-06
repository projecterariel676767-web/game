import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {AIRCRAFT_ASSETS,getAircraft} from './aircraftCatalog';

type Props={selectedId:string;onSelect:(id:string)=>void};
export default function HangarScene({selectedId,onSelect}:Props){
 const mount=useRef<HTMLDivElement>(null),sceneRef=useRef<THREE.Scene|null>(null),aircraftRef=useRef<THREE.Group|null>(null),mixerRef=useRef<THREE.AnimationMixer|null>(null),loadToken=useRef(0);
 const [loading,setLoading]=useState(false),[error,setError]=useState('');
 const selected=getAircraft(selectedId);
 useEffect(()=>{
  const host=mount.current;if(!host)return;
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x101d2a);scene.fog=new THREE.Fog(0x101d2a,55,150);sceneRef.current=scene;
  const camera=new THREE.PerspectiveCamera(42,1,.1,500);camera.position.set(17,11,22);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;host.appendChild(renderer.domElement);
  const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,3,0);controls.enableDamping=true;controls.maxPolarAngle=Math.PI*.49;controls.minDistance=5;controls.maxDistance=90;
  scene.add(new THREE.HemisphereLight(0xc8e5ff,0x29313a,2.2));
  const key=new THREE.DirectionalLight(0xffe6c4,3.5);key.position.set(10,25,15);key.castShadow=true;key.shadow.mapSize.set(2048,2048);scene.add(key);
  const fill=new THREE.PointLight(0x3ca8d6,90,55);fill.position.set(-15,12,3);scene.add(fill);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,80),new THREE.MeshStandardMaterial({color:0x394650,roughness:.88}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
  const grid=new THREE.GridHelper(100,50,0x71808a,0x53616a);grid.position.y=.02;scene.add(grid);
  const wallMat=new THREE.MeshStandardMaterial({color:0x526575,metalness:.35,roughness:.65}),roofMat=new THREE.MeshStandardMaterial({color:0x263d50,metalness:.55,roughness:.5});
  const addBox=(w:number,h:number,d:number,x:number,y:number,z:number,mat:THREE.Material)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);};
  addBox(100,18,.5,0,9,-36,wallMat);addBox(.5,18,72,-50,9,0,wallMat);addBox(.5,18,72,50,9,0,wallMat);addBox(100,.5,80,0,18,0,roofMat);
  for(let x=-42;x<=42;x+=7){addBox(.18,17,.22,x,8.5,-35.7,new THREE.MeshStandardMaterial({color:0x91a6b5,metalness:.7}));}
  const door=new THREE.Mesh(new THREE.PlaneGeometry(30,14),new THREE.MeshStandardMaterial({color:0x162c3e,roughness:.6,side:THREE.DoubleSide}));door.position.set(0,7,36.1);scene.add(door);
  const resize=()=>{if(!host)return;const w=host.clientWidth,h=host.clientHeight;camera.aspect=w/Math.max(1,h);camera.updateProjectionMatrix();renderer.setSize(w,h);};resize();const observer=new ResizeObserver(resize);observer.observe(host);
  let frame=0,last=performance.now();const animate=(now:number)=>{frame=requestAnimationFrame(animate);const dt=Math.min(.05,(now-last)/1000);last=now;controls.update();mixerRef.current?.update(dt);renderer.render(scene,camera);};animate(last);
  return()=>{loadToken.current++;cancelAnimationFrame(frame);observer.disconnect();controls.dispose();mixerRef.current?.stopAllAction();mixerRef.current=null;renderer.dispose();scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m.dispose());}});if(host.contains(renderer.domElement))host.removeChild(renderer.domElement);sceneRef.current=null;aircraftRef.current=null;};
 },[]);
 useEffect(()=>{
  const scene=sceneRef.current;if(!scene)return;const token=++loadToken.current;setLoading(true);setError('');
  if(aircraftRef.current){scene.remove(aircraftRef.current);aircraftRef.current=null;}
  mixerRef.current?.stopAllAction();mixerRef.current=null;
  const loader=new GLTFLoader();
  loader.load(selected.url,gltf=>{
   if(token!==loadToken.current||!sceneRef.current)return;
   const root=gltf.scene;root.updateMatrixWorld(true);
   const bounds=new THREE.Box3().setFromObject(root),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
   const maxDim=Math.max(size.x,size.y,size.z)||1;root.scale.setScalar(19/maxDim);root.position.x=-center.x*root.scale.x;root.position.z=-center.z*root.scale.z;root.position.y=-bounds.min.y*root.scale.y;
   root.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;if(o.material instanceof THREE.MeshStandardMaterial){o.material.envMapIntensity=1.1;}}});
   scene.add(root);aircraftRef.current=root;
   if(gltf.animations.length){const mixer=new THREE.AnimationMixer(root);gltf.animations.forEach(clip=>mixer.clipAction(clip).play());mixerRef.current=mixer;}
   setLoading(false);
  },undefined,err=>{if(token!==loadToken.current)return;console.error('Aircraft GLB failed to load:',selected.url,err);setError('Could not load this GLB. Check the source URL or its CORS access.');setLoading(false);});
  return()=>{if(loadToken.current===token)loadToken.current++;};
 },[selected.url]);
 return <section className="hangar-scene-wrap"><div className="hangar-toolbar"><div><span className="eyebrow">3D HANGAR · GLB AIRCRAFT LIBRARY</span><h3>Aircraft showroom</h3></div><div className="hangar-select"><label htmlFor="aircraft-model">Aircraft model</label><select id="aircraft-model" value={selectedId} onChange={e=>onSelect(e.target.value)}>{AIRCRAFT_ASSETS.map(a=><option key={a.id} value={a.id}>{a.name} · {a.category}</option>)}</select></div></div><div className="hangar-canvas" ref={mount}><div className="hangar-hint">Drag to rotate · Scroll to zoom · GLB animations auto-play</div>{loading&&<div className="hangar-status">Loading {selected.name}…</div>}{error&&<div className="hangar-error">{error}</div>}</div><div className="hangar-caption"><b>{selected.name}</b><span>{selected.category} · {selected.source} · {selected.license}</span></div><div className="hangar-credit">23 selectable GLB aircraft · Models load directly from their published source links. Third-party model rights and source terms remain applicable.</div></section>;
}
