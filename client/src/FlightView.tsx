import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {applyAircraftFinish} from './aircraftMaterials';

type Props={speed:number;altitude:number;modelId:string;modelUrl:string;onExit:()=>void};
export default function FlightView({speed,altitude,modelId,modelUrl,onExit}:Props){
 const mount=useRef<HTMLDivElement>(null);
 const [modelState,setModelState]=useState('Loading aircraft model…');
 useEffect(()=>{
  const host=mount.current;if(!host)return;
  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0x78a9c9);
  scene.fog=new THREE.Fog(0x9abbd0,7000,42000);
  const camera=new THREE.PerspectiveCamera(76,1,.08,90000);
  camera.rotation.order='YXZ';
  const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.08;
  host.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xe6f5ff,0x52634c,2.0));
  const sun=new THREE.DirectionalLight(0xffefcf,2.7);
  sun.position.set(-500,1200,-700);scene.add(sun);

  // Procedural landscape remains independent of external GLB availability.
  const size=110000,segments=190;
  const geo=new THREE.PlaneGeometry(size,size,segments,segments);geo.rotateX(-Math.PI/2);
  const pos=geo.attributes.position;const colors:number[]=[];
  for(let i=0;i<pos.count;i++){
   const x=pos.getX(i),z=pos.getZ(i);
   const h=700*Math.sin(x*.0003)*Math.cos(z*.00025)+450*Math.sin((x+z)*.0006)+200*Math.cos(z*.0012+x*.0004);
   pos.setY(i,h);
   const shade=Math.max(0,Math.min(1,(h+1200)/2400));
   colors.push(.13+shade*.2,.25+shade*.28,.16+shade*.12);
  }
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();
  const ground=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}));
  ground.position.y=-900;scene.add(ground);

  const clouds=new THREE.Group();
  for(let i=0;i<100;i++){
   const g=new THREE.Group();
   for(let j=0;j<4;j++){
    const m=new THREE.Mesh(new THREE.SphereGeometry(280+Math.random()*350,10,8),new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,transparent:true,opacity:.78}));
    m.position.set(j*320,Math.random()*120,zRandom());g.add(m);
   }
   g.position.set((Math.random()-.5)*60000,2200+Math.random()*2400,-Math.random()*90000);clouds.add(g);
  }
  scene.add(clouds);
  function zRandom(){return (Math.random()-.5)*200;}

  const aircraft=new THREE.Group();scene.add(aircraft);
  let mixer:THREE.AnimationMixer|null=null;
  let modelToken=0;
  let yaw=0,pitch=0,roll=0,headYaw=0,headPitch=0;
  let forward=Math.max(80,speed)/3.6;
  const keys=new Set<string>();
  let last=performance.now(),frame=0;
  let view:'cockpit'|'chase'='cockpit';

  // The camera is a child of the aircraft transform: it inherits every pitch, bank and heading change.
  aircraft.add(camera);
  camera.position.set(0,2.2,40);
  const cockpit=new THREE.Group();camera.add(cockpit);
  const frameMat=new THREE.MeshStandardMaterial({color:0x111c28,metalness:.65,roughness:.35});
  const bar=(w:number,h:number,d:number,x:number,y:number,z:number)=>{
   const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),frameMat);m.position.set(x,y,z);cockpit.add(m);
  };
  // Minimal cockpit framing and instrument coaming around the pilot's eye point.
  bar(.13,2.5,.18,-3.1,0,-5.4);bar(.13,2.5,.18,3.1,0,-5.4);
  bar(6.25,.14,.18,0,1.24,-5.4);bar(6.25,.16,.18,0,-1.32,-5.4);
  const dash=new THREE.Mesh(new THREE.BoxGeometry(6.3,.52,1.05),new THREE.MeshStandardMaterial({color:0x172632,metalness:.45,roughness:.4}));
  dash.position.set(0,-1.55,-4.4);cockpit.add(dash);
  for(let i=0;i<5;i++){
   const ring=new THREE.Mesh(new THREE.TorusGeometry(.19,.026,8,24),new THREE.MeshStandardMaterial({color:0x70d7dc,emissive:0x123b40}));
   ring.position.set(-2.25+i*1.12,-1.54,-3.82);cockpit.add(ring);
  }

  const loader=new GLTFLoader();
  loader.setResourcePath('/api/models/'+modelId+'/');
  const thisToken=++modelToken;
  loader.load(modelUrl,gltf=>{
   if(thisToken!==modelToken)return;
   const root=gltf.scene;
   applyAircraftFinish(root,modelId);
   root.updateMatrixWorld(true);
   const box=new THREE.Box3().setFromObject(root);
   const dim=box.getSize(new THREE.Vector3());
   const center=box.getCenter(new THREE.Vector3());
   const scale=24/(Math.max(dim.x,dim.y,dim.z)||1);
   root.scale.setScalar(scale);
   root.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);
   root.rotation.y=Math.PI;
   root.position.z=45;
   aircraft.add(root);
   root.updateMatrixWorld(true);

   // Locate the pilot eye point inside the selected aircraft model, near its forward cockpit section.
   // Convert from model-local coordinates into aircraft-local coordinates so the camera moves with the airframe.
   const eyeInModel=new THREE.Vector3(0,Math.max(.45,dim.y*.12),dim.z*.20);
   const eyeWorld=root.localToWorld(eyeInModel.clone());
   camera.position.copy(aircraft.worldToLocal(eyeWorld));
   camera.rotation.set(0,0,0);
   if(gltf.animations.length){
    mixer=new THREE.AnimationMixer(root);
    gltf.animations.forEach(a=>mixer!.clipAction(a).play());
   }
   setModelState('AIRCRAFT LOADED · PILOT CAMERA ATTACHED');
  },err=>{
   console.error('Flight aircraft GLB load failed',modelUrl,err);
   setModelState('Aircraft model unavailable · pilot camera remains active');
  });

  const keydown=(e:KeyboardEvent)=>{
   const key=e.key.toLowerCase();
   if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d','q','e',' '].includes(key)){
    keys.add(key);if(key===' ')e.preventDefault();
   }
  };
  const keyup=(e:KeyboardEvent)=>keys.delete(e.key.toLowerCase());
  const mouse=(e:MouseEvent)=>{
   if(document.pointerLockElement===renderer.domElement){
    headYaw=Math.max(-1.25,Math.min(1.25,headYaw-e.movementX*.0018));
    headPitch=Math.max(-.65,Math.min(.55,headPitch-e.movementY*.0015));
   }
  };
  const click=()=>{renderer.domElement.requestPointerLock?.();};
  window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);
  window.addEventListener('mousemove',mouse);renderer.domElement.addEventListener('click',click);

  const resize=()=>{
   const w=host.clientWidth,h=host.clientHeight;
   camera.aspect=w/Math.max(h,1);camera.updateProjectionMatrix();renderer.setSize(w,h);
  };
  resize();const observer=new ResizeObserver(resize);observer.observe(host);

  const animate=(now:number)=>{
   frame=requestAnimationFrame(animate);
   const dt=Math.min(.05,(now-last)/1000);last=now;
   if(keys.has('arrowleft')||keys.has('a'))yaw+=dt*.42;
   if(keys.has('arrowright')||keys.has('d'))yaw-=dt*.42;
   if(keys.has('arrowup')||keys.has('w'))pitch=Math.min(.48,pitch+dt*.22);
   if(keys.has('arrowdown')||keys.has('s'))pitch=Math.max(-.48,pitch-dt*.22);
   if(keys.has('q'))roll=Math.min(.82,roll+dt*.62);
   if(keys.has('e'))roll=Math.max(-.82,roll-dt*.62);
   if(!keys.has('q')&&!keys.has('e'))roll*=Math.pow(.12,dt);

   const dir=new THREE.Vector3(Math.sin(yaw),Math.sin(pitch),-Math.cos(yaw)).normalize();
   aircraft.position.addScaledVector(dir,forward*dt);
   aircraft.rotation.set(pitch,yaw,roll,'YXZ');

   if(view==='cockpit'){
    camera.rotation.set(headPitch,headYaw,0,'YXZ');
   }else{
    // Chase camera is also attached to the airframe, offset aft and above the tail.
    camera.position.set(0,8,34);
    camera.rotation.set(0,0,0);
    camera.lookAt(aircraft.worldToLocal(aircraft.localToWorld(new THREE.Vector3(0,1,-12))));
   }
   clouds.position.z+=forward*dt*.28;
   if(clouds.position.z>8000)clouds.position.z=-5000;
   mixer?.update(dt);
   renderer.render(scene,camera);
  };
  animate(last);

  const setView=(next:'cockpit'|'chase')=>{
   view=next;headYaw=0;headPitch=0;
   if(next==='cockpit')camera.rotation.set(0,0,0);
  };
  const cockpitButton=host.querySelector<HTMLButtonElement>('[data-view="cockpit"]');
  const chaseButton=host.querySelector<HTMLButtonElement>('[data-view="chase"]');
  const onCockpit=()=>setView('cockpit'),onChase=()=>setView('chase');
  cockpitButton?.addEventListener('click',onCockpit);chaseButton?.addEventListener('click',onChase);

  return()=>{
   modelToken++;mixer?.stopAllAction();cancelAnimationFrame(frame);observer.disconnect();
   document.exitPointerLock?.();
   window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);
   window.removeEventListener('mousemove',mouse);
   renderer.domElement.removeEventListener('click',click);
   cockpitButton?.removeEventListener('click',onCockpit);chaseButton?.removeEventListener('click',onChase);
   renderer.dispose();geo.dispose();
   scene.traverse(o=>{
    if(o instanceof THREE.Mesh){
     o.geometry.dispose();
     const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m.dispose());
    }
   });
   if(host.contains(renderer.domElement))host.removeChild(renderer.domElement);
  };
 },[modelId,modelUrl]);
 return <div className="flight-scene" ref={mount}>
  <div className="flight-scene-hud">
   <span>PIN WORLD · FLIGHT SIMULATOR</span>
   <span>SPD {speed} KM/H · ALT {altitude.toLocaleString()} M</span>
   <small>CLICK VIEW · MOUSE LOOK · W/S PITCH · A/D YAW · Q/E BANK</small>
   <small>{modelState}</small>
  </div>
  <div className="flight-view-switch">
   <button data-view="cockpit">Pilot camera</button>
   <button data-view="chase">Aircraft follow</button>
  </div>
  <button className="flight-exit" onClick={onExit}>EXIT FLIGHT</button>
 </div>;
}
