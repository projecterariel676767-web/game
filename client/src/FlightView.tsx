import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {applyAircraftFinish} from './aircraftMaterials';

type Props={speed:number;altitude:number;modelId:string;modelUrl:string;onExit:()=>void};
export default function FlightView({speed,altitude,modelId,modelUrl,onExit}:Props){
 const mount=useRef<HTMLDivElement>(null);const [modelState,setModelState]=useState('Loading aircraft model…');
 useEffect(()=>{
  const host=mount.current;if(!host)return;
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x78a9c9);scene.fog=new THREE.Fog(0x9abbd0,5000,32000);
  const camera=new THREE.PerspectiveCamera(78,1,.1,60000);camera.position.set(0,3,0);camera.rotation.order='YXZ';
  const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;host.appendChild(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xe6f5ff,0x52634c,2.1));const sun=new THREE.DirectionalLight(0xffefcf,2.5);sun.position.set(-500,1200,-700);scene.add(sun);
  const size=90000,segments=180,geo=new THREE.PlaneGeometry(size,size,segments,segments);geo.rotateX(-Math.PI/2);
  const pos=geo.attributes.position;const colors:number[]=[];
  for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);const h=700*Math.sin(x*.0003)*Math.cos(z*.00025)+450*Math.sin((x+z)*.0006)+200*Math.cos(z*.0012+x*.0004);pos.setY(i,h);const shade=Math.max(0,Math.min(1,(h+1200)/2400));colors.push(.13+shade*.2,.25+shade*.28,.16+shade*.12);}
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();
  const ground=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}));ground.position.y=-900;scene.add(ground);
  const clouds=new THREE.Group();for(let i=0;i<90;i++){const g=new THREE.Group();for(let j=0;j<4;j++){const m=new THREE.Mesh(new THREE.SphereGeometry(280+Math.random()*350,10,8),new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,transparent:true,opacity:.78}));m.position.set(j*320,Math.random()*120,zRandom());g.add(m);}g.position.set((Math.random()-.5)*50000,2200+Math.random()*1800,-Math.random()*80000);clouds.add(g);}scene.add(clouds);
  function zRandom(){return (Math.random()-.5)*200;}
  const aircraft=new THREE.Group();scene.add(aircraft);let aircraftModel:THREE.Object3D|null=null;let mixer:THREE.AnimationMixer|null=null;let modelToken=0;
  let yaw=0,pitch=0,roll=0,forward=Math.max(80,speed)/3.6;const keys=new Set<string>();let last=performance.now(),frame=0;
  const loader=new GLTFLoader();loader.setResourcePath('/api/models/'+modelId+'/');const thisToken=++modelToken;loader.load(modelUrl,gltf=>{if(thisToken!==modelToken)return;const root=gltf.scene;applyAircraftFinish(root,modelId);root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(root),dim=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),scale=24/(Math.max(dim.x,dim.y,dim.z)||1);root.scale.setScalar(scale);root.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);root.rotation.y=Math.PI;root.position.z=45;root.position.y=-5;aircraft.add(root);aircraftModel=root;if(gltf.animations.length){mixer=new THREE.AnimationMixer(root);gltf.animations.forEach(a=>mixer!.clipAction(a).play());}setModelState('AIRCRAFT LOADED · EXTERNAL GLB');},err=>{console.error('Flight aircraft GLB load failed',modelUrl,err);setModelState('Aircraft model could not load through /api/models. Check Render logs.');});
  const cockpit=new THREE.Group();camera.add(cockpit);scene.add(camera);
  const frameMat=new THREE.MeshStandardMaterial({color:0x111c28,metalness:.65,roughness:.35});
  const bar=(w:number,h:number,d:number,x:number,y:number,z:number)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),frameMat);m.position.set(x,y,z);cockpit.add(m);};
  bar(.16,3.3,.22,-3.5,0,-5.5);bar(.16,3.3,.22,3.5,0,-5.5);bar(7.1,.18,.24,0,1.65,-5.5);bar(7.1,.2,.24,0,-1.65,-5.5);bar(.12,3.1,.2,0,0,-5.4);
  const dash=new THREE.Mesh(new THREE.BoxGeometry(7.2,.65,1.2),new THREE.MeshStandardMaterial({color:0x172632,metalness:.45,roughness:.4}));dash.position.set(0,-1.95,-4.4);cockpit.add(dash);
  for(let i=0;i<5;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(.22,.035,8,24),new THREE.MeshStandardMaterial({color:0x70d7dc,emissive:0x123b40}));ring.position.set(-2.6+i*1.3,-1.9,-3.78);cockpit.add(ring);}
  let view:'cockpit'|'chase'='cockpit';
  const keydown=(e:KeyboardEvent)=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','q','e',' '].includes(e.key)){keys.add(e.key.toLowerCase());if(e.key===' ')e.preventDefault();}};
  const keyup=(e:KeyboardEvent)=>keys.delete(e.key.toLowerCase());
  const mouse=(e:MouseEvent)=>{if(document.pointerLockElement===renderer.domElement){yaw-=e.movementX*.0018;pitch=Math.max(-.65,Math.min(.55,pitch-e.movementY*.0015));}};
  const click=()=>{renderer.domElement.requestPointerLock?.();};
  window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('mousemove',mouse);renderer.domElement.addEventListener('click',click);
  const resize=()=>{const w=host.clientWidth,h=host.clientHeight;camera.aspect=w/Math.max(h,1);camera.updateProjectionMatrix();renderer.setSize(w,h);};resize();const observer=new ResizeObserver(resize);observer.observe(host);
  const animate=(now:number)=>{frame=requestAnimationFrame(animate);const dt=Math.min(.05,(now-last)/1000);last=now;
   if(keys.has('arrowleft')||keys.has('a'))yaw+=dt*.45;if(keys.has('arrowright')||keys.has('d'))yaw-=dt*.45;
   if(keys.has('arrowup')||keys.has('w'))pitch=Math.max(-.65,pitch+dt*.3);if(keys.has('arrowdown')||keys.has('s'))pitch=Math.min(.55,pitch-dt*.3);
   if(keys.has('q'))roll=Math.min(.7,roll+dt*.55);if(keys.has('e'))roll=Math.max(-.7,roll-dt*.55);if(!keys.has('q')&&!keys.has('e'))roll*=.985;
   const dir=new THREE.Vector3(Math.sin(yaw),Math.sin(pitch),-Math.cos(yaw)).normalize();aircraft.position.addScaledVector(dir,forward*dt);aircraft.rotation.set(pitch,yaw,roll,'YXZ');
   if(view==='cockpit'){camera.position.copy(aircraft.position);camera.rotation.set(pitch,yaw,roll,'YXZ');}
   else{const offset=new THREE.Vector3(0,7,25).applyEuler(new THREE.Euler(pitch,yaw,roll,'YXZ'));camera.position.copy(aircraft.position).add(offset);camera.lookAt(aircraft.position);}
   clouds.position.z+=forward*dt*.28;if(clouds.position.z>8000)clouds.position.z=-5000;mixer?.update(dt);renderer.render(scene,camera);
  };animate(last);
  const setView=(next:'cockpit'|'chase')=>{view=next;camera.position.copy(aircraft.position);};
  const cockpitButton=host.querySelector<HTMLButtonElement>('[data-view="cockpit"]'),chaseButton=host.querySelector<HTMLButtonElement>('[data-view="chase"]');
  const onCockpit=()=>setView('cockpit'),onChase=()=>setView('chase');cockpitButton?.addEventListener('click',onCockpit);chaseButton?.addEventListener('click',onChase);
  return()=>{modelToken++;mixer?.stopAllAction();cancelAnimationFrame(frame);observer.disconnect();document.exitPointerLock?.();window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('mousemove',mouse);renderer.domElement.removeEventListener('click',click);cockpitButton?.removeEventListener('click',onCockpit);chaseButton?.removeEventListener('click',onChase);renderer.dispose();geo.dispose();scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m.dispose());}});if(host.contains(renderer.domElement))host.removeChild(renderer.domElement);};
 },[modelId,modelUrl]);
 return <div className="flight-scene" ref={mount}><div className="flight-scene-hud"><span>PIN WORLD · FLIGHT SIMULATOR</span><span>SPD {speed} KM/H · ALT {altitude.toLocaleString()} M</span><small>CLICK VIEW · MOUSE LOOK · WASD / ARROWS · Q/E BANK</small><small>{modelState}</small></div><div className="flight-view-switch"><button data-view="cockpit">Cockpit</button><button data-view="chase">Chase camera</button></div><button className="flight-exit" onClick={onExit}>EXIT FLIGHT</button></div>;
}
